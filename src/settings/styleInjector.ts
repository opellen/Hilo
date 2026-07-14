import {
	builtinCssVar,
	builtinUnderlineCss,
	isBuiltinColorSlug,
	type HighlightStyle,
	type Settings,
} from './data';

const STYLE_BODY_PREFIX = 'od-style-';

export interface HighlightColorVars {
	bg: string;
	underline: string;
}

function varsForColor(slug: string, hex: string, paletteId: string): HighlightColorVars {
	// Locked builtin rows use live Obsidian theme tokens (same as fast-text-color).
	if (paletteId === 'builtin' && isBuiltinColorSlug(slug)) {
		return { bg: builtinCssVar(slug), underline: builtinUnderlineCss(slug) };
	}
	return { bg: hex, underline: darkerUnderline(hex) };
}

/** Build slug → { bg, underline } map from settings. Decorations/post-processor code
 *  consumes this and writes the values as inline CSS custom properties on each
 *  highlight element. Replaces the old dynamic <style> rule injection.
 *
 *  Colors from every palette are included so highlights written under another
 *  palette keep rendering after a switch. On slug conflicts the active palette wins. */
export function getColorMap(settings: Settings): Map<string, HighlightColorVars> {
	const map = new Map<string, HighlightColorVars>();
	const ordered = [
		...settings.palettes.filter((p) => p.id !== settings.activePalette),
		...settings.palettes.filter((p) => p.id === settings.activePalette),
	];
	for (const palette of ordered) {
		for (const c of palette.colors) {
			map.set(c.slug, varsForColor(c.slug, c.hex, palette.id));
		}
	}
	return map;
}

export function applyHighlightStyle(style: HighlightStyle): void {
	removeHighlightStyle();
	if (style === 'default') return;
	activeDocument.body.classList.add(`${STYLE_BODY_PREFIX}${style}`);
}

export function removeHighlightStyle(): void {
	const body = activeDocument.body;
	for (const cls of Array.from(body.classList)) {
		if (cls.startsWith(STYLE_BODY_PREFIX)) body.classList.remove(cls);
	}
}

// Lightness drop 30% + saturation 100% — matches iA Writer bg/underline pair (#FAECA0 → #FFD900).
export function darkerUnderline(hex: string): string {
	const norm = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
	const r = parseInt(norm.slice(1, 3), 16) / 255;
	const g = parseInt(norm.slice(3, 5), 16) / 255;
	const b = parseInt(norm.slice(5, 7), 16) / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const l = (max + min) / 2;
	let h = 0;
	if (max !== min) {
		const d = max - min;
		if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
		else if (max === g) h = ((b - r) / d + 2) / 6;
		else h = ((r - g) / d + 4) / 6;
	}
	const newL = Math.max(0, l - 0.3);
	return `hsl(${Math.round(h * 360)} 100% ${Math.round(newL * 100)}%)`;
}
