import { describe, expect, it } from "vitest";
import { getRevealBands, getStrokeReveal } from "./reveal";
import type { StrokeSet } from "./stroke-trace";

const sampleStrokes: StrokeSet = {
  viewBox: [0, 0, 100, 100],
  width: 100,
  height: 100,
  totalLength: 200,
  strokes: [
    {
      d: "M10 10L90 10",
      length: 100,
      tips: [
        { t: 0, x: 10, y: 10 },
        { t: 1, x: 90, y: 10 },
      ],
    },
    {
      d: "M50 10L50 90",
      length: 100,
      tips: [
        { t: 0, x: 50, y: 10 },
        { t: 1, x: 50, y: 90 },
      ],
    },
  ],
};

describe("progressive sketch reveal", () => {
  it("starts with the extracted drawing fully hidden", () => {
    expect(getRevealBands(0).every(band => band.progress === 0)).toBe(true);
  });

  it("draws alternating horizontal passes instead of fading the full image", () => {
    const halfway = getRevealBands(50);
    expect(halfway[0].progress).toBe(100);
    expect(halfway[1].progress).toBe(100);
    expect(halfway[2].progress).toBeGreaterThan(0);
    expect(halfway[3].progress).toBe(0);
    expect(halfway[0].clipPath).not.toBe(halfway[1].clipPath);
  });

  it("finishes with every band visible", () => {
    expect(getRevealBands(100).every(band => band.progress === 100)).toBe(true);
  });
});

describe("stroke-by-stroke reveal", () => {
  it("keeps later strokes hidden while the first path is being drawn", () => {
    const reveal = getStrokeReveal(sampleStrokes, 25);
    expect(reveal.strokeIndex).toBe(0);
    expect(reveal.dashFor(0)).toBeCloseTo(50, 0);
    expect(reveal.dashFor(1)).toBe(100);
    expect(reveal.isDrawing).toBe(true);
    expect(reveal.tipPercent?.y).toBeCloseTo(10, 0);
  });

  it("moves the pen tip along the active stroke", () => {
    const mid = getStrokeReveal(sampleStrokes, 75);
    expect(mid.strokeIndex).toBe(1);
    expect(mid.tipPercent?.x).toBeCloseTo(50, 0);
    expect(mid.tipPercent?.y).toBeGreaterThan(10);
  });

  it("marks drawing complete near the end", () => {
    const done = getStrokeReveal(sampleStrokes, 100);
    expect(done.dashFor(0)).toBe(0);
    expect(done.dashFor(1)).toBe(0);
    expect(done.isDrawing).toBe(false);
  });
});
