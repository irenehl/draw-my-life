import { describe, expect, it } from "vitest";
import {
  buildStoryBeats,
  durationForBeat,
  parseStoryBeats,
  titleFromBeat,
  visibleCaptionWords,
} from "./story";
import { makeScenes } from "./demo";

describe("storytelling from creator text", () => {
  it("splits paragraph story beats without inventing copy", () => {
    const notes = `This was me 10 years ago.

Then I met someone who changed everything.

Now I finally feel at home.`;
    const beats = parseStoryBeats(notes);
    expect(beats).toHaveLength(3);
    expect(beats[0]).toContain("10 years ago");
    expect(beats[2]).toContain("at home");
  });

  it("supports --- separators and numbered beats", () => {
    expect(
      parseStoryBeats(`First beat here.\n---\nSecond beat here.\n---\nThird beat.`),
    ).toHaveLength(3);
    expect(
      parseStoryBeats(`1. Childhood in the city\n2. The move that scared me\n3. Finding my people`),
    ).toEqual(["Childhood in the city", "The move that scared me", "Finding my people"]);
  });

  it("pairs each drawing to the matching story beat in order", () => {
    const notes = `This was me 10 years ago.\n\nThen everything changed.\n\nNow I'm grateful.`;
    const photos = ["/a.png", "/b.png", "/c.png"];
    const beats = buildStoryBeats(notes, photos);
    expect(beats).toHaveLength(3);
    expect(beats.map(b => b.photoUrl)).toEqual(photos);
    expect(beats.every(b => notes.includes(b.text))).toBe(true);
  });

  it("sizes scene duration from the story text length", () => {
    expect(durationForBeat("Hi.")).toBeGreaterThanOrEqual(5);
    expect(durationForBeat("This was a much longer beat about the summer everything quietly rearranged itself around me.")).toBeGreaterThan(
      durationForBeat("Short beat."),
    );
  });

  it("derives titles from the beat text", () => {
    expect(titleFromBeat("This was me 10 years ago when nothing made sense.", 0, 3).toLowerCase()).toContain("10 years ago");
  });

  it("reveals caption words as the story progresses", () => {
    const text = "This was me ten years ago";
    expect(visibleCaptionWords(text, 0)).toBe("");
    expect(visibleCaptionWords(text, 0.5).split(/\s+/).length).toBeGreaterThan(1);
    expect(visibleCaptionWords(text, 1)).toBe(text);
  });

  it("makeScenes stays grounded in the provided story", () => {
    const notes = "Hook sentence. Setup sentence. The turn arrives. Payoff lands. What stayed.";
    const scenes = makeScenes(notes, ["/one.jpg", "/two.jpg"]);
    expect(scenes.length).toBeGreaterThanOrEqual(5);
    expect(scenes.every(s => notes.includes(s.caption.text))).toBe(true);
    expect(scenes[0].photoUrl).toBe("/one.jpg");
    expect(scenes[1].photoUrl).toBe("/two.jpg");
  });
});
