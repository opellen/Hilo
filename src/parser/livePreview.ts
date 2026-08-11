import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder, StateEffect, type Extension } from '@codemirror/state';
import type { HighlightColorVars } from '../settings/styleInjector';

/** Fired by the plugin on settings save so the ViewPlugin below rebuilds its
 *  decorations even when the transaction changed neither doc, viewport, nor
 *  selection — otherwise `refreshEditors()`'s empty dispatch is a no-op and
 *  color edits don't paint until the next unrelated view update. Also covers
 *  theme changes and autoReadability toggles (all funneled through
 *  `refreshEditors`). */
export const refreshDecorationsEffect = StateEffect.define<void>();

const HIGHLIGHT_RE = /==\{([a-z0-9][a-z0-9-]*)\}([^=\n]+(?:=[^=\n]+)*?)==/g;

/** True when this editor is a markdown view in Source mode (not Live Preview).
 *  Editors outside a markdown view (canvas cards, inline editors) return false
 *  so they keep the default token-hiding behavior. */
function isSourceModeEditor(view: EditorView): boolean {
	const container = view.dom.closest('.markdown-source-view');
	return container ? !container.classList.contains('is-live-preview') : false;
}

function buildDecorations(
	view: EditorView,
	colorMap: Map<string, HighlightColorVars>,
	revealTokens: boolean,
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
			// Reveal the `{color}` token when the cursor touches it so the user can
			// edit — or always, when the source-mode reveal option applies (#5).
			const overlapsCursor = view.state.selection.ranges.some(
				r => r.to >= tokenStart && r.from <= tokenEnd,
			);
			if (!overlapsCursor && !revealTokens) {
				builder.add(tokenStart, tokenEnd, Decoration.replace({}));
			}
		}
	}

	return builder.finish();
}

export function createHighlightLivePreviewExtension(
	getColors: () => Map<string, HighlightColorVars>,
	getShowTokenInSource: () => boolean = () => false,
): Extension {
	const reveal = (view: EditorView) => getShowTokenInSource() && isSourceModeEditor(view);
	return ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;
			constructor(view: EditorView) {
				this.decorations = buildDecorations(view, getColors(), reveal(view));
			}
			update(u: ViewUpdate) {
				const settingsRefresh = u.transactions.some((tr) =>
					tr.effects.some((e) => e.is(refreshDecorationsEffect)),
				);
				if (u.docChanged || u.viewportChanged || u.selectionSet || settingsRefresh) {
					this.decorations = buildDecorations(u.view, getColors(), reveal(u.view));
				}
			}
		},
		{ decorations: v => v.decorations },
	);
}

