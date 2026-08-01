import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { createSketchAssets, loadStrokeSet } from "@/lib/line-art";
import { renderStrokeFrames } from "@/lib/render-strokes";
import { spawn } from "child_process";
import path from "path";
import os from "os";
import { promises as fs } from "fs";

function runFfmpeg(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const process = spawn("ffmpeg", args);
    let error = "";
    process.stderr.on("data", chunk => (error += chunk));
    process.on("error", reject);
    process.on("close", code => (code === 0 ? resolve() : reject(new Error(error.slice(-1400)))));
  });
}

export async function POST(req: Request) {
  const { projectId } = await req.json();
  const project = await storage.get(projectId);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const scenes = project.scenes.filter(scene => scene.enabled);
  if (!scenes.length) return NextResponse.json({ error: "Enable at least one scene before exporting." }, { status: 400 });
  const duration = scenes.reduce((total, scene) => total + scene.duration, 0);
  const outDir = path.join(process.cwd(), "public", "exports");
  await fs.mkdir(outDir, { recursive: true });
  const filename = `${project.id}-v${project.version}.mp4`;
  const output = path.join(outDir, filename);
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "draw-my-life-render-"));
  const pencilSound = path.join(process.cwd(), "public", "sounds", "pencil-scratch.wav");

  try {
    const segments: string[] = [];
    for (let index = 0; index < scenes.length; index++) {
      const scene = scenes[index];
      const segment = path.join(tempDir, `${String(index).padStart(3, "0")}.mp4`);
      segments.push(segment);

      let strokes = scene.strokes ?? (await loadStrokeSet(scene.strokesUrl));
      if (!strokes && scene.photoUrl) {
        const assets = await createSketchAssets(scene.photoUrl);
        strokes = assets?.strokes ?? null;
        if (assets) {
          scene.sketchUrl = assets.sketchUrl;
          scene.strokesUrl = assets.strokesUrl;
        }
      }

      const drawSec = Math.min(5.2, Math.max(1.6, scene.duration * 0.72));
      if (strokes?.strokes.length) {
        const framesDir = path.join(tempDir, `frames-${index}`);
        const sketchPath = scene.sketchUrl
          ? path.join(process.cwd(), "public", scene.sketchUrl.replace(/^\//, ""))
          : undefined;
        const { framePattern } = await renderStrokeFrames({
          strokeSet: strokes,
          outDir: framesDir,
          durationSec: scene.duration,
          fps: 30,
          sketchPath,
          accent: scene.accent,
          caption: scene.caption.text,
          title: scene.title,
          sceneLabel: `${String(index + 1).padStart(2, "0")} · ${scene.role}`,
        });

        const hasPencil = await fs.access(pencilSound).then(() => true).catch(() => false);
        if (hasPencil && scene.effects.marker) {
          await runFfmpeg([
            "-y",
            "-framerate", "30",
            "-i", framePattern,
            "-stream_loop", "-1",
            "-i", pencilSound,
            "-f", "lavfi",
            "-t", String(scene.duration),
            "-i", "anullsrc=r=44100:cl=mono",
            "-filter_complex",
            `[1:a]volume=2.4,afade=t=out:st=${Math.max(0.2, drawSec - 0.25)}:d=0.25,alimiter=limit=0.95[pencil];[2:a][pencil]amix=inputs=2:duration=first:dropout_transition=0[a]`,
            "-map", "0:v",
            "-map", "[a]",
            "-t", String(scene.duration),
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "20",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "128k",
            segment,
          ]);
        } else {
          await runFfmpeg([
            "-y",
            "-framerate", "30",
            "-i", framePattern,
            "-f", "lavfi",
            "-t", String(scene.duration),
            "-i", "anullsrc=r=48000:cl=stereo",
            "-map", "0:v",
            "-map", "1:a",
            "-t", String(scene.duration),
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "20",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-shortest",
            segment,
          ]);
        }
      } else if (scene.sketchUrl) {
        const sketchPath = path.join(process.cwd(), "public", scene.sketchUrl.replace(/^\//, ""));
        await runFfmpeg([
          "-y",
          "-f", "lavfi",
          "-i", `color=c=f9f8f2:s=1080x1920:d=${scene.duration}:r=30`,
          "-framerate", "30",
          "-loop", "1",
          "-t", String(scene.duration),
          "-i", sketchPath,
          "-stream_loop", "-1",
          "-i", pencilSound,
          "-filter_complex",
          `[0:v]settb=AVTB[base];[1:v]scale=1000:1500:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=f9f8f2,fps=30,settb=AVTB,format=yuv420p[ink];[base][ink]xfade=transition=wipeleft:duration=${drawSec}:offset=0,format=yuv420p[v];[2:a]volume=2.4,afade=t=out:st=${Math.max(0.2, drawSec - 0.2)}:d=0.2,alimiter=limit=0.95,apad=whole_dur=${scene.duration}[a]`,
          "-map", "[v]",
          "-map", "[a]",
          "-t", String(scene.duration),
          "-c:v", "libx264",
          "-preset", "veryfast",
          "-crf", "20",
          "-c:a", "aac",
          "-b:a", "128k",
          segment,
        ]);
      } else {
        await runFfmpeg([
          "-y",
          "-f", "lavfi",
          "-i", `color=c=f9f8f2:s=1080x1920:d=${scene.duration}:r=30`,
          "-f", "lavfi",
          "-t", String(scene.duration),
          "-i", "anullsrc=r=48000:cl=stereo",
          "-map", "0:v",
          "-map", "1:a",
          "-c:v", "libx264",
          "-preset", "veryfast",
          "-pix_fmt", "yuv420p",
          "-c:a", "aac",
          "-shortest",
          segment,
        ]);
      }
    }

    const concatFile = path.join(tempDir, "segments.txt");
    await fs.writeFile(concatFile, segments.map(file => `file '${file.replaceAll("'", "'\\''")}'`).join("\n"));
    const narrationPath = project.narrationUrl
      ? path.join(process.cwd(), "public", project.narrationUrl.replace(/^\//, ""))
      : undefined;

    if (narrationPath) {
      await runFfmpeg([
        "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", concatFile,
        "-i", narrationPath,
        "-filter_complex",
        `[0:a]volume=0.85[bed];[1:a]apad,volume=${project.narrationVolume / 100}[voice];[bed][voice]amix=inputs=2:duration=first:dropout_transition=0[a]`,
        "-map", "0:v",
        "-map", "[a]",
        "-t", String(duration),
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "192k",
        output,
      ]);
    } else {
      await runFfmpeg(["-y", "-f", "concat", "-safe", "0", "-i", concatFile, "-c", "copy", output]);
    }
  } catch (error) {
    project.status = "failed";
    await storage.save(project);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Render failed" }, { status: 500 });
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }

  project.status = "complete";
  project.exportUrl = `/exports/${filename}`;
  await storage.save(project);
  return NextResponse.json({ status: "complete", progress: 100, output: project.exportUrl });
}
