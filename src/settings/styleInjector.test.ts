import { describe, it, expect } from 'vitest';
import { darkerUnderline, getColorMap } from './styleInjector';
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

describe('getColorMap', () => {
	it('maps each color slug to { bg, underline }', () => {
		const settings: Settings = {
			palettes: [
				{
					id: 'default',
					colors: [
						{ slug: 'yellow', hex: '#fff3a3', enabled: true },
						{ slug: 'red', hex: '#ffb3b3', enabled: true },
					],
				},
			],
			activePalette: 'default',
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
					id: 'default',
					colors: [{ slug: 'yellow', hex: '#fff3a3', enabled: false }],
				},
			],
			activePalette: 'default',
			style: 'default',
		};
		const map = getColorMap(settings);
		expect(map.has('yellow')).toBe(true);
	});
	it('empty colors → empty map', () => {
		const settings: Settings = {
			palettes: [{ id: 'default', colors: [] }],
			activePalette: 'default',
			style: 'default',
		};
		expect(getColorMap(settings).size).toBe(0);
	});
	it('includes colors from inactive palettes', () => {
		const settings: Settings = {
			palettes: [
				{ id: 'default', colors: [{ slug: 'yellow', hex: '#fff3a3', enabled: true }] },
				{ id: 'builtin', colors: [{ slug: 'cyan', hex: '', enabled: true }] },
			],
			activePalette: 'default',
			style: 'default',
		};
		const map = getColorMap(settings);
		expect(map.has('yellow')).toBe(true);
		expect(map.get('cyan')?.bg).toBe('var(--color-cyan)');
	});
	it('active palette wins on slug conflicts', () => {
		const settings: Settings = {
			palettes: [
				{ id: 'default', colors: [{ slug: 'red', hex: '#ffb3b3', enabled: true }] },
				{ id: 'builtin', colors: [{ slug: 'red', hex: '', enabled: true }] },
			],
			activePalette: 'default',
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
