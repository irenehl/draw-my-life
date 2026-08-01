import sharp from "sharp";
import { MARKER } from "./marker-style";

const PALETTE = [MARKER.black, MARKER.red, MARKER.blue, MARKER.green, MARKER.orange];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/**
 * Recolor a binary/grayscale line-art into dry-erase marker colors.
 * Most ink stays black; some connected regions get red/blue/green accents
 * like a classic Draw My Life whiteboard.
 */
export async function colorizeLineArt(
  grayRaw: Buffer,
  width: number,
  height: number,
  accentHex?: string,
): Promise<Buffer> {
  const palette = accentHex ? [MARKER.black, accentHex, MARKER.red, MARKER.blue, MARKER.green] : PALETTE;
  const rgbPalette = palette.map(hexToRgb);
  const out = Buffer.alloc(width * height * 3);
  // Flood-fill connected components and assign colors
  const visited = new Uint8Array(width * height);
  let component = 0;

  const inkAt = (i: number) => grayRaw[i]! < 140;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const start = y * width + x;
      if (visited[start] || !inkAt(start)) {
        if (!inkAt(start)) {
          // paper
          out[start * 3] = 247;
          out[start * 3 + 1] = 245;
          out[start * 3 + 2] = 239;
        }
        continue;
      }
      const color = rgbPalette[component % rgbPalette.length]!;
      component++;
      const stack = [start];
      visited[start] = 1;
      while (stack.length) {
        const i = stack.pop()!;
        out[i * 3] = color[0];
        out[i * 3 + 1] = color[1];
        out[i * 3 + 2] = color[2];
        const cx = i % width;
        const cy = (i / width) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const ni = ny * width + nx;
          if (visited[ni] || !inkAt(ni)) continue;
          visited[ni] = 1;
          stack.push(ni);
        }
      }
    }
  }

  // Unvisited paper leftover
  for (let i = 0; i < width * height; i++) {
    if (!visited[i] && !inkAt(i)) {
      out[i * 3] = 247;
      out[i * 3 + 1] = 245;
      out[i * 3 + 2] = 239;
    }
  }

  return sharp(out, { raw: { width, height, channels: 3 } }).png().toBuffer();
}
