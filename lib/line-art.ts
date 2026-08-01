import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";
import { colorizeLineArt } from "./colorize-sketch";
import { traceStrokesFromRaw, type StrokeSet } from "./stroke-trace";

const uploads = path.join(process.cwd(), "public", "uploads");

export type SketchAssets = {
  sketchUrl: string;
  strokesUrl: string;
  strokes: StrokeSet;
};

async function ensureUploads() {
  await fs.mkdir(uploads, { recursive: true });
}

export async function createLineArt(photoUrl: string): Promise<string | undefined> {
  const assets = await createSketchAssets(photoUrl);
  return assets?.sketchUrl;
}

export async function createSketchAssets(
  photoUrl: string,
  options: { accent?: string } = {},
): Promise<SketchAssets | undefined> {
  if (!photoUrl.startsWith("/uploads/")) return undefined;
  await ensureUploads();
  const sourceName = path.basename(photoUrl);
  const stem = sourceName.replace(path.extname(sourceName), "");
  const outputName = `${stem}-line-art-v5.png`;
  const strokesName = `${stem}-strokes-v5.json`;
  const source = path.join(uploads, sourceName);
  const output = path.join(uploads, outputName);
  const strokesPath = path.join(uploads, strokesName);
  const sketchUrl = `/uploads/${outputName}`;
  const strokesUrl = `/uploads/${strokesName}`;

  try {
    await fs.access(output);
    await fs.access(strokesPath);
    const strokes = JSON.parse(await fs.readFile(strokesPath, "utf8")) as StrokeSet;
    return { sketchUrl, strokesUrl, strokes };
  } catch {
    // regenerate
  }

  try {
    const base = sharp(source).rotate().resize(720, 720, { fit: "inside", withoutEnlargement: true });
    const { data: rgba, info } = await base.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const gray = Buffer.alloc(info.width * info.height);
    let ink = 0;
    for (let i = 0; i < info.width * info.height; i++) {
      const r = rgba[i * 4]!;
      const g = rgba[i * 4 + 1]!;
      const b = rgba[i * 4 + 2]!;
      const a = rgba[i * 4 + 3]!;
      const lum = (r * 0.299 + g * 0.587 + b * 0.114) | 0;
      // Any non-near-white opaque pixel counts as ink (keeps colored marker drawings)
      const isInk = a > 40 && lum < 230;
      gray[i] = isInk ? Math.min(lum, 80) : 255;
      if (isInk) ink++;
    }
    const density = ink / (info.width * info.height);

    let sketchPng: Buffer;
    let strokeMask = gray;

    if (density > 0.002 && density < 0.22) {
      // Already a sparse drawing (stick figures / icons) — keep original colors
      sketchPng = await sharp(source)
        .rotate()
        .resize(720, 720, { fit: "inside", withoutEnlargement: true })
        .png()
        .toBuffer();
    } else {
      // Photo → edge line-art, then dry-erase colorize
      const edged = await sharp(source)
        .rotate()
        .resize(720, 720, { fit: "inside", withoutEnlargement: true })
        .grayscale()
        .blur(0.55)
        .convolve({
          width: 3,
          height: 3,
          kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1],
          scale: 1,
          offset: 128,
        })
        .threshold(142)
        .raw()
        .toBuffer({ resolveWithObject: true });
      strokeMask = Buffer.from(edged.data);
      sketchPng = await colorizeLineArt(edged.data, edged.info.width, edged.info.height, options.accent);
    }

    await fs.writeFile(output, sketchPng);

    const meta = await sharp(sketchPng).metadata();
    const w = meta.width || info.width;
    const h = meta.height || info.height;
    // Rebuild mask at sketch size if needed
    if (strokeMask.length !== w * h) {
      const { data } = await sharp(sketchPng).grayscale().raw().toBuffer({ resolveWithObject: true });
      strokeMask = Buffer.alloc(data.length);
      for (let i = 0; i < data.length; i++) strokeMask[i] = data[i]! < 230 ? data[i]! : 255;
    }

    const strokes = traceStrokesFromRaw(strokeMask, w, h, {
      threshold: 200,
      maxStrokes: 220,
      simplify: 1.25,
    });
    await fs.writeFile(strokesPath, JSON.stringify(strokes));
    return { sketchUrl, strokesUrl, strokes };
  } catch (error) {
    console.error("Line-art / stroke extraction failed", error);
    return undefined;
  }
}

export async function createLineArtSet(photoUrls: string[]) {
  const assets = await Promise.all(photoUrls.map(url => createSketchAssets(url)));
  return assets.map(a => a?.sketchUrl);
}

export async function createSketchAssetSet(photoUrls: string[]) {
  return Promise.all(photoUrls.map(url => createSketchAssets(url)));
}

export async function loadStrokeSet(strokesUrl?: string): Promise<StrokeSet | null> {
  if (!strokesUrl?.startsWith("/uploads/")) return null;
  try {
    const file = path.join(process.cwd(), "public", strokesUrl.replace(/^\//, ""));
    return JSON.parse(await fs.readFile(file, "utf8")) as StrokeSet;
  } catch {
    return null;
  }
}
