import { NextResponse } from "next/server";
import { generateSchema } from "@/lib/schema";
import { makeScenes } from "@/lib/demo";
import { storage } from "@/lib/storage";
import type { Project } from "@/lib/types";
import { createLineArtSet } from "@/lib/line-art";

export async function POST(req: Request) {
  const parsed = generateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid project" }, { status: 400 });
  const id = crypto.randomUUID(); const p = parsed.data;
  const sketches = await createLineArtSet(p.photos);
  const scenes = makeScenes(p.notes, p.photos).map(scene => ({ ...scene, sketchUrl: sketches[p.photos.indexOf(scene.photoUrl || "")] }));
  const project: Project = { id, title: p.title, notes: p.notes, photos: p.photos, narrationUrl: p.narrationUrl, scenes, music: "warm", musicVolume: 18, narrationVolume: 92, status: "draft", version: 1, createdAt: new Date().toISOString() };
  await storage.save(project); return NextResponse.json(project);
}
