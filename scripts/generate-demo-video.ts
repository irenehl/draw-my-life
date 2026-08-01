import sharp from "sharp";
import path from "path";
import os from "os";
import fs from "fs/promises";
import { spawn } from "child_process";
import { createSketchAssets } from "../lib/line-art";
import { renderStrokeFrames } from "../lib/render-strokes";

function run(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const p = spawn("ffmpeg", args);
    let err = "";
    p.stderr.on("data", c => (err += c));
    p.on("close", code => (code === 0 ? resolve() : reject(new Error(err.slice(-1200)))));
  });
}

async function makeDrawing(name: string, svg: string) {
  const file = path.join(process.cwd(), "public/uploads", name);
  await sharp(Buffer.from(svg)).png().toFile(file);
  return `/uploads/${name}`;
}

async function main() {
  await fs.mkdir(path.join(process.cwd(), "public/uploads"), { recursive: true });
  await fs.mkdir(path.join(process.cwd(), "public/exports"), { recursive: true });
  await fs.mkdir("/opt/cursor/artifacts", { recursive: true });

  const scenes = [
    {
      photo: await makeDrawing(
        "demo-hook.png",
        `<svg width="520" height="640" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="white"/>
          <circle cx="260" cy="170" r="95" fill="none" stroke="black" stroke-width="10"/>
          <circle cx="225" cy="155" r="8" fill="black"/>
          <circle cx="295" cy="155" r="8" fill="black"/>
          <path d="M220 210 Q260 245 300 210" fill="none" stroke="black" stroke-width="8"/>
          <line x1="260" y1="265" x2="260" y2="430" stroke="black" stroke-width="10"/>
          <line x1="160" y1="330" x2="360" y2="330" stroke="black" stroke-width="10"/>
          <line x1="260" y1="430" x2="180" y2="560" stroke="black" stroke-width="10"/>
          <line x1="260" y1="430" x2="340" y2="560" stroke="black" stroke-width="10"/>
        </svg>`,
      ),
      duration: 5,
      title: "The hook",
      caption: "I thought I knew exactly where life was taking me.",
      role: "hook",
    },
    {
      photo: await makeDrawing(
        "demo-turn.png",
        `<svg width="520" height="640" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="white"/>
          <path d="M70 420 C140 250 220 180 260 180 C300 180 380 250 450 420" fill="none" stroke="black" stroke-width="10"/>
          <circle cx="260" cy="250" r="55" fill="none" stroke="black" stroke-width="9"/>
          <line x1="120" y1="500" x2="400" y2="500" stroke="black" stroke-width="8"/>
          <path d="M200 360 L260 470 L320 360" fill="none" stroke="black" stroke-width="9"/>
        </svg>`,
      ),
      duration: 5,
      title: "The turn",
      caption: "Then one small moment changed everything.",
      role: "turn",
    },
    {
      photo: await makeDrawing(
        "demo-close.png",
        `<svg width="520" height="640" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="white"/>
          <circle cx="260" cy="220" r="110" fill="none" stroke="black" stroke-width="10"/>
          <path d="M170 210 Q210 160 260 210 Q310 260 350 210" fill="none" stroke="black" stroke-width="9"/>
          <line x1="160" y1="380" x2="360" y2="380" stroke="black" stroke-width="10"/>
          <line x1="200" y1="380" x2="200" y2="520" stroke="black" stroke-width="10"/>
          <line x1="320" y1="380" x2="320" y2="520" stroke="black" stroke-width="10"/>
          <path d="M140 560 Q260 600 380 560" fill="none" stroke="black" stroke-width="8"/>
        </svg>`,
      ),
      duration: 5,
      title: "What stayed",
      caption: "Looking back, that detour became the beginning I needed.",
      role: "close",
    },
  ];

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "dml-final-"));
  const segments: string[] = [];
  const pencil = path.join(process.cwd(), "public/sounds/pencil-scratch.wav");

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const assets = await createSketchAssets(scene.photo);
    if (!assets) throw new Error(`No assets for ${scene.photo}`);
    const framesDir = path.join(tempDir, `frames-${i}`);
    const sketchPath = path.join(process.cwd(), "public", assets.sketchUrl.replace(/^\//, ""));
    await renderStrokeFrames({
      strokeSet: assets.strokes,
      outDir: framesDir,
      durationSec: scene.duration,
      fps: 30,
      sketchPath,
      caption: scene.caption,
      title: scene.title,
      sceneLabel: `${String(i + 1).padStart(2, "0")} · ${scene.role}`,
    });
    const segment = path.join(tempDir, `seg-${i}.mp4`);
    const drawSec = Math.min(5.2, scene.duration * 0.72);
    await run([
      "-y",
      "-framerate",
      "30",
      "-i",
      path.join(framesDir, "frame-%05d.png"),
      "-stream_loop",
      "-1",
      "-i",
      pencil,
      "-filter_complex",
      `[1:a]volume=0.5,afade=t=out:st=${Math.max(0.2, drawSec - 0.25)}:d=0.25,apad=whole_dur=${scene.duration}[a]`,
      "-map",
      "0:v",
      "-map",
      "[a]",
      "-t",
      String(scene.duration),
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "18",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "160k",
      segment,
    ]);
    segments.push(segment);
    console.log(`scene ${i + 1}/${scenes.length} ready · ${assets.strokes.strokes.length} strokes`);
  }

  const concatFile = path.join(tempDir, "segments.txt");
  await fs.writeFile(concatFile, segments.map(f => `file '${f.replaceAll("'", "'\\''")}'`).join("\n"));
  const output = path.join(process.cwd(), "public/exports/draw-my-life-demo.mp4");
  const artifact = "/opt/cursor/artifacts/draw-my-life-stroke-demo.mp4";
  await run(["-y", "-f", "concat", "-safe", "0", "-i", concatFile, "-c", "copy", output]);
  await fs.copyFile(output, artifact);
  const st = await fs.stat(output);
  console.log(JSON.stringify({ output, artifact, bytes: st.size, durationSec: 15, size: "1080x1920" }, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
