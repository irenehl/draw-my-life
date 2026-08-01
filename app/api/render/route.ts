import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { createLineArt } from "@/lib/line-art";
import { spawn } from "child_process";
import path from "path";
import os from "os";
import { promises as fs } from "fs";

function runFfmpeg(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const process = spawn("ffmpeg", args); let error = "";
    process.stderr.on("data", chunk => error += chunk);
    process.on("error", reject);
    process.on("close", code => code === 0 ? resolve() : reject(new Error(error.slice(-1400))));
  });
}

export async function POST(req: Request) {
  const { projectId } = await req.json(); const project = await storage.get(projectId);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const scenes = project.scenes.filter(scene => scene.enabled);
  if (!scenes.length) return NextResponse.json({ error: "Enable at least one scene before exporting." }, { status: 400 });
  const duration = scenes.reduce((total, scene) => total + scene.duration, 0);
  const outDir = path.join(process.cwd(), "public", "exports"); await fs.mkdir(outDir, { recursive: true });
  const filename = `${project.id}-v${project.version}.mp4`; const output = path.join(outDir, filename);
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "draw-my-life-render-"));
  try {
    const segments: string[] = [];
    for (let index = 0; index < scenes.length; index++) {
      const scene = scenes[index]; const segment = path.join(tempDir, `${String(index).padStart(3, "0")}.mp4`); segments.push(segment);
      const sketchUrl = scene.sketchUrl || (scene.photoUrl ? await createLineArt(scene.photoUrl) : undefined);
      if (sketchUrl) {
        const sketchPath = path.join(process.cwd(), "public", sketchUrl.replace(/^\//, ""));
        const revealDuration = Math.min(3.4, Math.max(1.8, scene.duration * .42));
        await runFfmpeg(["-y", "-f", "lavfi", "-i", `color=c=f9f8f2:s=1080x1920:d=${scene.duration}:r=30`, "-framerate", "30", "-loop", "1", "-t", String(scene.duration), "-i", sketchPath, "-f", "lavfi", "-t", String(scene.duration), "-i", "anullsrc=r=48000:cl=stereo", "-filter_complex", `[0:v]settb=AVTB[base];[1:v]scale=980:1500:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=f9f8f2,fps=30,settb=AVTB,format=yuv420p[ink];[base][ink]xfade=transition=wipeleft:duration=${revealDuration}:offset=0,format=yuv420p[v]`, "-map", "[v]", "-map", "2:a", "-t", String(scene.duration), "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-c:a", "aac", "-b:a", "128k", segment]);
      } else {
        await runFfmpeg(["-y", "-f", "lavfi", "-i", `color=c=f9f8f2:s=1080x1920:d=${scene.duration}:r=30`, "-f", "lavfi", "-t", String(scene.duration), "-i", "anullsrc=r=48000:cl=stereo", "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", segment]);
      }
    }
    const concatFile = path.join(tempDir, "segments.txt");
    await fs.writeFile(concatFile, segments.map(file => `file '${file.replaceAll("'", "'\\''")}'`).join("\n"));
    const narrationPath = project.narrationUrl ? path.join(process.cwd(), "public", project.narrationUrl.replace(/^\//, "")) : undefined;
    if (narrationPath) {
      await runFfmpeg(["-y", "-f", "concat", "-safe", "0", "-i", concatFile, "-i", narrationPath, "-filter_complex", `[1:a]apad,volume=${project.narrationVolume / 100}[voice]`, "-map", "0:v", "-map", "[voice]", "-t", String(duration), "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", output]);
    } else {
      await runFfmpeg(["-y", "-f", "concat", "-safe", "0", "-i", concatFile, "-c", "copy", output]);
    }
  } catch (error) {
    project.status = "failed"; await storage.save(project);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Render failed" }, { status: 500 });
  } finally { await fs.rm(tempDir, { recursive: true, force: true }); }
  project.status = "complete"; project.exportUrl = `/exports/${filename}`; await storage.save(project);
  return NextResponse.json({ status: "complete", progress: 100, output: project.exportUrl });
}
