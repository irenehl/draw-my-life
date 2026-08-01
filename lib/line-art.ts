import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";
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

export async function createSketchAssets(photoUrl: string): Promise<SketchAssets | undefined> {
  if (!photoUrl.startsWith("/uploads/")) return undefined;
  await ensureUploads();
  const sourceName = path.basename(photoUrl);
  const stem = sourceName.replace(path.extname(sourceName), "");
  const outputName = `${stem}-line-art-v3.png`;
  const strokesName = `${stem}-strokes-v3.json`;
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
    const pipeline = sharp(source)
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
      .png({ compressionLevel: 9 });

    const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
    await sharp(data, { raw: { width: info.width, height: info.height, channels: 1 } })
      .png({ compressionLevel: 9 })
      .toFile(output);

    const strokes = traceStrokesFromRaw(data, info.width, info.height, {
      threshold: 140,
      maxStrokes: 200,
      simplify: 1.4,
    });
    await fs.writeFile(strokesPath, JSON.stringify(strokes));
    return { sketchUrl, strokesUrl, strokes };
  } catch (error) {
    console.error("Line-art / stroke extraction failed", error);
    return undefined;
  }
}

export async function createLineArtSet(photoUrls: string[]) {
  const assets = await Promise.all(photoUrls.map(createSketchAssets));
  return assets.map(a => a?.sketchUrl);
}

export async function createSketchAssetSet(photoUrls: string[]) {
  return Promise.all(photoUrls.map(createSketchAssets));
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
