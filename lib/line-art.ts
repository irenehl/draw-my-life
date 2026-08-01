import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";

const uploads = path.join(process.cwd(), "public", "uploads");

export async function createLineArt(photoUrl: string): Promise<string | undefined> {
  if (!photoUrl.startsWith("/uploads/")) return undefined;
  const sourceName = path.basename(photoUrl);
  const stem = sourceName.replace(path.extname(sourceName), "");
  const outputName = `${stem}-line-art-v2.png`;
  const source = path.join(uploads, sourceName);
  const output = path.join(uploads, outputName);
  try {
    await fs.access(output);
    return `/uploads/${outputName}`;
  } catch {}
  try {
    await sharp(source)
      .rotate()
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .grayscale()
      .blur(0.7)
      .convolve({ width: 3, height: 3, kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1], scale: 1, offset: 128 })
      .threshold(142)
      .png({ compressionLevel: 9 })
      .toFile(output);
    return `/uploads/${outputName}`;
  } catch (error) {
    console.error("Line-art extraction failed", error);
    return undefined;
  }
}

export async function createLineArtSet(photoUrls: string[]) {
  return Promise.all(photoUrls.map(createLineArt));
}
