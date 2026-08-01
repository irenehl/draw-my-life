import { NextResponse } from "next/server";
import { generateSchema } from "@/lib/schema";
import { makeScenes } from "@/lib/demo";
import { storage } from "@/lib/storage";
import type { Project } from "@/lib/types";
import { createSketchAssetSet } from "@/lib/line-art";

export async function POST(req: Request) {
  const parsed = generateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid project" }, { status: 400 });
  const id = crypto.randomUUID();
  const p = parsed.data;
  const assets = await createSketchAssetSet(p.photos);
  const scenes = makeScenes(p.notes, p.photos).map(scene => {
    const photoIndex = p.photos.indexOf(scene.photoUrl || "");
    const asset = photoIndex >= 0 ? assets[photoIndex] : undefined;
    return {
      ...scene,
      sketchUrl: asset?.sketchUrl,
      strokesUrl: asset?.strokesUrl,
      strokes: asset?.strokes,
    };
  });
  const project: Project = {
    id,
    title: p.title,
    notes: p.notes,
    photos: p.photos,
    narrationUrl: p.narrationUrl,
    scenes,
    format: p.format ?? "vertical",
    music: "warm",
    musicVolume: 18,
    narrationVolume: 92,
    status: "draft",
    version: 1,
    createdAt: new Date().toISOString(),
  };
  // Persist URLs only — stroke geometry stays in /uploads JSON files
  const persisted: Project = {
    ...project,
    scenes: project.scenes.map(({ strokes: _strokes, ...scene }) => scene),
  };
  await storage.save(persisted);
  return NextResponse.json(project);
}
