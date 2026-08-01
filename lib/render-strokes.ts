import { promises as fs } from "fs";
import path from "path";
import sharp from "sharp";
import type { StrokeSet } from "./stroke-trace";
import { strokeProgressAt } from "./stroke-trace";
import { MARKER, markerBarrelForInk, markerColorForStroke } from "./marker-style";

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
  const drawFrames = Math.min(frameCount, Math.round(Math.min(options.durationSec * 0.78, 5.5) * fps));
  const width = 1080;
  const height = 1920;
  const padX = 36;
  const padTop = 90;
  const padBottom = 240;
  const drawW = width - padX * 2;
  const drawH = height - padTop - padBottom;
  const scale = Math.min(drawW / options.strokeSet.width, drawH / options.strokeSet.height);
  const offsetX = padX + (drawW - options.strokeSet.width * scale) / 2;
  const offsetY = padTop + (drawH - options.strokeSet.height * scale) / 2;
  const brush = Math.max(6, Math.min(options.strokeSet.width, options.strokeSet.height) * 0.032);

  await fs.mkdir(options.outDir, { recursive: true });

  let sketchHref: string | undefined;
  if (options.sketchPath) {
    const bytes = await fs.readFile(options.sketchPath);
    sketchHref = `data:image/png;base64,${bytes.toString("base64")}`;
  }

  for (let f = 0; f < frameCount; f++) {
    const progress01 = Math.min(1, f / Math.max(1, drawFrames));
    const { strokeIndex, strokeLocal, tip } = strokeProgressAt(options.strokeSet, progress01);
    const activeInk = markerColorForStroke(strokeIndex, options.accent);

    const maskPaths = options.strokeSet.strokes
      .map((stroke, i) => {
        let dashOffset = 100;
        if (i < strokeIndex) dashOffset = 0;
        else if (i === strokeIndex) dashOffset = 100 - strokeLocal * 100;
        return `<path d="${stroke.d}" fill="none" stroke="white" stroke-width="${brush}" stroke-linecap="round" stroke-linejoin="round" pathLength="100" stroke-dasharray="100" stroke-dashoffset="${dashOffset}"/>`;
      })
      .join("");

    // Colored marker strokes as fallback / wet ink overlay
    const coloredInk = options.strokeSet.strokes
      .map((stroke, i) => {
        let dashOffset = 100;
        if (i < strokeIndex) dashOffset = 0;
        else if (i === strokeIndex) dashOffset = 100 - strokeLocal * 100;
        const color = markerColorForStroke(i, options.accent);
        return `<path d="${stroke.d}" fill="none" stroke="${color}" stroke-width="${brush * 0.42}" stroke-linecap="round" stroke-linejoin="round" pathLength="100" stroke-dasharray="100" stroke-dashoffset="${dashOffset}"/>`;
      })
      .join("");

    // When a color sketch exists, reveal THAT image — don't rainbow-overlay extra strokes on top
    const drawing = sketchHref
      ? `<image href="${sketchHref}" x="0" y="0" width="${options.strokeSet.width}" height="${options.strokeSet.height}" preserveAspectRatio="xMidYMid meet" mask="url(#drawMask)"/>`
      : coloredInk;

    // Just the marker tip — no hand (classic overhead DML look often crops to tip)
    const marker =
      tip && progress01 < 0.98
        ? `<g transform="translate(${offsetX + tip.x * scale} ${offsetY + tip.y * scale}) rotate(28)">
            <rect x="-7" y="-92" width="14" height="88" rx="3" fill="${markerBarrelForInk(activeInk)}"/>
            <rect x="-5" y="-96" width="10" height="10" rx="2" fill="#f0f0f0"/>
            <polygon points="-5,-4 5,-4 0,14" fill="${activeInk}"/>
            <circle cx="0" cy="14" r="3.2" fill="${activeInk}" opacity="0.85"/>
          </g>`
        : "";

    const captionOpacity = Math.max(0, Math.min(1, (f / fps - 1.2) / 0.45));
    const titleOpacity = Math.max(0, (progress01 - 0.68) / 0.2);
    const label = options.sceneLabel
      ? `<text x="48" y="64" font-family="Comic Sans MS, Marker Felt, cursive" font-size="26" fill="#5a5a5a">${escapeXml(options.sceneLabel)}</text>`
      : "";
    const title = options.title
      ? `<text x="540" y="${height - 280}" text-anchor="middle" font-family="Comic Sans MS, Marker Felt, cursive" font-size="44" font-weight="700" fill="${MARKER.black}" opacity="${titleOpacity}">${escapeXml(options.title)}</text>`
      : "";
    const caption = options.caption
      ? `<text x="540" y="${height - 150}" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="${MARKER.black}" opacity="${captionOpacity}">
          <tspan fill="${MARKER.board}" stroke="${MARKER.board}" stroke-width="16" paint-order="stroke">${escapeXml(truncate(options.caption, 70))}</tspan>
        </text>`
      : "";

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <pattern id="boardGrain" width="8" height="8" patternUnits="userSpaceOnUse">
      <circle cx="1" cy="2" r="0.6" fill="#000" opacity="0.03"/>
      <circle cx="5" cy="6" r="0.5" fill="#000" opacity="0.025"/>
    </pattern>
    <mask id="drawMask" maskUnits="userSpaceOnUse" x="0" y="0" width="${options.strokeSet.width}" height="${options.strokeSet.height}">
      <rect width="${options.strokeSet.width}" height="${options.strokeSet.height}" fill="black"/>
      ${maskPaths}
    </mask>
  </defs>
  <rect width="100%" height="100%" fill="${MARKER.board}"/>
  <rect width="100%" height="100%" fill="url(#boardGrain)"/>
  ${label}
  <g transform="translate(${offsetX} ${offsetY}) scale(${scale})">${drawing}</g>
  ${marker}
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
