import { describe, it, expect } from 'vitest';
import {
	SLUG_RE,
	HEX_RE,
	DEFAULT_SETTINGS,
	DEFAULT_PALETTE_COLORS,
	BUILTIN_PALETTE_COLORS,
	BUILTIN_COLOR_SLUGS,
	builtinCssVar,
	builtinUnderlineCss,
	cssColorToHex,
	getActiveColors,
	isLockedBuiltinColor,
	migrateSettings,
	restoreBuiltinColors,
} from './data';

describe('SLUG_RE', () => {
	it('accepts lowercase letter slug', () => {
		expect(SLUG_RE.test('yellow')).toBe(true);
	});
	it('accepts digit-start slug (1st, 2nd, 7th)', () => {
		expect(SLUG_RE.test('1st')).toBe(true);
		expect(SLUG_RE.test('2nd')).toBe(true);
		expect(SLUG_RE.test('7th')).toBe(true);
	});
	it('accepts hyphenated slug', () => {
		expect(SLUG_RE.test('soft-blue')).toBe(true);
	});
	it('rejects uppercase', () => {
		expect(SLUG_RE.test('Yellow')).toBe(false);
	});
	it('rejects empty', () => {
		expect(SLUG_RE.test('')).toBe(false);
	});
	it('rejects whitespace', () => {
		expect(SLUG_RE.test('yellow blue')).toBe(false);
	});
	it('rejects special characters', () => {
		expect(SLUG_RE.test('yellow!')).toBe(false);
		expect(SLUG_RE.test('yellow_blue')).toBe(false);
	});
});

describe('HEX_RE', () => {
	it('accepts 6-digit hex (lowercase)', () => {
		expect(HEX_RE.test('#fff3a3')).toBe(true);
	});
	it('accepts 6-digit hex (uppercase)', () => {
		expect(HEX_RE.test('#FFB3B3')).toBe(true);
	});
	it('accepts 3-digit hex', () => {
		expect(HEX_RE.test('#fff')).toBe(true);
		expect(HEX_RE.test('#000')).toBe(true);
	});
	it('rejects missing #', () => {
		expect(HEX_RE.test('fff3a3')).toBe(false);
	});
	it('rejects 4-digit (no shorthand alpha)', () => {
		expect(HEX_RE.test('#fffa')).toBe(false);
	});
	it('rejects invalid characters', () => {
		expect(HEX_RE.test('#zzz')).toBe(false);
	});
	it('rejects empty', () => {
		expect(HEX_RE.test('')).toBe(false);
		expect(HEX_RE.test('#')).toBe(false);
	});
});

describe('DEFAULT_SETTINGS', () => {
	it('has default + builtin palettes', () => {
		expect(DEFAULT_SETTINGS.palettes.map((p) => p.id)).toEqual(['default', 'builtin']);
	});
	it('starts on default palette', () => {
		expect(DEFAULT_SETTINGS.activePalette).toBe('default');
	});
	it('default palette has 3 colors', () => {
		expect(getActiveColors(DEFAULT_SETTINGS)).toHaveLength(3);
	});
	it('uses default style', () => {
		expect(DEFAULT_SETTINGS.style).toBe('default');
	});
	it('all default colors are enabled', () => {
		expect(DEFAULT_PALETTE_COLORS.every((c) => c.enabled)).toBe(true);
	});
	it('all default slugs pass SLUG_RE', () => {
		expect(DEFAULT_PALETTE_COLORS.every((c) => SLUG_RE.test(c.slug))).toBe(true);
		expect(BUILTIN_PALETTE_COLORS.every((c) => SLUG_RE.test(c.slug))).toBe(true);
	});
	it('default palette hex values pass HEX_RE; builtin locked rows store empty hex', () => {
		expect(DEFAULT_PALETTE_COLORS.every((c) => HEX_RE.test(c.hex))).toBe(true);
		expect(BUILTIN_PALETTE_COLORS.every((c) => c.hex === '')).toBe(true);
	});
	it('default palette contains yellow, red, green', () => {
		const slugs = DEFAULT_PALETTE_COLORS.map((c) => c.slug);
		expect(slugs).toEqual(['yellow', 'red', 'green']);
	});
	it('builtin palette has Obsidian extended colors', () => {
		const slugs = BUILTIN_PALETTE_COLORS.map((c) => c.slug);
		expect(slugs).toEqual(['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink']);
	});
});

describe('isLockedBuiltinColor', () => {
	it('locks only the eight Obsidian slugs in the builtin palette', () => {
		expect(isLockedBuiltinColor('builtin', 'red')).toBe(true);
		expect(isLockedBuiltinColor('builtin', 'custom')).toBe(false);
		expect(isLockedBuiltinColor('default', 'red')).toBe(false);
	});
});

describe('builtinCssVar', () => {
	it('maps slug to Obsidian theme token', () => {
		expect(builtinCssVar('orange')).toBe('var(--color-orange)');
		expect(builtinUnderlineCss('orange')).toBe('color-mix(in srgb, var(--color-orange), black 30%)');
	});
});

describe('cssColorToHex', () => {
	it('normalizes hex and rgb()', () => {
		expect(cssColorToHex('#E9973F')).toBe('#e9973f');
		expect(cssColorToHex('#abc')).toBe('#aabbcc');
		expect(cssColorToHex('rgb(233, 151, 63)')).toBe('#e9973f');
	});
	it('returns null for empty/unknown', () => {
		expect(cssColorToHex('')).toBeNull();
		expect(cssColorToHex('orange')).toBeNull();
	});
});

describe('restoreBuiltinColors', () => {
	it('re-adds missing canonical slugs without removing custom ones', () => {
		const colors = [
			{ slug: 'red', hex: '', enabled: false },
			{ slug: 'custom', hex: '#abcdef', enabled: true },
		];
		restoreBuiltinColors(colors);
		const slugs = colors.map((c) => c.slug);
		for (const slug of BUILTIN_COLOR_SLUGS) {
			expect(slugs).toContain(slug);
		}
		expect(slugs).toContain('custom');
		expect(colors.find((c) => c.slug === 'red')?.enabled).toBe(false);
	});
});

describe('migrateSettings', () => {
	it('returns defaults for empty input', () => {
		const s = migrateSettings(null);
		expect(s.activePalette).toBe('default');
		expect(s.palettes).toHaveLength(2);
		expect(getActiveColors(s).map((c) => c.slug)).toEqual(['yellow', 'red', 'green']);
	});
	it('migrates legacy flat colors into default palette', () => {
		const s = migrateSettings({
			colors: [{ slug: 'custom', hex: '#abcdef', enabled: true }],
			style: 'lowlight',
		});
		expect(s.style).toBe('lowlight');
		expect(s.activePalette).toBe('default');
		expect(getActiveColors(s)).toEqual([{ slug: 'custom', hex: '#abcdef', enabled: true }]);
		expect(s.palettes.find((p) => p.id === 'builtin')?.colors).toHaveLength(8);
	});
	it('preserves palettes shape when already migrated', () => {
		const s = migrateSettings({
			palettes: [
				{ id: 'default', colors: [{ slug: 'a', hex: '#111111', enabled: true }] },
				{ id: 'builtin', colors: [{ slug: 'b', hex: '#222222', enabled: false }] },
			],
			activePalette: 'builtin',
			style: 'default',
		});
		expect(s.activePalette).toBe('builtin');
		expect(getActiveColors(s)).toEqual([{ slug: 'b', hex: '#222222', enabled: false }]);
	});
	it('preserves underlined style from legacy saves', () => {
		const s = migrateSettings({ colors: [], style: 'underlined' });
		expect(s.style).toBe('underlined');
	});
});
