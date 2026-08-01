import { describe, expect, it } from "vitest";
import { makeScenes } from "./demo";

describe("grounded draft generator", () => {
  it("builds one scene per story sentence from the creator's text", () => {
    const notes = "This is the hook. This is the setup. Then everything changed. I found my way. That is what stayed.";
    const scenes = makeScenes(notes, ["/one.jpg", "/two.jpg"]);
    expect(scenes).toHaveLength(5);
    expect(scenes.map(s => s.role)).toEqual(["hook", "setup", "turn", "payoff", "close"]);
    expect(scenes.every(s => notes.includes(s.caption.text))).toBe(true);
    expect(scenes.reduce((sum, s) => sum + s.duration, 0)).toBeGreaterThanOrEqual(25);
  });

  it("pairs photos to story beats in order instead of inventing chapters", () => {
    const notes = Array.from({ length: 4 }, (_, i) => `Memory number ${i} happened.`).join(" ");
    const scenes = makeScenes(notes, ["/one.jpg", "/two.jpg"]);
    expect(scenes).toHaveLength(4);
    expect(scenes[0].photoUrl).toBe("/one.jpg");
    expect(scenes[1].photoUrl).toBe("/two.jpg");
    expect(scenes.every(s => notes.includes(s.caption.text))).toBe(true);
  });
});
