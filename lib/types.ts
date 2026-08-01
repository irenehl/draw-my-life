import type { StrokeSet } from "./stroke-trace";

export type StoryRole = "hook" | "setup" | "turn" | "payoff" | "close";
export type Caption = { id: string; text: string; start: number; end: number; emphasis?: string };
export type SceneStyle = "portrait" | "timeline" | "thought" | "map";
export type Scene = {
  id: string;
  title: string;
  role: StoryRole;
  photoUrl?: string;
  sketchUrl?: string;
  /** JSON stroke paths extracted from the user's photo for stroke-by-stroke drawing */
  strokesUrl?: string;
  /** Optional in-memory strokes for preview when already loaded */
  strokes?: StrokeSet;
  duration: number;
  caption: Caption;
  accent: string;
  enabled: boolean;
  effects: { marker: boolean; paper: boolean; zoom: boolean };
  revision: number;
  style?: SceneStyle;
  crop?: number;
  flip?: boolean;
};
export type Project = {
  id: string;
  title: string;
  notes: string;
  narrationUrl?: string;
  photos: string[];
  scenes: Scene[];
  music: "warm" | "hopeful" | "none";
  musicVolume: number;
  narrationVolume: number;
  status: "empty" | "draft" | "rendering" | "complete" | "failed";
  version: number;
  exportUrl?: string;
  createdAt: string;
};
