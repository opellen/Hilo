import { describe, it, expect } from 'vitest';
import { compensateForReadability, darkerUnderline, getColorMap } from './styleInjector';
import type { Settings } from './data';

describe('darkerUnderline', () => {
	it('emits hsl() string with saturation 100%', () => {
		expect(darkerUnderline('#fff3a3')).toMatch(/^hsl\(\d+ 100% \d+%\)$/);
	});
	it('default yellow #fff3a3 → hsl(52 100% 52%)', () => {
		expect(darkerUnderline('#fff3a3')).toBe('hsl(52 100% 52%)');
	});
	it('default red #ffb3b3 → hsl(0 100% 55%)', () => {
		expect(darkerUnderline('#ffb3b3')).toBe('hsl(0 100% 55%)');
	});
	it('default green #b3e6b3 → hsl(120 100% 50%)', () => {
		expect(darkerUnderline('#b3e6b3')).toBe('hsl(120 100% 50%)');
	});
	it('normalizes 3-digit hex (#fff → #ffffff); always emits saturation 100%', () => {
		// Achromatic input still emits 100% saturation — visual result is identical at l=70%.
		expect(darkerUnderline('#fff')).toBe('hsl(0 100% 70%)');
	});
	it('clamps lightness at 0 for black', () => {
		expect(darkerUnderline('#000')).toBe('hsl(0 100% 0%)');
	});
	it('uppercase hex normalizes correctly', () => {
		expect(darkerUnderline('#FFB3B3')).toBe('hsl(0 100% 55%)');
	});
	it('reduces lightness by 30 percentage points (approx)', () => {
		// #888 = lightness ~53% → ~23%
		const result = darkerUnderline('#888');
		const match = result.match(/hsl\(\d+ \d+% (\d+)%\)/);
		expect(match).not.toBeNull();
		const l = Number(match![1]);
		expect(l).toBeGreaterThanOrEqual(22);
		expect(l).toBeLessThanOrEqual(24);
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
