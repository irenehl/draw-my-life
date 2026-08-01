import { describe, expect, it } from "vitest";
import { getRevealBands } from "./reveal";

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
