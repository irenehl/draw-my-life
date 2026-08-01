import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";
import type { StrokeSet } from "./stroke-trace";
import { strokeProgressAt } from "./stroke-trace";

/** Rasterize stroke-by-stroke frames onto a 1080×1920 whiteboard for ffmpeg. */
export async function renderStrokeFrames(options: {
  strokeSet: StrokeSet;
  outDir: string;
  durationSec: number;
  fps?: number;
  sketchPath?: string;
  accent?: string;
  caption?: string;
  title?: string;
  sceneLabel?: string;
}): Promise<{ framePattern: string; frameCount: number }> {
  const fps = options.fps ?? 30;
  const frameCount = Math.max(1, Math.round(options.durationSec * fps));
  const drawFrames = Math.min(frameCount, Math.round(Math.min(options.durationSec * 0.72, 5.2) * fps));
  const width = 1080;
  const height = 1920;
  const padX = 40;
  const padTop = 100;
  const padBottom = 260;
  const drawW = width - padX * 2;
  const drawH = height - padTop - padBottom;
  const scale = Math.min(drawW / options.strokeSet.width, drawH / options.strokeSet.height);
  const offsetX = padX + (drawW - options.strokeSet.width * scale) / 2;
  const offsetY = padTop + (drawH - options.strokeSet.height * scale) / 2;
  const brush = Math.max(5, Math.min(options.strokeSet.width, options.strokeSet.height) * 0.028);

  await fs.mkdir(options.outDir, { recursive: true });

  let sketchHref: string | undefined;
  if (options.sketchPath) {
    const bytes = await fs.readFile(options.sketchPath);
    sketchHref = `data:image/png;base64,${bytes.toString("base64")}`;
  }

  for (let f = 0; f < frameCount; f++) {
    const progress01 = Math.min(1, f / Math.max(1, drawFrames));
    const { strokeIndex, strokeLocal, tip } = strokeProgressAt(options.strokeSet, progress01);

    const maskPaths = options.strokeSet.strokes
      .map((stroke, i) => {
        let dashOffset = 100;
        if (i < strokeIndex) dashOffset = 0;
        else if (i === strokeIndex) dashOffset = 100 - strokeLocal * 100;
        return `<path d="${stroke.d}" fill="none" stroke="white" stroke-width="${brush}" stroke-linecap="round" stroke-linejoin="round" pathLength="100" stroke-dasharray="100" stroke-dashoffset="${dashOffset}"/>`;
      })
      .join("");

    const fallbackInk = options.strokeSet.strokes
      .map((stroke, i) => {
        let dashOffset = 100;
        if (i < strokeIndex) dashOffset = 0;
        else if (i === strokeIndex) dashOffset = 100 - strokeLocal * 100;
        return `<path d="${stroke.d}" fill="none" stroke="#18201d" stroke-width="${brush * 0.45}" stroke-linecap="round" stroke-linejoin="round" pathLength="100" stroke-dasharray="100" stroke-dashoffset="${dashOffset}"/>`;
      })
      .join("");

    const drawing = sketchHref
      ? `<image href="${sketchHref}" x="0" y="0" width="${options.strokeSet.width}" height="${options.strokeSet.height}" preserveAspectRatio="xMidYMid meet" mask="url(#drawMask)"/>`
      : fallbackInk;

    const hand =
      tip && progress01 < 0.98
        ? `<g transform="translate(${offsetX + tip.x * scale + 8} ${offsetY + tip.y * scale - 10}) rotate(16)">
            <rect x="-4" y="-70" width="10" height="78" rx="2" fill="#1c2430"/>
            <polygon points="-4,8 6,8 1,22" fill="#18201d"/>
            <ellipse cx="18" cy="48" rx="22" ry="34" fill="#d8a06a"/>
          </g>`
        : "";

    const captionOpacity = Math.max(0, Math.min(1, (f / fps - 1.35) / 0.5));
    const titleOpacity = Math.max(0, (progress01 - 0.7) / 0.18);
    const label = options.sceneLabel
      ? `<text x="56" y="78" font-family="Georgia, serif" font-size="28" fill="#3a4540" opacity="0.7">${escapeXml(options.sceneLabel)}</text>`
      : "";
    const title = options.title
      ? `<text x="540" y="${height - 300}" text-anchor="middle" font-family="Georgia, serif" font-size="40" font-weight="700" fill="#18201d" opacity="${titleOpacity}">${escapeXml(options.title)}</text>`
      : "";
    const caption = options.caption
      ? `<text x="540" y="${height - 160}" text-anchor="middle" font-family="Arial, sans-serif" font-size="36" font-weight="700" fill="#18201d" opacity="${captionOpacity}">
          <tspan fill="#f8f7f1" stroke="#f8f7f1" stroke-width="14" paint-order="stroke">${escapeXml(truncate(options.caption, 64))}</tspan>
        </text>`
      : "";

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#f8f7f1"/>
  ${label}
  <defs>
    <mask id="drawMask" maskUnits="userSpaceOnUse" x="0" y="0" width="${options.strokeSet.width}" height="${options.strokeSet.height}">
      <rect width="${options.strokeSet.width}" height="${options.strokeSet.height}" fill="black"/>
      ${maskPaths}
    </mask>
  </defs>
  <g transform="translate(${offsetX} ${offsetY}) scale(${scale})">${drawing}</g>
  ${hand}
  ${title}
  ${caption}
</svg>`;

    const file = path.join(options.outDir, `frame-${String(f).padStart(5, "0")}.png`);
    await sharp(Buffer.from(svg)).png().toFile(file);
  }

  return {
    framePattern: path.join(options.outDir, "frame-%05d.png"),
    frameCount,
  };
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
