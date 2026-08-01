import { describe, expect, it } from "vitest";
import {
  dashOffsetForStroke,
  strokeProgressAt,
  thinBinary,
  tipAt,
  traceStrokesFromRaw,
} from "./stroke-trace";

function drawLine(
  buf: Uint8Array,
  w: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= steps; i++) {
    const t = steps ? i / steps : 0;
    const x = Math.round(x0 + (x1 - x0) * t);
    const y = Math.round(y0 + (y1 - y0) * t);
    buf[y * w + x] = 0;
    if (x + 1 < w) buf[y * w + x + 1] = 0;
  }
}

describe("stroke tracing for draw-my-life", () => {
  it("thins a thick horizontal bar into a single-pixel skeleton", () => {
    const w = 20;
    const h = 12;
    const mask = new Uint8Array(w * h);
    for (let y = 4; y <= 7; y++) for (let x = 3; x <= 16; x++) mask[y * w + x] = 1;
    const thin = thinBinary(mask, w, h);
    const ink = [...thin].filter(Boolean).length;
    expect(ink).toBeGreaterThan(5);
    expect(ink).toBeLessThan(40);
  });

  it("extracts continuous stroke paths from a simple drawing", () => {
    const w = 64;
    const h = 64;
    const raw = Buffer.alloc(w * h, 255);
    drawLine(raw, w, 8, 10, 55, 10);
    drawLine(raw, w, 12, 12, 12, 50);
    drawLine(raw, w, 12, 50, 48, 50);
    const set = traceStrokesFromRaw(raw, w, h, { maxStrokes: 40, simplify: 1 });
    expect(set.strokes.length).toBeGreaterThan(0);
    expect(set.totalLength).toBeGreaterThan(40);
    expect(set.strokes.every(s => s.d.startsWith("M") && s.length > 0)).toBe(true);
  });

  it("reports progressive stroke tips instead of a full-image fade", () => {
    const w = 48;
    const h = 48;
    const raw = Buffer.alloc(w * h, 255);
    drawLine(raw, w, 4, 24, 44, 24);
    drawLine(raw, w, 24, 4, 24, 44);
    const set = traceStrokesFromRaw(raw, w, h);
    const early = strokeProgressAt(set, 0.15);
    const late = strokeProgressAt(set, 0.9);
    expect(early.strokeIndex).toBeLessThanOrEqual(late.strokeIndex);
    expect(early.tip).not.toBeNull();
    expect(late.drawnThrough).toBeGreaterThan(early.drawnThrough);
    expect(dashOffsetForStroke(0, 0, 0.25)).toBe(75);
    expect(dashOffsetForStroke(0, 1, 0.25)).toBe(0);
    expect(dashOffsetForStroke(2, 1, 0.25)).toBe(100);
    const tip = tipAt(set.strokes[0], 0.5);
    expect(Number.isFinite(tip.x)).toBe(true);
  });
});
