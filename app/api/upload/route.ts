import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const allowed = new Set(["image/jpeg", "image/png", "image/webp", "audio/mpeg", "audio/wav", "audio/mp4", "audio/webm"]);
export async function POST(req: Request) {
  const form = await req.formData(); const files = form.getAll("files").filter((v): v is File => v instanceof File);
  if (!files.length || files.length > 25) return NextResponse.json({ error: "Choose between 1 and 25 files." }, { status: 400 });
  const dir = path.join(process.cwd(), "public", "uploads"); await fs.mkdir(dir, { recursive: true });
  const urls: string[] = [];
  for (const file of files) {
    if (!allowed.has(file.type) || file.size > 25_000_000) return NextResponse.json({ error: `${file.name} is not a supported file.` }, { status: 400 });
    const ext = path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, "") || ".bin";
    const name = `${crypto.randomUUID()}${ext}`; await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer())); urls.push(`/uploads/${name}`);
  }
  return NextResponse.json({ urls });
}
