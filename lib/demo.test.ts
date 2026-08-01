import { describe, expect, it } from "vitest";
import { makeScenes } from "./demo";

describe("grounded draft generator", () => {
  it("creates a complete five-beat story without inventing copy", () => {
    const notes = "This is the hook. This is the setup. Then everything changed. I found my way. That is what stayed.";
    const scenes = makeScenes(notes, ["/one.jpg", "/two.jpg"]);
    expect(scenes).toHaveLength(5);
    expect(scenes.map(s => s.role)).toEqual(["hook", "setup", "turn", "payoff", "close"]);
    expect(scenes.every(s => notes.includes(s.caption.text))).toBe(true);
    expect(scenes.reduce((sum, s) => sum + s.duration, 0)).toBeGreaterThanOrEqual(35);
  });
  it("caps a draft at eight scenes and rotates source photos", () => {
    const notes = Array.from({ length: 12 }, (_, i) => `Memory number ${i} happened.`).join(" ");
    const scenes = makeScenes(notes, ["/one.jpg", "/two.jpg"]);
    expect(scenes).toHaveLength(8);
    expect(scenes[2].photoUrl).toBe("/one.jpg");
  });
});
