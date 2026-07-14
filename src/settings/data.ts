export interface HighlightColor {
	slug: string;
	/** Concrete hex for custom colors. Locked builtin rows ignore this and use theme CSS vars. */
	hex: string;
	enabled: boolean;
}

export type HighlightStyle = 'default' | 'lowlight' | 'underlined';

export type PaletteId = 'default' | 'builtin';

export interface ColorPalette {
	id: PaletteId;
	colors: HighlightColor[];
}

export interface Settings {
	/** @deprecated migrated into palettes; kept for load-time detection only */
	colors?: HighlightColor[];
	palettes: ColorPalette[];
	activePalette: PaletteId;
	style: HighlightStyle;
}

/** Soft highlight-style seeds (pastel backgrounds). */
export const DEFAULT_PALETTE_COLORS: HighlightColor[] = [
	{ slug: 'yellow', hex: '#fff3a3', enabled: true },
	{ slug: 'red', hex: '#ffb3b3', enabled: true },
	{ slug: 'green', hex: '#b3e6b3', enabled: true },
];

/**
 * Canonical Obsidian extended color slugs → `--color-{slug}` / `--color-{slug}-rgb`.
 * @see https://docs.obsidian.md/Reference/CSS+variables/Foundations/Colors
 */
export const BUILTIN_COLOR_SLUGS = [
	'red',
	'orange',
	'yellow',
	'green',
	'cyan',
	'blue',
	'purple',
	'pink',
] as const;

export type BuiltinColorSlug = (typeof BUILTIN_COLOR_SLUGS)[number];

export function isBuiltinColorSlug(slug: string): slug is BuiltinColorSlug {
	return (BUILTIN_COLOR_SLUGS as readonly string[]).includes(slug);
}

/** True when this row is a fixed Obsidian theme color in the builtin palette. */
export function isLockedBuiltinColor(paletteId: PaletteId, slug: string): boolean {
	return paletteId === 'builtin' && isBuiltinColorSlug(slug);
}

/** Live theme token, same approach as fast-text-color. */
export function builtinCssVar(slug: BuiltinColorSlug): string {
	return `var(--color-${slug})`;
}

/** Underline token for lowlight style (darkens the theme color in CSS). */
export function builtinUnderlineCss(slug: BuiltinColorSlug): string {
	return `color-mix(in srgb, var(--color-${slug}), black 30%)`;
}

/**
 * Read the current computed theme color as #rrggbb for settings UI (disabled picker).
 * Falls back to a neutral gray when not in a browser / var missing.
 */
export function resolveBuiltinDisplayHex(slug: BuiltinColorSlug): string {
	if (typeof document === 'undefined') return '#888888';
	const raw = getComputedStyle(document.body).getPropertyValue(`--color-${slug}`).trim();
	return cssColorToHex(raw) ?? '#888888';
}

/** Parse #rgb/#rrggbb or rgb(a) into #rrggbb. */
export function cssColorToHex(value: string): string | null {
	if (!value) return null;
	if (/^#[0-9a-fA-F]{6}$/.test(value)) return value.toLowerCase();
	if (/^#[0-9a-fA-F]{3}$/.test(value)) {
		const r = value[1];
		const g = value[2];
		const b = value[3];
		return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
	}
	const m = value.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
	if (m) {
		const to = (n: string) => Number(n).toString(16).padStart(2, '0');
		return `#${to(m[1])}${to(m[2])}${to(m[3])}`;
	}
	return null;
}

/**
 * Seed list for the builtin palette. Locked rows use theme CSS vars at paint time;
 * stored hex is unused for those slugs.
 */
export const BUILTIN_PALETTE_COLORS: HighlightColor[] = BUILTIN_COLOR_SLUGS.map((slug) => ({
	slug,
	hex: '',
	enabled: true,
}));

/** Re-add any missing canonical builtin colors (does not remove custom rows). */
export function restoreBuiltinColors(colors: HighlightColor[]): void {
	const present = new Set(colors.map((c) => c.slug));
	for (const slug of BUILTIN_COLOR_SLUGS) {
		if (present.has(slug)) continue;
		colors.push({ slug, hex: '', enabled: true });
	}
}

export const DEFAULT_SETTINGS: Settings = {
	palettes: [
		{ id: 'default', colors: DEFAULT_PALETTE_COLORS.map((c) => ({ ...c })) },
		{ id: 'builtin', colors: BUILTIN_PALETTE_COLORS.map((c) => ({ ...c })) },
	],
	activePalette: 'default',
	style: 'default',
};

export const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
export const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function getActivePalette(settings: Settings): ColorPalette {
	const found = settings.palettes.find((p) => p.id === settings.activePalette);
	return found ?? settings.palettes[0];
}

export function getActiveColors(settings: Settings): HighlightColor[] {
	return getActivePalette(settings).colors;
}

/** Normalize legacy `{ colors }` saves into the palettes shape. */
export function migrateSettings(raw: Partial<Settings> | null | undefined): Settings {
	const base: Settings = {
		palettes: DEFAULT_SETTINGS.palettes.map((p) => ({
			id: p.id,
			colors: p.colors.map((c) => ({ ...c })),
		})),
		activePalette: DEFAULT_SETTINGS.activePalette,
		style: DEFAULT_SETTINGS.style,
	};

	if (!raw) return base;

	if (raw.style === 'default' || raw.style === 'lowlight' || raw.style === 'underlined') {
		base.style = raw.style;
	}

	if (Array.isArray(raw.palettes) && raw.palettes.length > 0) {
		base.palettes = raw.palettes.map((p) => ({
			id: p.id === 'builtin' ? 'builtin' : 'default',
			colors: Array.isArray(p.colors) ? p.colors.map((c) => ({ ...c })) : [],
		}));
		// Ensure both known palettes exist so the dropdown always has options.
		for (const id of ['default', 'builtin'] as const) {
			if (!base.palettes.some((p) => p.id === id)) {
				const seed = id === 'builtin' ? BUILTIN_PALETTE_COLORS : DEFAULT_PALETTE_COLORS;
				base.palettes.push({ id, colors: seed.map((c) => ({ ...c })) });
			}
		}
	} else if (Array.isArray(raw.colors)) {
		// Pre-palette saves: treat the saved list as the default palette.
		const defaultIdx = base.palettes.findIndex((p) => p.id === 'default');
		base.palettes[defaultIdx] = {
			id: 'default',
			colors: raw.colors.map((c) => ({ ...c })),
		};
	}

	if (raw.activePalette === 'default' || raw.activePalette === 'builtin') {
		base.activePalette = raw.activePalette;
	}

	return base;
}
