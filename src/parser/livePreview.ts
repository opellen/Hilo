import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { RangeSet, RangeSetBuilder, StateEffect, type Extension, type Text } from '@codemirror/state';
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

/** Expands each range to full line boundaries and merges overlapping/touching
 *  ones. `view.visibleRanges` is split at every state-field replace decoration
 *  of 20+ chars (e.g. image embeds, issue #10), so matching per raw range would
 *  cut a highlight straddling the widget. `HIGHLIGHT_RE` never crosses `\n`,
 *  so line-aligned ranges can't cut a match; merging avoids duplicate matches
 *  (and RangeSetBuilder ordering errors). Input must be sorted. */
export function lineAlignedRanges(
	doc: Text,
	ranges: readonly { from: number; to: number }[],
): { from: number; to: number }[] {
	const out: { from: number; to: number }[] = [];
	for (const r of ranges) {
		const from = doc.lineAt(r.from).from;
		const to = doc.lineAt(r.to).to;
		const last = out[out.length - 1];
		if (last && from <= last.to) {
			last.to = Math.max(last.to, to);
		} else {
			out.push({ from, to });
		}
	}
	return out;
}

interface HighlightDecorations {
	/** Color marks — fed to `EditorView.outerDecorations` so each highlight
	 *  renders as one element wrapping Obsidian's syntax spans instead of being
	 *  split at every inner formatting boundary (#9). */
	marks: DecorationSet;
	/** `{color}` token hides — regular decorations. */
	hides: DecorationSet;
}

function buildDecorations(
	view: EditorView,
	colorMap: Map<string, HighlightColorVars>,
	revealTokens: boolean,
): HighlightDecorations {
	const marks = new RangeSetBuilder<Decoration>();
	const hides = new RangeSetBuilder<Decoration>();

	for (const { from, to } of lineAlignedRanges(view.state.doc, view.visibleRanges)) {
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
			marks.add(matchStart, matchEnd, Decoration.mark(markSpec));
			// Reveal the `{color}` token when the cursor touches it so the user can
			// edit — or always, when the source-mode reveal option applies (#5).
			const overlapsCursor = view.state.selection.ranges.some(
				r => r.to >= tokenStart && r.from <= tokenEnd,
			);
			if (!overlapsCursor && !revealTokens) {
				hides.add(tokenStart, tokenEnd, Decoration.replace({}));
			}
		}
	}

	return { marks: marks.finish(), hides: hides.finish() };
}

export function createHighlightLivePreviewExtension(
	getColors: () => Map<string, HighlightColorVars>,
	getShowTokenInSource: () => boolean = () => false,
): Extension {
	const reveal = (view: EditorView) => getShowTokenInSource() && isSourceModeEditor(view);
	const outer = (EditorView as Partial<typeof EditorView>).outerDecorations;
	return ViewPlugin.fromClass(
		class {
			deco: HighlightDecorations;
			constructor(view: EditorView) {
				this.deco = buildDecorations(view, getColors(), reveal(view));
			}
			update(u: ViewUpdate) {
				const settingsRefresh = u.transactions.some((tr) =>
					tr.effects.some((e) => e.is(refreshDecorationsEffect)),
				);
				if (u.docChanged || u.viewportChanged || u.selectionSet || settingsRefresh) {
					this.deco = buildDecorations(u.view, getColors(), reveal(u.view));
				}
			}
		},
		{
			// `outerDecorations` arrived in @codemirror/view 6.23; older Obsidian
			// builds fall back to regular decorations (marks fragment again, but
			// the plugin still loads).
			decorations: v => outer ? v.deco.hides : RangeSet.join([v.deco.marks, v.deco.hides]),
			provide: outer
				? plugin => outer.of(view => view.plugin(plugin)?.deco.marks ?? Decoration.none)
				: undefined,
		},
	);
}
