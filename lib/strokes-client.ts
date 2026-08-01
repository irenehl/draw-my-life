import type { StrokeSet } from "./stroke-trace";
import type { Project, Scene } from "./types";

const cache = new Map<string, StrokeSet>();

export async function fetchStrokeSet(strokesUrl?: string): Promise<StrokeSet | null> {
  if (!strokesUrl) return null;
  const cached = cache.get(strokesUrl);
  if (cached) return cached;
  try {
    const res = await fetch(strokesUrl);
    if (!res.ok) return null;
    const data = (await res.json()) as StrokeSet;
    if (!data?.strokes?.length) return null;
    cache.set(strokesUrl, data);
    return data;
  } catch {
    return null;
  }
}

/** Hydrate scene stroke payloads from their strokesUrl for Remotion preview. */
export async function hydrateProjectStrokes(project: Project): Promise<Project> {
  const scenes: Scene[] = await Promise.all(
    project.scenes.map(async scene => {
      if (scene.strokes?.strokes?.length) return scene;
      if (!scene.strokesUrl) return scene;
      const strokes = await fetchStrokeSet(scene.strokesUrl);
      return strokes ? { ...scene, strokes } : scene;
    }),
  );
  return { ...project, scenes };
}
