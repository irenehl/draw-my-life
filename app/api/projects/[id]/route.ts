import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import type { Project } from "@/lib/types";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; const p = await storage.get(id); return p ? NextResponse.json(p) : NextResponse.json({ error: "Not found" }, { status: 404 }); }
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const old = await storage.get(id);
  if (!old) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json() as Partial<Project>;
  const next: Project = { ...old, ...body, id, version: old.version + 1 };
  await storage.save(next);
  return NextResponse.json(next);
}
