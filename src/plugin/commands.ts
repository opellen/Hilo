import { App, Editor, Menu, Notice } from 'obsidian';
import type NativeHighlightPlugin from './main';
import { changeColor, findHighlightAt, resolveColorCommandAction, unhighlight } from './actions';
import { requestWrapWithColor } from './wrapFlow';
import { capitalize, populateMenu } from './contextMenu';
import { t } from '../i18n';

interface CommandsAPI { removeCommand(id: string): void }
interface AppWithCommands extends App { commands: CommandsAPI }
interface EditorWithCM extends Editor { cm?: { coordsAtPos?(offset: number): { left: number; bottom: number } | null } }

export function registerColorCommands(plugin: NativeHighlightPlugin): void {
	// Clean up commands registered on a previous call (settings change).
	for (const id of plugin.registeredColorCommandIds) {
		try {
			// internal API: app.commands.removeCommand
			(plugin.app as AppWithCommands).commands.removeCommand(`${plugin.manifest.id}:${id}`);
		} catch {
			/* best effort */
		}
	}
	plugin.registeredColorCommandIds = [];

	for (const color of plugin.settings.colors.filter((c) => c.enabled)) {
		const id = `wrap-${color.slug}`;
		plugin.addCommand({
			id,
			name: capitalize(color.slug),
			editorCheckCallback: (checking, editor) => {
				const action = resolveColorCommandAction(editor);
				if (action.kind === 'none') return false;
				if (checking) return true;
				if (action.kind === 'wrap') requestWrapWithColor(plugin, editor, color.slug);
				else changeColor(editor, action.highlight, color.slug);
			},
		});
		plugin.registeredColorCommandIds.push(id);
	}
}

export function registerOpenPaletteCommand(plugin: NativeHighlightPlugin): void {
	plugin.addCommand({
		id: 'open-palette',
		name: t('commands.openPalette'),
		icon: 'highlighter',
		editorCallback: (editor) => {
			const menu = new Menu();
			const added = populateMenu(menu, plugin, editor);
			if (!added) {
				new Notice(t('notice.noSelectionOrHighlight'));
				return;
			}
			const cursor = editor.getCursor('head');
			// internal API: CM6 EditorView is not part of the public Editor surface.
			const cm = (editor as EditorWithCM).cm;
			const offset = editor.posToOffset(cursor);
			const coords = cm?.coordsAtPos?.(offset);
			if (coords) {
				menu.showAtPosition({ x: coords.left, y: coords.bottom });
			} else {
				menu.showAtPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
			}
		},
	});
}

export function registerUnhighlightCommand(plugin: NativeHighlightPlugin): void {
	plugin.addCommand({
		id: 'unhighlight',
		name: t('commands.unhighlight'),
		icon: 'eraser',
		editorCheckCallback: (checking, editor) => {
			const cursor = editor.getCursor('head');
			const active = findHighlightAt(editor, cursor.line, cursor.ch);
			if (!active) return false;
			if (checking) return true;
			unhighlight(editor, active);
		},
	});
}
