import sharp from "sharp";
import path from "path";
import os from "os";
import fs from "fs/promises";
import { spawn } from "child_process";
import { createSketchAssets } from "../lib/line-art";
import { renderStrokeFrames } from "../lib/render-strokes";
import { MARKER } from "../lib/marker-style";
import { buildStoryBeats } from "../lib/story";

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

  const story = `This was me ten years ago — scared, stuck, and sure nothing would change.

Then one small moment turned everything around. It was messy and completely mine.

Looking back, that detour became the beginning I needed.`;

  const drawings = [
    await makeDrawing(
      "story-beat-1.png",
      `<svg width="560" height="700" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${MARKER.board}"/>
        <circle cx="280" cy="150" r="70" fill="none" stroke="${MARKER.black}" stroke-width="8"/>
        <circle cx="255" cy="140" r="7" fill="${MARKER.black}"/>
        <circle cx="305" cy="140" r="7" fill="${MARKER.black}"/>
        <path d="M250 185 Q280 165 310 185" fill="none" stroke="${MARKER.black}" stroke-width="6"/>
        <line x1="280" y1="220" x2="280" y2="380" stroke="${MARKER.black}" stroke-width="8"/>
        <line x1="180" y1="280" x2="380" y2="280" stroke="${MARKER.black}" stroke-width="8"/>
        <line x1="280" y1="380" x2="210" y2="520" stroke="${MARKER.black}" stroke-width="8"/>
        <line x1="280" y1="380" x2="350" y2="520" stroke="${MARKER.black}" stroke-width="8"/>
        <text x="280" y="610" text-anchor="middle" font-family="Comic Sans MS, cursive" font-size="40" fill="${MARKER.blue}">10 years ago</text>
      </svg>`,
    ),
    await makeDrawing(
      "story-beat-2.png",
      `<svg width="560" height="700" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${MARKER.board}"/>
        <circle cx="220" cy="180" r="55" fill="none" stroke="${MARKER.black}" stroke-width="7"/>
        <line x1="220" y1="235" x2="220" y2="360" stroke="${MARKER.black}" stroke-width="7"/>
        <line x1="160" y1="290" x2="280" y2="290" stroke="${MARKER.black}" stroke-width="7"/>
        <line x1="220" y1="360" x2="170" y2="470" stroke="${MARKER.black}" stroke-width="7"/>
        <line x1="220" y1="360" x2="270" y2="470" stroke="${MARKER.black}" stroke-width="7"/>
        <path d="M300 200 L480 140" fill="none" stroke="${MARKER.orange}" stroke-width="10" stroke-linecap="round"/>
        <polygon points="480,140 445,125 455,165" fill="${MARKER.orange}"/>
        <circle cx="380" cy="320" r="48" fill="none" stroke="${MARKER.blue}" stroke-width="8"/>
        <text x="380" y="335" text-anchor="middle" font-family="Comic Sans MS, cursive" font-size="36" fill="${MARKER.blue}">!</text>
        <text x="280" y="610" text-anchor="middle" font-family="Comic Sans MS, cursive" font-size="38" fill="${MARKER.orange}">the turn</text>
      </svg>`,
    ),
    await makeDrawing(
      "story-beat-3.png",
      `<svg width="560" height="700" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${MARKER.board}"/>
        <circle cx="280" cy="170" r="65" fill="none" stroke="${MARKER.black}" stroke-width="8"/>
        <circle cx="258" cy="160" r="6" fill="${MARKER.black}"/>
        <circle cx="302" cy="160" r="6" fill="${MARKER.black}"/>
        <path d="M250 190 Q280 215 310 190" fill="none" stroke="${MARKER.black}" stroke-width="6"/>
        <line x1="280" y1="235" x2="280" y2="380" stroke="${MARKER.black}" stroke-width="8"/>
        <line x1="190" y1="300" x2="370" y2="300" stroke="${MARKER.black}" stroke-width="8"/>
        <line x1="280" y1="380" x2="215" y2="510" stroke="${MARKER.black}" stroke-width="8"/>
        <line x1="280" y1="380" x2="345" y2="510" stroke="${MARKER.black}" stroke-width="8"/>
        <path d="M400 400 L430 460 L500 460 L445 500 L470 560 L400 525 L330 560 L355 500 L300 460 L370 460 Z" fill="${MARKER.green}" stroke="${MARKER.green}"/>
        <text x="280" y="640" text-anchor="middle" font-family="Comic Sans MS, cursive" font-size="40" fill="${MARKER.green}">the beginning</text>
      </svg>`,
    ),
  ];

  const beats = buildStoryBeats(story, drawings);
  console.log(
    "story beats:",
    beats.map(b => ({ title: b.title, duration: b.duration, text: b.text.slice(0, 48), photo: b.photoUrl })),
  );

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "dml-story-"));
  const segments: string[] = [];
  const pencil = path.join(process.cwd(), "public/sounds/pencil-scratch.wav");

  for (let i = 0; i < beats.length; i++) {
    const beat = beats[i]!;
    const stem = path.basename(beat.photoUrl || "").replace(path.extname(beat.photoUrl || ""), "");
    await fs.rm(path.join(process.cwd(), "public/uploads", `${stem}-line-art-v5.png`), { force: true });
    await fs.rm(path.join(process.cwd(), "public/uploads", `${stem}-strokes-v5.json`), { force: true });

    const assets = await createSketchAssets(beat.photoUrl!, { accent: beat.accent });
    if (!assets) throw new Error(`No assets for ${beat.photoUrl}`);
    const framesDir = path.join(tempDir, `frames-${i}`);
    const sketchPath = path.join(process.cwd(), "public", assets.sketchUrl.replace(/^\//, ""));
    await renderStrokeFrames({
      strokeSet: assets.strokes,
      outDir: framesDir,
      durationSec: beat.duration,
      fps: 30,
      sketchPath,
      accent: beat.accent,
      caption: beat.text,
      title: beat.title,
      sceneLabel: `${String(i + 1).padStart(2, "0")} · ${beat.role}`,
    });
    const segment = path.join(tempDir, `seg-${i}.mp4`);
    const drawSec = Math.min(5.5, beat.duration * 0.78);
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
      `[1:a]volume=2.6,afade=t=out:st=${Math.max(0.2, drawSec - 0.2)}:d=0.2,alimiter=limit=0.95,apad=whole_dur=${beat.duration}[a]`,
      "-map",
      "0:v",
      "-map",
      "[a]",
      "-t",
      String(beat.duration),
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
      "192k",
      segment,
    ]);
    segments.push(segment);
    console.log(`beat ${i + 1}/${beats.length} · ${beat.duration}s · ${assets.strokes.strokes.length} strokes · "${beat.title}"`);
  }

  const concatFile = path.join(tempDir, "segments.txt");
  await fs.writeFile(concatFile, segments.map(f => `file '${f.replaceAll("'", "'\\''")}'`).join("\n"));
  const output = path.join(process.cwd(), "public/exports/draw-my-life-demo.mp4");
  const artifact = "/opt/cursor/artifacts/draw-my-life-stroke-demo.mp4";
  await run(["-y", "-f", "concat", "-safe", "0", "-i", concatFile, "-c", "copy", output]);
  await fs.copyFile(output, artifact);
  const st = await fs.stat(output);
  const durationSec = beats.reduce((n, b) => n + b.duration, 0);
  console.log(JSON.stringify({ output, artifact, bytes: st.size, durationSec, size: "1080x1920", beats: beats.length }, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
