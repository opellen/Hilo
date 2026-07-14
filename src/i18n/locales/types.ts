// ---------------------------------------------------------------------------
// Locale shape for the Hilo plugin. All locale dictionaries must conform.
// Nested objects mirror dot-notation keys used by `t()` (e.g.
// `settings.colors.heading`). Keep this in sync across en.ts / ko.ts.
// ---------------------------------------------------------------------------

export interface Locale {
	settings: {
		palette: {
			heading: string;
			desc: string;
			options: {
				default: string;
				builtin: string;
			};
		};
		colors: {
			heading: string;
			desc: string;
			addButton: string;
			restoreBuiltin: string;
			builtinNote: string;
			row: {
				moveUp: string;
				moveDown: string;
				enabled: string;
				slug: string;
				colorPicker: string;
				hexValue: string;
				hotkeyLabel: string;
				hotkeyNone: string;
				hotkeyConfigure: string;
				delete: string;
			};
		};
		style: {
			heading: string;
			desc: string;
			options: {
				default: string;
				lowlight: string;
				underlined: string;
			};
		};
	};
	menu: {
		highlight: string;
		changeColor: string;
		unhighlight: string;
	};
	commands: {
		openPalette: string;
		unhighlight: string;
	};
	notice: {
		noSelectionOrHighlight: string;
	};
	modal: {
		confirm: {
			defaultOk: string;
			defaultCancel: string;
		};
		backtick: {
			title: string;
			message: string;
			confirm: string;
			cancel: string;
		};
	};
}
