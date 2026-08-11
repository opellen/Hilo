import { describe, it, expect } from 'vitest';
import {
	applyHighlightStyle,
	compensateForReadability,
	getColorMap,
	removeHighlightStyle,
	themedUnderline,
} from './styleInjector';
import type { Settings } from './data';

/** Minimal Document stand-in: a body with a real-enough classList. */
function fakeDoc(initial: string[] = []): { doc: Document; classes: () => string[] } {
	const set = new Set(initial);
	const classList = {
		add: (c: string) => void set.add(c),
		remove: (c: string) => void set.delete(c),
		[Symbol.iterator]: () => set[Symbol.iterator](),
	};
	return {
		doc: { body: { classList } } as unknown as Document,
		classes: () => [...set],
	};
}

describe('themedUnderline', () => {
	describe('light theme (darkened)', () => {
		it('emits hsl() string for chromatic input', () => {
			expect(themedUnderline('#fff3a3', 'light')).toMatch(/^hsl\(\d+ 100% \d+%\)$/);
		});
		it('default yellow #fff3a3 → hsl(52 100% 52%)', () => {
			expect(themedUnderline('#fff3a3', 'light')).toBe('hsl(52 100% 52%)');
		});
		it('default red #ffb3b3 → hsl(0 100% 55%)', () => {
			expect(themedUnderline('#ffb3b3', 'light')).toBe('hsl(0 100% 55%)');
		});
		it('default green #b3e6b3 → hsl(120 100% 50%)', () => {
			expect(themedUnderline('#b3e6b3', 'light')).toBe('hsl(120 100% 50%)');
		});
		it('achromatic input uses 0% saturation, not red', () => {
			expect(themedUnderline('#fff', 'light')).toBe('hsl(0 0% 70%)');
		});
		it('clamps lightness at 0 for black', () => {
			expect(themedUnderline('#000', 'light')).toBe('hsl(0 0% 0%)');
		});
		it('uppercase hex normalizes correctly', () => {
			expect(themedUnderline('#FFB3B3', 'light')).toBe('hsl(0 100% 55%)');
		});
		it('grey input produces grey underline, not red', () => {
			const result = themedUnderline('#888', 'light');
			expect(result).toBe('hsl(0 0% 23%)');
		});
	});
	describe('dark theme (brightened)', () => {
		it('brightens yellow', () => {
			// #fff3a3 l~82% → 82+15 = 97% (capped at 100% test below)
			expect(themedUnderline('#fff3a3', 'dark')).toBe('hsl(52 100% 97%)');
		});
		it('brightens grey instead of darkening it', () => {
			// #888 l~53% → 53+15 = 68%
			expect(themedUnderline('#888', 'dark')).toBe('hsl(0 0% 68%)');
		});
		it('brightens black', () => {
			// #000 l~0% → 0+15 = 15%
			expect(themedUnderline('#000', 'dark')).toBe('hsl(0 0% 15%)');
		});
		it('caps lightness at 100% for white', () => {
			// #fff l=100% → 100+15 = 115% capped at 100%
			expect(themedUnderline('#fff', 'dark')).toBe('hsl(0 0% 100%)');
		});
	});
});

describe('compensateForReadability', () => {
	describe('dark theme', () => {
		it('leaves already-dark colors unchanged', () => {
			expect(compensateForReadability('#333333', 'dark')).toBe('#333333');
		});
		it('caps HSV Value for bright pastel yellow', () => {
			const result = compensateForReadability('#fff3a3', 'dark');
			expect(result).toMatch(/^#[0-9a-f]{6}$/);
			expect(result).not.toBe('#fff3a3');
		});
		it('preserves hue: red stays red', () => {
			const result = compensateForReadability('#ffb3b3', 'dark');
			const r = parseInt(result.slice(1, 3), 16);
			const g = parseInt(result.slice(3, 5), 16);
			const b = parseInt(result.slice(5, 7), 16);
			expect(r).toBeGreaterThan(g);
			expect(r).toBeGreaterThan(b);
		});
		it('normalizes 3-digit hex before capping', () => {
			expect(compensateForReadability('#fff', 'dark')).toMatch(/^#[0-9a-f]{6}$/);
			expect(compensateForReadability('#fff', 'dark')).not.toBe('#fff');
		});
		it('is idempotent on already-capped output', () => {
			const once = compensateForReadability('#fff3a3', 'dark');
			expect(compensateForReadability(once, 'dark')).toBe(once);
		});
	});
	describe('light theme', () => {
		it('leaves already-bright colors unchanged', () => {
			expect(compensateForReadability('#fff3a3', 'light')).toBe('#fff3a3');
		});
		it('floors HSV Value for too-dark colors', () => {
			const result = compensateForReadability('#333333', 'light');
			expect(result).toMatch(/^#[0-9a-f]{6}$/);
			expect(result).not.toBe('#333333');
		});
		it('preserves hue: dark red stays red', () => {
			const result = compensateForReadability('#660000', 'light');
			const r = parseInt(result.slice(1, 3), 16);
			const g = parseInt(result.slice(3, 5), 16);
			const b = parseInt(result.slice(5, 7), 16);
			expect(r).toBeGreaterThan(g);
			expect(r).toBeGreaterThan(b);
		});
		it('is idempotent on already-floored output', () => {
			const once = compensateForReadability('#333333', 'light');
			expect(compensateForReadability(once, 'light')).toBe(once);
		});
		it('black (#000) is brightened to a non-black color', () => {
			const result = compensateForReadability('#000000', 'light');
			expect(result).not.toBe('#000000');
			expect(result).not.toBe('#000');
		});
	});
});

describe('getColorMap', () => {
	it('maps each color slug to { bg, underline }', () => {
		const settings: Settings = {
			palettes: [
				{
					id: 'custom',
					colors: [
						{ slug: 'yellow', hex: '#fff3a3', enabled: true },
						{ slug: 'red', hex: '#ffb3b3', enabled: true },
					],
				},
			],
			activePalette: 'custom',
			style: 'default',
		};
		const map = getColorMap(settings);
		expect(map.size).toBe(2);
		expect(map.get('yellow')).toEqual({ bg: '#fff3a3', underline: 'hsl(52 100% 52%)' });
		expect(map.get('red')).toEqual({ bg: '#ffb3b3', underline: 'hsl(0 100% 55%)' });
	});
	it('includes disabled colors too (rendering decides via active class list)', () => {
		const settings: Settings = {
			palettes: [
				{
					id: 'custom',
					colors: [{ slug: 'yellow', hex: '#fff3a3', enabled: false }],
				},
			],
			activePalette: 'custom',
			style: 'default',
		};
		const map = getColorMap(settings);
		expect(map.has('yellow')).toBe(true);
	});
	it('empty colors → empty map', () => {
		const settings: Settings = {
			palettes: [{ id: 'custom', colors: [] }],
			activePalette: 'custom',
			style: 'default',
		};
		expect(getColorMap(settings).size).toBe(0);
	});
	it('includes colors from inactive palettes', () => {
		const settings: Settings = {
			palettes: [
				{ id: 'custom', colors: [{ slug: 'yellow', hex: '#fff3a3', enabled: true }] },
				{ id: 'builtin', colors: [{ slug: 'cyan', hex: '', enabled: true }] },
			],
			activePalette: 'custom',
			style: 'default',
		};
		const map = getColorMap(settings);
		expect(map.has('yellow')).toBe(true);
		expect(map.get('cyan')?.bg).toBe('var(--color-cyan)');
	});
	it('active palette wins on slug conflicts', () => {
		const settings: Settings = {
			palettes: [
				{ id: 'custom', colors: [{ slug: 'red', hex: '#ffb3b3', enabled: true }] },
				{ id: 'builtin', colors: [{ slug: 'red', hex: '', enabled: true }] },
			],
			activePalette: 'custom',
			style: 'default',
		};
		expect(getColorMap(settings).get('red')?.bg).toBe('#ffb3b3');
	});
	it('builtin locked colors use theme CSS variables', () => {
		const settings: Settings = {
			palettes: [
				{ id: 'builtin', colors: [{ slug: 'red', hex: '#000000', enabled: true }] },
			],
			activePalette: 'builtin',
			style: 'default',
		};
		const red = getColorMap(settings).get('red');
		expect(red?.bg).toBe('var(--color-red)');
		expect(red?.underline).toBe('color-mix(in srgb, var(--color-red), black 30%)');
	});
	it('custom colors in builtin palette keep their stored hex', () => {
		const settings: Settings = {
			palettes: [
				{ id: 'builtin', colors: [{ slug: 'custom', hex: '#abcdef', enabled: true }] },
			],
			activePalette: 'builtin',
			style: 'default',
		};
		expect(getColorMap(settings).get('custom')?.bg).toBe('#abcdef');
	});
});

// Regression guard for #8: since Obsidian 1.13 the Settings UI is a popout
// window, so style classes must go to every note-hosting document passed by
// the caller — never to just one "active" document.
describe('applyHighlightStyle', () => {
	it('adds the style class to every provided document', () => {
		const a = fakeDoc();
		const b = fakeDoc();
		applyHighlightStyle('underlined', [a.doc, b.doc]);
		expect(a.classes()).toContain('od-style-underlined');
		expect(b.classes()).toContain('od-style-underlined');
	});
	it('replaces a stale style class on every document', () => {
		const a = fakeDoc(['od-style-underlined']);
		const b = fakeDoc(['od-style-underlined', 'theme-dark']);
		applyHighlightStyle('lowlight', [a.doc, b.doc]);
		expect(a.classes()).toEqual(['od-style-lowlight']);
		expect(b.classes()).toEqual(['theme-dark', 'od-style-lowlight']);
	});
	it('default style removes without adding', () => {
		const a = fakeDoc(['od-style-lowlight', 'obsidian-app']);
		applyHighlightStyle('default', [a.doc]);
		expect(a.classes()).toEqual(['obsidian-app']);
	});
});

describe('removeHighlightStyle', () => {
	it('strips od-style-* classes from every document, keeping others', () => {
		const a = fakeDoc(['od-style-underlined', 'theme-dark']);
		const b = fakeDoc(['od-style-lowlight']);
		removeHighlightStyle([a.doc, b.doc]);
		expect(a.classes()).toEqual(['theme-dark']);
		expect(b.classes()).toEqual([]);
	});
});
