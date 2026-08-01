import { App, PluginSettingTab, Setting, setIcon } from 'obsidian';
import type NativeHighlightPlugin from '../plugin/main';
import {
	HEX_RE,
	SLUG_RE,
	getActiveColors,
	isBuiltinColorSlug,
	isLockedBuiltinColor,
	resolveBuiltinDisplayHex,
	restoreBuiltinColors,
	type HighlightColor,
	type HighlightStyle,
	type PaletteId,
} from './data';
import { commandIdForColor, getHotkeyForCommand, openHotkeyAssignment } from '../plugin/hotkeys';
import { capitalize } from '../plugin/contextMenu';
import { compensateForReadability, darkerUnderline, getThemeMode } from './styleInjector';
import { t } from '../i18n';

const STYLES: HighlightStyle[] = ['default', 'lowlight', 'underlined'];

// TODO: PluginSettingTab.display() is deprecated since Obsidian 1.13.0 in favor
// of getSettingDefinitions(). Migrate when manifest.minAppVersion is raised to
// 1.13.0+ (currently 1.5.0). The this.display() calls below (used to re-render
// after edits) also fall away with the declarative API.
export class HighlightSettingTab extends PluginSettingTab {
	plugin: NativeHighlightPlugin;

	constructor(app: App, plugin: NativeHighlightPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName(t('settings.palette.heading'))
			.setDesc(t('settings.palette.desc'))
			.addDropdown((dd) => {
				dd.addOption('builtin', t('settings.palette.options.builtin'));
				dd.addOption('custom', t('settings.palette.options.custom'));
				dd.setValue(this.plugin.settings.activePalette);
				dd.onChange((value) => {
					void (async () => {
						this.plugin.settings.activePalette = value as PaletteId;
						await this.plugin.saveSettings();
						this.display();
					})();
				});
			});

		const colorActions = new Setting(containerEl)
			.setName(t('settings.colors.heading'))
			.setDesc(t('settings.colors.desc'));
		if (this.plugin.settings.activePalette === 'builtin') {
			colorActions.addButton((btn) =>
				btn.setButtonText(t('settings.colors.restoreBuiltin')).onClick(() => {
					void (async () => {
						const palette = this.plugin.settings.palettes.find((p) => p.id === 'builtin');
						if (!palette) return;
						restoreBuiltinColors(palette.colors);
						await this.plugin.saveSettings();
						this.display();
					})();
				}),
			);
		}
		colorActions.addButton((btn) =>
			btn.setButtonText(t('settings.colors.addButton')).onClick(() => {
				void (async () => {
					getActiveColors(this.plugin.settings).push({ slug: 'new', hex: '#cccccc', enabled: true });
					await this.plugin.saveSettings();
					this.display();
				})();
			}),
		);

		if (this.plugin.settings.activePalette === 'builtin') {
			containerEl.createEl('p', {
				cls: 'od-setting-note',
				text: t('settings.colors.builtinNote'),
			});
		}

		getActiveColors(this.plugin.settings).forEach((color, i) => this.renderRow(containerEl, color, i));

		const styleSetting = new Setting(containerEl)
			.setName(t('settings.style.heading'))
			.setDesc(t('settings.style.desc'))
			.setClass('od-style-setting')
			.addDropdown((dd) => {
				dd.addOption('default', t('settings.style.options.default'));
				dd.addOption('lowlight', t('settings.style.options.lowlight'));
				dd.addOption('underlined', t('settings.style.options.underlined'));
				dd.setValue(this.plugin.settings.style);
				dd.onChange((value) => {
					void (async () => {
						this.plugin.settings.style = value as HighlightStyle;
						await this.plugin.saveSettings();
					})();
				});
			});

		const previewEl = styleSetting.descEl.createDiv({ cls: 'od-style-preview-list' });
		const color = this.getFirstColor();
		const samples: { el: HTMLSpanElement; style: HighlightStyle }[] = [];
		const applyPreviewColors = () => {
			if (!color) return;
			const readabilityOn = this.plugin.settings.autoReadability !== false;
			const mode = getThemeMode();
			for (const { el, style } of samples) {
				const compensated = style === 'underlined' || !readabilityOn
					? color.hex
					: compensateForReadability(color.hex, mode);
				el.style.setProperty('--hl-bg', compensated);
				el.style.setProperty('--hl-underline', darkerUnderline(compensated));
			}
		};
		for (const style of STYLES) {
			const row = previewEl.createDiv({ cls: 'od-style-preview-row' });
			const demo = row.createSpan({ cls: 'od-style-demo' });
			if (style !== 'default') demo.addClass(`od-style-${style}`);
			const sample = demo.createSpan({
				cls: 'od-preview-sample',
				text: t(`settings.style.options.${style}`),
			});
			samples.push({ el: sample, style });
		}
		applyPreviewColors();

		new Setting(containerEl)
			.setName(t('settings.readability.heading'))
			.setDesc(t('settings.readability.desc'))
			.addToggle((toggle) => {
			toggle.setValue(this.plugin.settings.autoReadability !== false);
			toggle.onChange((value) => {
				void (async () => {
					this.plugin.settings.autoReadability = value;
					await this.plugin.saveSettings();
					applyPreviewColors();
				})();
				});
			});
	}

	private getFirstColor(): HighlightColor | undefined {
		const colors = getActiveColors(this.plugin.settings);
		const found = colors.find((c) => c.enabled) ?? colors[0];
		if (!found) return undefined;
		// Builtin locked rows store empty hex; resolve the live theme color for the preview swatch.
		if (isLockedBuiltinColor(this.plugin.settings.activePalette, found.slug) && isBuiltinColorSlug(found.slug)) {
			return { ...found, hex: resolveBuiltinDisplayHex(found.slug) };
		}
		return found;
	}

	private renderRow(containerEl: HTMLElement, color: HighlightColor, index: number): void {
		const colors = getActiveColors(this.plugin.settings);
		const row = containerEl.createDiv({ cls: 'od-color-row' });

		const upBtn = row.createEl('button', { cls: 'od-arrow', attr: { 'aria-label': t('settings.colors.row.moveUp') } });
		setIcon(upBtn, 'chevron-up');
		upBtn.disabled = index === 0;
		upBtn.addEventListener('click', () => {
			void (async () => {
				if (index === 0) return;
				[colors[index - 1], colors[index]] = [colors[index], colors[index - 1]];
				await this.plugin.saveSettings();
				this.display();
			})();
		});

		const downBtn = row.createEl('button', {
			cls: 'od-arrow',
			attr: { 'aria-label': t('settings.colors.row.moveDown') },
		});
		setIcon(downBtn, 'chevron-down');
		downBtn.disabled = index === colors.length - 1;
		downBtn.addEventListener('click', () => {
			void (async () => {
				if (index === colors.length - 1) return;
				[colors[index], colors[index + 1]] = [colors[index + 1], colors[index]];
				await this.plugin.saveSettings();
				this.display();
			})();
		});

		const enabledInput = row.createEl('input', {
			cls: 'od-enabled-toggle',
			attr: { type: 'checkbox', 'aria-label': t('settings.colors.row.enabled') },
		});
		enabledInput.checked = color.enabled;
		enabledInput.addEventListener('change', () => {
			void (async () => {
				colors[index].enabled = enabledInput.checked;
				await this.plugin.saveSettings();
			})();
		});

		const locked = isLockedBuiltinColor(this.plugin.settings.activePalette, color.slug);

		const slugInput = row.createEl('input', {
			cls: 'od-slug-input',
			attr: { type: 'text', value: color.slug, 'aria-label': t('settings.colors.row.slug') },
		});
		slugInput.value = color.slug;
		slugInput.disabled = locked;
		if (!locked) {
			slugInput.addEventListener('input', () => {
				void (async () => {
					const next = slugInput.value;
					const duplicate = colors.some((c, j) => j !== index && c.slug === next);
					if (!SLUG_RE.test(next) || duplicate) {
						slugInput.classList.add('is-invalid');
						return;
					}
					slugInput.classList.remove('is-invalid');
					colors[index].slug = next;
					await this.plugin.saveSettings();
				})();
			});
		}
		const displayHex =
			locked && isBuiltinColorSlug(color.slug) ? resolveBuiltinDisplayHex(color.slug) : color.hex;

		const picker = row.createEl('input', {
			cls: 'od-color-picker',
			attr: { type: 'color', 'aria-label': t('settings.colors.row.colorPicker') },
		});
		picker.value = normalizeHexForPicker(displayHex);
		picker.disabled = locked;

		const hexInput = row.createEl('input', {
			cls: 'od-hex-input',
			attr: { type: 'text', 'aria-label': t('settings.colors.row.hexValue') },
		});
		hexInput.value = displayHex;
		hexInput.disabled = locked;

		if (!locked) {
			picker.addEventListener('input', () => {
				void (async () => {
					const next = picker.value;
					hexInput.value = next;
					hexInput.classList.remove('is-invalid');
					colors[index].hex = next;
					await this.plugin.saveSettings();
				})();
			});

			hexInput.addEventListener('input', () => {
				void (async () => {
					const next = hexInput.value;
					if (!HEX_RE.test(next)) {
						hexInput.classList.add('is-invalid');
						return;
					}
					hexInput.classList.remove('is-invalid');
					picker.value = normalizeHexForPicker(next);
					colors[index].hex = next;
					await this.plugin.saveSettings();
				})();
			});
		}

		const hotkey = getHotkeyForCommand(this.plugin, commandIdForColor(color.slug));
		const hotkeyLabel = hotkey
			? t('settings.colors.row.hotkeyLabel', { hotkey })
			: t('settings.colors.row.hotkeyNone');
		const hotkeyChip = row.createSpan({
			cls: hotkey ? 'od-hotkey' : 'od-hotkey od-hotkey-empty',
			text: hotkey ?? '—',
			attr: { 'aria-label': hotkeyLabel },
		});
		hotkeyChip.title = hotkeyLabel;

		const hotkeyBtn = row.createEl('button', {
			cls: 'od-hotkey-button',
			attr: { 'aria-label': t('settings.colors.row.hotkeyConfigure') },
		});
		setIcon(hotkeyBtn, 'keyboard');
		hotkeyBtn.addEventListener('click', () => {
			openHotkeyAssignment(this.plugin, `${this.plugin.manifest.name}: ${capitalize(color.slug)}`);
		});

		const deleteBtn = row.createEl('button', {
			cls: 'od-delete',
			attr: { 'aria-label': t('settings.colors.row.delete') },
		});
		setIcon(deleteBtn, 'trash');
		deleteBtn.addEventListener('click', () => {
			void (async () => {
				colors.splice(index, 1);
				await this.plugin.saveSettings();
				this.display();
			})();
		});
	}
}

// <input type="color"> only accepts 7-char #rrggbb; expand #rgb shorthand.
function normalizeHexForPicker(hex: string): string {
	if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
		const r = hex[1];
		const g = hex[2];
		const b = hex[3];
		return `#${r}${r}${g}${g}${b}${b}`;
	}
	return hex;
}
