import type { Project, Scene, StoryRole } from "./types";

const roles: StoryRole[] = ["hook", "setup", "turn", "payoff", "close"];
const colors = ["#f25c3b", "#e8ad32", "#357b66", "#3566a8", "#d84d76"];

export function makeScenes(notes: string, photos: string[]): Scene[] {
  const clean = notes.trim() || "I thought I knew exactly where life was taking me. Then one small moment changed everything. It was messy, surprising, and completely mine. Looking back, that detour became the beginning I needed.";
  const sentences = clean.match(/[^.!?]+[.!?]?/g)?.map(s => s.trim()).filter(Boolean) || [clean];
  const count = Math.max(5, Math.min(8, Math.max(sentences.length, photos.length)));
  return Array.from({ length: count }, (_, i) => {
    const text = sentences[i % sentences.length];
    const duration = Math.max(7, Math.min(13, Math.ceil(text.split(/\s+/).length / 2.1) + 4));
    return { id: crypto.randomUUID(), title: i === 0 ? "The hook" : i === count - 1 ? "What stayed with me" : `Chapter ${i + 1}`, role: roles[Math.min(4, Math.floor(i * 5 / count))], photoUrl: photos[i % Math.max(1, photos.length)], duration, caption: { id: crypto.randomUUID(), text, start: 0.35, end: duration - .4, emphasis: text.split(/\s+/).find(w => w.length > 7) }, accent: colors[i % colors.length], enabled: true, effects: { marker: true, paper: i % 2 === 0, zoom: i % 3 !== 1 }, revision: 1, style: (["portrait", "timeline", "thought", "map"] as const)[i % 4], crop: i % 3, flip: i % 2 === 1 };
  });
}

export function demoProject(): Project {
  return { id: "demo", title: "The detour that changed everything", notes: "I thought I knew exactly where life was taking me. Then one small moment changed everything. It was messy, surprising, and completely mine. Looking back, that detour became the beginning I needed.", photos: [], scenes: makeScenes("I thought I knew exactly where life was taking me. Then one small moment changed everything. It was messy, surprising, and completely mine. Looking back, that detour became the beginning I needed.", []), music: "warm", musicVolume: 18, narrationVolume: 92, status: "draft", version: 1, createdAt: new Date().toISOString() };
}
