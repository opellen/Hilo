import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder, StateEffect, type Extension } from '@codemirror/state';
import type { HighlightColorVars } from '../settings/styleInjector';

/** Fired by the plugin on settings save so the ViewPlugin below rebuilds its
 *  decorations even when the transaction changed neither doc, viewport, nor
 *  selection — otherwise `refreshEditors()`'s empty dispatch is a no-op and
 *  color edits don't paint until the next unrelated view update. */
export const refreshDecorationsEffect = StateEffect.define<void>();

const HIGHLIGHT_RE = /==\{([a-z0-9][a-z0-9-]*)\}([^=\n]+(?:=[^=\n]+)*?)==/g;

/**
 * StateEffect dispatched (via `refreshEditors`) to force the ViewPlugin to
 * rebuild its decorations even when no doc/viewport/selection changed — e.g.
 * after the color map was rebuilt because the dark-theme readability option
 * or the active theme changed.
 */
export const refreshHighlightsEffect = StateEffect.define<void>();

function buildDecorations(
	view: EditorView,
	colorMap: Map<string, HighlightColorVars>,
): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>();

	for (const { from, to } of view.visibleRanges) {
		const text = view.state.doc.sliceString(from, to);
		HIGHLIGHT_RE.lastIndex = 0;
		let match: RegExpExecArray | null;
		while ((match = HIGHLIGHT_RE.exec(text)) !== null) {
			const color = match[1];
			const matchStart = from + match.index;
			const matchEnd = matchStart + match[0].length;
			const tokenStart = matchStart + 2;
			const tokenEnd = tokenStart + color.length + 2;

			const vars = colorMap.get(color);
			const markSpec: { class?: string; attributes?: { style: string } } = {};
			// Only stamp the hl-* class and CSS vars when the slug is known. Unknown
			// slugs get no class, so the neutralizer in styles.css doesn't match and
			// Obsidian's native ==text== yellow shows through — the highlight stays
			// visible as if no slug had been written.
			if (vars) {
				markSpec.class = 'hl-' + color;
				markSpec.attributes = {
					style: `--hl-bg: ${vars.bg}; --hl-underline: ${vars.underline};`,
				};
			}

			// Paint the entire match (including `==` markers) so the active line shows
			// the highlight color on the markers instead of Obsidian's default yellow.
			builder.add(matchStart, matchEnd, Decoration.mark(markSpec));
			// Reveal the `{color}` token when the cursor touches it so the user can edit.
			const overlapsCursor = view.state.selection.ranges.some(
				r => r.to >= tokenStart && r.from <= tokenEnd,
			);
			if (!overlapsCursor) {
				builder.add(tokenStart, tokenEnd, Decoration.replace({}));
			}
		}
	}

	return builder.finish();
}

export function createHighlightLivePreviewExtension(
	getColors: () => Map<string, HighlightColorVars>,
): Extension {
	return ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;
			constructor(view: EditorView) {
				this.decorations = buildDecorations(view, getColors());
			}
			update(u: ViewUpdate) {
				const settingsRefresh = u.transactions.some((tr) =>
					tr.effects.some((e) => e.is(refreshDecorationsEffect)),
				);
				if (u.docChanged || u.viewportChanged || u.selectionSet || settingsRefresh) {
					this.decorations = buildDecorations(u.view, getColors());
				}
			}
		},
		{ decorations: v => v.decorations },
	);
}

