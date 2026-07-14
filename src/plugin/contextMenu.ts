import type { Editor, MarkdownFileInfo, MarkdownView, Menu, MenuItem } from 'obsidian';
import type NativeHighlightPlugin from './main';
import { getActiveColors, isBuiltinColorSlug, isLockedBuiltinColor, resolveBuiltinDisplayHex, type HighlightColor, type PaletteId } from '../settings/data';
import { changeColor, findHighlightAt, selectionContainsHighlight, unhighlight, unhighlightSelection } from './actions';
import { requestWrapWithColor } from './wrapFlow';
import { t } from '../i18n';

// setSubmenu() is shipped by Obsidian but absent from the public d.ts (verified in obsidian.d.ts).
type MenuItemWithSubmenu = MenuItem & { setSubmenu: () => Menu };

// dom / iconEl are present on MenuItem at runtime but not in the public d.ts.
type MenuItemDom = MenuItem & { dom: HTMLElement; iconEl: HTMLElement };

export function capitalize(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1);
}

function styleColorMenuItem(item: MenuItem, hex: string): void {
	const mi = item as MenuItemDom;
	mi.dom.style.color = hex;
	mi.iconEl.style.color = hex;
}

function addColorMenuItem(
	menu: Menu,
	color: HighlightColor,
	paletteId: PaletteId,
	onClick: () => void,
): void {
	menu.addItem((si) => {
		si.setTitle(capitalize(color.slug)).setIcon('highlighter').onClick(onClick);
		const displayHex = isLockedBuiltinColor(paletteId, color.slug) && isBuiltinColorSlug(color.slug)
			? resolveBuiltinDisplayHex(color.slug)
			: color.hex;
		styleColorMenuItem(si, displayHex);
	});
}

export function populateMenu(
	menu: Menu,
	plugin: NativeHighlightPlugin,
	editor: Editor,
): boolean {
	const cursor = editor.getCursor('head');
	const active = findHighlightAt(editor, cursor.line, cursor.ch);
	const hasSelection = editor.somethingSelected();
	const activeColors = getActiveColors(plugin.settings).filter((c) => c.enabled);
	const paletteId = plugin.settings.activePalette;

	if (active && !hasSelection) {
		menu.addItem((item) => {
			item.setTitle(t('menu.changeColor')).setIcon('palette');
			const sub = (item as MenuItemWithSubmenu).setSubmenu();
			for (const c of activeColors) {
				if (c.slug === active.color) continue;
				addColorMenuItem(sub, c, paletteId, () => changeColor(editor, active, c.slug));
			}
		});
		menu.addItem((item) =>
			item
				.setTitle(t('menu.unhighlight'))
				.setIcon('eraser')
				.onClick(() => unhighlight(editor, active)),
		);
		return true;
	}
	if (hasSelection) {
		menu.addItem((item) => {
			item.setTitle(t('menu.highlight')).setIcon('highlighter');
			const sub = (item as MenuItemWithSubmenu).setSubmenu();
			for (const c of activeColors) {
				addColorMenuItem(sub, c, paletteId, () => requestWrapWithColor(plugin, editor, c.slug));
			}
		});
		if (selectionContainsHighlight(editor)) {
			menu.addItem((item) =>
				item
					.setTitle(t('menu.unhighlight'))
					.setIcon('eraser')
					.onClick(() => unhighlightSelection(editor)),
			);
		}
		return true;
	}
	return false;
}

export function buildContextMenuHandler(plugin: NativeHighlightPlugin): (
	menu: Menu,
	editor: Editor,
	view: MarkdownView | MarkdownFileInfo,
) => void {
	return (menu, editor, _view) => {
		populateMenu(menu, plugin, editor);
	};
}
