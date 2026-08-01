export type RevealBand = { clipPath: string; progress: number };

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
