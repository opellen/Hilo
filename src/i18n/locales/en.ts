import type { Locale } from './types';

// English — default locale. All keys MUST be present here; ko.ts may fall back
// to this dictionary when a key is missing.
export const en: Locale = {
	settings: {
		palette: {
			heading: 'Color palette',
			desc: 'Switch which color palette is used for your highlights and for the context menus of this plugin. Existing highlights keep rendering even if their slug is not in the active palette.',
			options: {
				custom: 'Custom',
				builtin: 'Builtin (Theme)',
			},
		},
		colors: {
			heading: 'Highlight colors',
			desc: 'Manage colors in the active palette. Disabled colors are hidden from the right-click menu but still rendered in notes.',
			addButton: 'Add color',
			restoreBuiltin: 'Restore builtin colors',
			builtinNote: 'Note: The color values and names of the builtin colors are not editable. Edit functionality in this palette only works for colors added by the user.',
			row: {
				moveUp: 'Move up',
				moveDown: 'Move down',
				enabled: 'Enabled',
				slug: 'Slug',
				colorPicker: 'Color picker',
				hexValue: 'Hex value',
				hotkeyLabel: 'Hotkey: {hotkey}',
				hotkeyNone: 'No hotkey assigned',
				hotkeyConfigure: 'Configure hotkey',
				delete: 'Delete color',
			},
		},
		style: {
			heading: 'Highlight style',
			desc: 'Visual treatment applied to all highlights.',
			options: {
				default: 'Default (solid)',
				lowlight: 'Lowlight (iA Writer)',
				underlined: 'Underlined',
			},
		},
		readability: {
			heading: 'Auto improve readability',
			desc: 'Automatically compensates highlight color brightness to improve readability — darkens overly bright colors in dark themes and brightens overly dark colors in light themes.',
		},
	},
	menu: {
		highlight: 'Highlight',
		changeColor: 'Change color',
		unhighlight: 'Unhighlight',
	},
	commands: {
		openPalette: 'Open color palette',
		unhighlight: 'Unhighlight',
	},
	notice: {
		noSelectionOrHighlight: 'No selection or active highlight',
	},
	modal: {
		confirm: {
			defaultOk: 'OK',
			defaultCancel: 'Cancel',
		},
		backtick: {
			title: 'Inline code',
			message: 'The selection overlaps inline code (`). Remove the backticks and apply highlight?',
			confirm: 'Remove backticks & highlight',
			cancel: 'Cancel',
		},
	},
};
