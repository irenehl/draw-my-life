import type { Project } from "./types";
import { scenesFromStory } from "./story";

/** Build scenes from the creator's story text + drawings (text is the source of truth). */
export function makeScenes(notes: string, photos: string[]) {
  return scenesFromStory(notes, photos);
}

const DEMO_STORY = `This was me ten years ago — scared, stuck, and sure nothing would change.

Then one small moment turned everything around. It was messy and completely mine.

Looking back, that detour became the beginning I needed.`;

export function demoProject(): Project {
  return {
    id: "demo",
    title: "The detour that changed everything",
    notes: DEMO_STORY,
    photos: [],
    scenes: makeScenes(DEMO_STORY, []),
    music: "warm",
    musicVolume: 18,
    narrationVolume: 92,
    status: "draft",
    version: 1,
    createdAt: new Date().toISOString(),
  };
}
