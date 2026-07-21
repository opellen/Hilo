import {
	builtinCssVar,
	builtinUnderlineCss,
	cssColorToHex,
	isBuiltinColorSlug,
	type HighlightStyle,
	type Settings,
} from './data';

const STYLE_BODY_PREFIX = 'od-style-';

/**
 * Target HSV Value for readability compensation. On dark themes colors brighter
 * than this are darkened down to it; on light themes colors darker than this
 * are brightened up to it. Hue and saturation are always preserved.
 */
const READABILITY_V_TARGET = 0.5;

export type ReadabilityMode = 'dark' | 'light';

export interface HighlightColorVars {
	bg: string;
	underline: string;
}

function varsForColor(slug: string, hex: string, paletteId: string, mode: ReadabilityMode | null): HighlightColorVars {
	// Locked builtin rows normally use live Obsidian theme tokens. Those tokens
	// are tuned for accent *text*, so as a highlight *fill* they can be too
	// bright (dark theme) or too dark (light theme) — resolve the token to a
	// concrete hex and run it through the same HSV compensation as custom
	// colors. When compensation is off we keep the raw CSS var so it tracks
	// the theme live.
	if (paletteId === 'builtin' && isBuiltinColorSlug(slug)) {
		if (!mode) {
			return { bg: builtinCssVar(slug), underline: builtinUnderlineCss(slug) };
		}
		const resolved = typeof document === 'undefined'
			? null
			: cssColorToHex(getComputedStyle(document.body).getPropertyValue(`--color-${slug}`).trim());
		if (resolved) {
			const bg = compensateForReadability(resolved, mode);
			return { bg, underline: darkerUnderline(bg) };
		}
		return { bg: builtinCssVar(slug), underline: builtinUnderlineCss(slug) };
	}
	const bg = mode ? compensateForReadability(hex, mode) : hex;
	return { bg, underline: darkerUnderline(bg) };
}

/** `'dark'` when a dark Obsidian theme is active, `'light'` otherwise. */
export function getThemeMode(): ReadabilityMode {
	return typeof document !== 'undefined' && document.body.classList.contains('theme-dark')
		? 'dark'
		: 'light';
}

/**
 * Compensate the HSV Value of a hex color toward `READABILITY_V_TARGET`:
 * dark mode caps too-bright colors, light mode floors too-dark colors. Hue and
 * saturation are preserved. The stored palette hex is never modified — this is
 * render-time only.
 */
export function compensateForReadability(hex: string, mode: ReadabilityMode): string {
	const norm = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
	const r = parseInt(norm.slice(1, 3), 16) / 255;
	const g = parseInt(norm.slice(3, 5), 16) / 255;
	const b = parseInt(norm.slice(5, 7), 16) / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const v = max;
	if ((mode === 'dark' && v <= READABILITY_V_TARGET) || (mode === 'light' && v >= READABILITY_V_TARGET)) {
		return hex;
	}
	const d = max - min;
	let h = 0;
	if (d !== 0) {
		if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
		else if (max === g) h = ((b - r) / d + 2) / 6;
		else h = ((r - g) / d + 4) / 6;
	}
	const s = v === 0 ? 0 : d / v;
	const newV = READABILITY_V_TARGET;
	const i = Math.floor(h * 6);
	const f = h * 6 - i;
	const p = newV * (1 - s);
	const q = newV * (1 - f * s);
	const t = newV * (1 - (1 - f) * s);
	let nr: number, ng: number, nb: number;
	switch (i % 6) {
		case 0: nr = newV; ng = t; nb = p; break;
		case 1: nr = q; ng = newV; nb = p; break;
		case 2: nr = p; ng = newV; nb = t; break;
		case 3: nr = p; ng = q; nb = newV; break;
		case 4: nr = t; ng = p; nb = newV; break;
		default: nr = newV; ng = p; nb = q; break;
	}
	const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
	return `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`;
}

/** Build slug → { bg, underline } map from settings. Decorations/post-processor code
 *  consumes this and writes the values as inline CSS custom properties on each
 *  highlight element. Replaces the old dynamic <style> rule injection.
 *
 *  Colors from every palette are included so highlights written under another
 *  palette keep rendering after a switch. On slug conflicts the active palette wins. */
export function getColorMap(settings: Settings): Map<string, HighlightColorVars> {
	const map = new Map<string, HighlightColorVars>();
	const mode = settings.autoReadability !== false ? getThemeMode() : null;
	const ordered = [
		...settings.palettes.filter((p) => p.id !== settings.activePalette),
		...settings.palettes.filter((p) => p.id === settings.activePalette),
	];
	for (const palette of ordered) {
		for (const c of palette.colors) {
			map.set(c.slug, varsForColor(c.slug, c.hex, palette.id, mode));
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
