import type { MarkdownPostProcessor } from 'obsidian';
import { parseColorPrefix } from './tokens';
import type { HighlightColorVars } from '../settings/styleInjector';

export function createColorMarkPostProcessor(
	getColors: () => Map<string, HighlightColorVars>,
): MarkdownPostProcessor {
	return (el, _ctx) => {
		const marks = el.querySelectorAll('mark');
		const colorMap = getColors();
		for (let i = 0; i < marks.length; i++) {
			const mark = marks[i];
			const first = mark.firstChild;
			if (!first || first.nodeType !== Node.TEXT_NODE) continue;
			const textNode = first as Text;
			const result = parseColorPrefix(textNode.data);
			if (!result) continue;
			const vars = colorMap.get(result.color);
			// Only stamp the hl-* class and CSS vars when the slug is known. Unknown
			// slugs get no class, so styles.css doesn't match and Obsidian's native
			// ==text== yellow shows through.
			if (vars) {
				mark.classList.add('hl-' + result.color);
				mark.style.setProperty('--hl-bg', vars.bg);
				mark.style.setProperty('--hl-underline', vars.underline);
			}
			// Trim only leading data; keep the node so sibling indices stay stable.
			textNode.data = result.rest;
		}
	};
}
