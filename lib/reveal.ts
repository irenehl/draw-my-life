import type { StrokeSet } from "./stroke-trace";
import { dashOffsetForStroke, strokeProgressAt } from "./stroke-trace";

export type RevealBand = { clipPath: string; progress: number };

/** @deprecated Band wipe kept only for legacy tests / fallbacks. Prefer strokeProgress. */
export function getRevealBands(progress: number): RevealBand[] {
  return [0, 1, 2, 3].map(band => {
    const bandProgress = Math.max(0, Math.min(100, (progress - band * 22) * 4.55));
    const top = band * 25;
    const bottom = 100 - (band + 1) * 25;
    const clipPath = band % 2 === 0
      ? `inset(${top}% ${100 - bandProgress}% ${bottom}% 0)`
      : `inset(${top}% 0 ${bottom}% ${100 - bandProgress}%)`;
    return { clipPath, progress: bandProgress };
  });
}

export type StrokeReveal = {
  progress01: number;
  strokeIndex: number;
  strokeLocal: number;
  tip: { x: number; y: number } | null;
  /** Normalized tip in 0–100 viewBox percent for hand placement */
  tipPercent: { x: number; y: number } | null;
  isDrawing: boolean;
  dashFor: (strokeIndex: number) => number;
};

/** Map a 0–100 scene draw progress into per-stroke dash offsets and pen tip. */
export function getStrokeReveal(strokeSet: StrokeSet | null | undefined, progress: number): StrokeReveal {
  const progress01 = Math.max(0, Math.min(1, progress / 100));
  if (!strokeSet?.strokes.length) {
    return {
      progress01,
      strokeIndex: 0,
      strokeLocal: progress01,
      tip: null,
      tipPercent: null,
      isDrawing: progress01 > 0.02 && progress01 < 0.98,
      dashFor: () => 100 - progress01 * 100,
    };
  }
  const { strokeIndex, strokeLocal, tip } = strokeProgressAt(strokeSet, progress01);
  return {
    progress01,
    strokeIndex,
    strokeLocal,
    tip,
    tipPercent: tip
      ? { x: (tip.x / strokeSet.width) * 100, y: (tip.y / strokeSet.height) * 100 }
      : null,
    isDrawing: progress01 > 0.01 && progress01 < 0.99,
    dashFor: (i: number) => dashOffsetForStroke(i, strokeIndex, strokeLocal),
  };
}
