import type { Scene, SceneStyle, StoryRole } from "./types";
import { MARKER } from "./marker-style";

export type StoryBeat = {
  index: number;
  text: string;
  title: string;
  role: StoryRole;
  photoUrl?: string;
  duration: number;
  accent: string;
  style: SceneStyle;
};

const ROLES: StoryRole[] = ["hook", "setup", "turn", "payoff", "close"];
const STYLES: SceneStyle[] = ["portrait", "timeline", "thought", "map"];
const ACCENTS = [MARKER.red, MARKER.orange, MARKER.blue, MARKER.green, MARKER.black];

/**
 * Split the creator's story text into narrative beats.
 * Supports:
 * - blank-line paragraphs
 * - "---" separators
 * - numbered lines ("1. …" / "1) …")
 * - fallback: sentences
 */
export function parseStoryBeats(notes: string): string[] {
  const clean = notes.replace(/\r\n/g, "\n").trim();
  if (!clean) return [];

  if (clean.includes("\n---")) {
    return clean
      .split(/\n\s*---\s*\n/)
      .map(s => s.replace(/^---\s*/, "").replace(/\s*---$/, "").trim())
      .filter(Boolean);
  }

  const lines = clean.split("\n").map(line => line.trim()).filter(Boolean);
  const looksNumbered = lines.filter(l => /^\d+[\).\:\-]\s+/.test(l)).length >= 2;
  if (looksNumbered) {
    return lines.map(line => line.replace(/^\d+[\).\:\-]\s+/, "").trim()).filter(Boolean);
  }

  const paragraphs = clean
    .split(/\n\s*\n/)
    .map(p => p.replace(/\n+/g, " ").trim())
    .filter(Boolean);
  if (paragraphs.length >= 2) return paragraphs;

  return clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map(s => s.trim()).filter(Boolean) || [clean];
}

/** Short whiteboard title from the beat text — never invents new story facts. */
export function titleFromBeat(text: string, index: number, total: number): string {
  if (index === 0) {
    const first = text.split(/[.!?]/)[0]?.trim() || text;
    return clipTitle(first, 36);
  }
  if (index === total - 1) {
    const last = text.split(/[.!?]/).filter(Boolean).pop()?.trim() || text;
    return clipTitle(last, 36);
  }
  const cue = text.match(
    /\b(\d+\s+years?\s+ago|when i was \d+|in \d{4}|that summer|one day|then|now|today|finally)[^.!?]*/i,
  );
  if (cue?.[0]) return clipTitle(cue[0].trim(), 36);
  return clipTitle(text.split(/[.!?]/)[0]?.trim() || `Beat ${index + 1}`, 36);
}

function clipTitle(value: string, max: number) {
  const t = value.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

/** Reading + drawing time for a beat. Longer text → longer scene. */
export function durationForBeat(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  const speak = words / 2.4;
  return Math.max(5, Math.min(16, Math.round(speak + 3.5)));
}

/**
 * Build story beats from the creator's text and drawings.
 * Each text beat drives one scene; drawings pair in order (1st drawing → 1st beat).
 * Extra drawings reuse the last beat's wording — never invent biography.
 */
export function buildStoryBeats(notes: string, photos: string[]): StoryBeat[] {
  let texts = parseStoryBeats(notes);
  if (!texts.length) {
    texts = [
      "This was me before everything changed.",
      "Then one moment turned the page.",
      "Looking back, that was the beginning.",
    ];
  }

  const count = Math.max(texts.length, photos.length);
  return Array.from({ length: count }, (_, i) => {
    const text = texts[i] || texts[texts.length - 1]!;
    const role =
      ROLES[Math.min(ROLES.length - 1, Math.floor((i * (ROLES.length - 1)) / Math.max(1, count - 1)))]!;
    return {
      index: i,
      text,
      title: titleFromBeat(text, i, count),
      role,
      photoUrl: photos[i] || photos[photos.length - 1],
      duration: durationForBeat(text),
      accent: ACCENTS[i % ACCENTS.length]!,
      style: STYLES[i % STYLES.length]!,
    };
  });
}

export function scenesFromStory(notes: string, photos: string[]): Scene[] {
  return buildStoryBeats(notes, photos).map((beat, i) => ({
    id: crypto.randomUUID(),
    title: beat.title,
    role: beat.role,
    photoUrl: beat.photoUrl,
    duration: beat.duration,
    caption: {
      id: crypto.randomUUID(),
      text: beat.text,
      start: 0.4,
      end: beat.duration - 0.35,
      emphasis: beat.text.split(/\s+/).find(w => w.length > 6),
    },
    accent: beat.accent,
    enabled: true,
    effects: {
      marker: true,
      paper: i % 2 === 0,
      zoom: i % 3 !== 1,
    },
    revision: 1,
    style: beat.style,
    crop: i % 3,
    flip: false,
  }));
}

/** How many caption words should be visible at scene-local progress 0–1. */
export function visibleCaptionWords(text: string, progress01: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  const t = Math.max(0, Math.min(1, (progress01 - 0.08) / 0.75));
  const count = Math.max(0, Math.min(words.length, Math.ceil(t * words.length)));
  return words.slice(0, count).join(" ");
}
