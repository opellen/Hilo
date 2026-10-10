import { describe, it, expect } from 'vitest';
import { Text } from '@codemirror/state';
import { lineAlignedRanges } from './livePreview';

// Line spans: "aaaa" 0-4, "bbbbbb" 5-11, "cc" 12-14, "dddd" 15-19
const doc = Text.of(['aaaa', 'bbbbbb', 'cc', 'dddd']);

describe('lineAlignedRanges', () => {
	it('returns [] for empty input', () => {
		expect(lineAlignedRanges(doc, [])).toEqual([]);
	});

	it('expands a range inside one line to that line', () => {
		expect(lineAlignedRanges(doc, [{ from: 6, to: 8 }])).toEqual([{ from: 5, to: 11 }]);
	});

	it('merges two ranges split within the same line (widget gap)', () => {
		expect(
			lineAlignedRanges(doc, [
				{ from: 5, to: 7 },
				{ from: 9, to: 11 },
			]),
		).toEqual([{ from: 5, to: 11 }]);
	});

	it('keeps ranges on different non-adjacent lines separate', () => {
		expect(
			lineAlignedRanges(doc, [
				{ from: 1, to: 2 },
				{ from: 16, to: 17 },
			]),
		).toEqual([
			{ from: 0, to: 4 },
			{ from: 15, to: 19 },
		]);
	});

	it('keeps ranges on adjacent lines separate (newline between them)', () => {
		expect(
			lineAlignedRanges(doc, [
				{ from: 1, to: 2 },
				{ from: 6, to: 7 },
			]),
		).toEqual([
			{ from: 0, to: 4 },
			{ from: 5, to: 11 },
		]);
	});

	it('merges ranges whose expansions touch', () => {
		expect(
			lineAlignedRanges(doc, [
				{ from: 0, to: 4 },
				{ from: 4, to: 4 },
			]),
		).toEqual([{ from: 0, to: 4 }]);
	});

	it('merges overlapping expansions', () => {
		expect(
			lineAlignedRanges(doc, [
				{ from: 2, to: 7 },
				{ from: 9, to: 13 },
			]),
		).toEqual([{ from: 0, to: 14 }]);
	});

	it('expands a range spanning multiple lines', () => {
		expect(lineAlignedRanges(doc, [{ from: 2, to: 13 }])).toEqual([{ from: 0, to: 14 }]);
	});

	it('handles first and last line boundaries', () => {
		expect(
			lineAlignedRanges(doc, [
				{ from: 0, to: 0 },
				{ from: 19, to: 19 },
			]),
		).toEqual([
			{ from: 0, to: 4 },
			{ from: 15, to: 19 },
		]);
	});

	it('keeps an image-embed split highlight whole (issue #10)', () => {
		const line = '=={yellow}abc ![](images/00012.jpeg) def==';
		const d = Text.of([line]);
		const imgFrom = line.indexOf('![](');
		const imgTo = line.indexOf(') def') + 1;
		const out = lineAlignedRanges(d, [
			{ from: 0, to: imgFrom },
			{ from: imgTo, to: line.length },
		]);
		expect(out).toHaveLength(1);
		expect(d.sliceString(out[0].from, out[0].to)).toMatch(/==\{yellow\}[^\n]*==/);
	});
});
