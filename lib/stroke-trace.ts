/** Centerline stroke extraction from binary line-art for draw-my-life animation. */

export type StrokePath = {
  d: string;
  length: number;
  /** Tip position samples along the stroke, normalized 0–1 in viewBox space */
  tips: Array<{ t: number; x: number; y: number }>;
};

export type StrokeSet = {
  viewBox: [number, number, number, number];
  width: number;
  height: number;
  strokes: StrokePath[];
  totalLength: number;
};

type Point = { x: number; y: number };

const NEIGHBORS: Point[] = [
  { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }, { x: -1, y: 1 },
  { x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: -1 }, { x: 1, y: -1 },
];

function idx(x: number, y: number, w: number) {
  return y * w + x;
}

function inBounds(x: number, y: number, w: number, h: number) {
  return x >= 0 && y >= 0 && x < w && y < h;
}

/** Zhang–Suen thinning on a binary mask (1 = ink, 0 = paper). */
export function thinBinary(mask: Uint8Array, w: number, h: number): Uint8Array {
  const img = new Uint8Array(mask);
  let changed = true;
  while (changed) {
    changed = false;
    for (const pass of [0, 1] as const) {
      const toRemove: number[] = [];
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const i = idx(x, y, w);
          if (!img[i]) continue;
          const p = NEIGHBORS.map(n => img[idx(x + n.x, y + n.y, w)]);
          const neighbors = p.reduce((s, v) => s + v, 0);
          if (neighbors < 2 || neighbors > 6) continue;
          let transitions = 0;
          for (let k = 0; k < 8; k++) if (!p[k] && p[(k + 1) % 8]) transitions++;
          if (transitions !== 1) continue;
          if (pass === 0) {
            if (p[0] && p[2] && p[4]) continue;
            if (p[2] && p[4] && p[6]) continue;
          } else {
            if (p[0] && p[2] && p[6]) continue;
            if (p[0] && p[4] && p[6]) continue;
          }
          toRemove.push(i);
        }
      }
      if (toRemove.length) {
        changed = true;
        for (const i of toRemove) img[i] = 0;
      }
    }
  }
  return img;
}

function degreeAt(img: Uint8Array, x: number, y: number, w: number, h: number) {
  let d = 0;
  for (const n of NEIGHBORS) {
    const nx = x + n.x;
    const ny = y + n.y;
    if (inBounds(nx, ny, w, h) && img[idx(nx, ny, w)]) d++;
  }
  return d;
}

function nextNeighbor(
  img: Uint8Array,
  x: number,
  y: number,
  w: number,
  h: number,
  visited: Uint8Array,
  prefer?: Point,
): Point | null {
  const ordered = prefer
    ? [...NEIGHBORS].sort((a, b) => {
        const da = (a.x - prefer.x) ** 2 + (a.y - prefer.y) ** 2;
        const db = (b.x - prefer.x) ** 2 + (b.y - prefer.y) ** 2;
        return da - db;
      })
    : NEIGHBORS;
  for (const n of ordered) {
    const nx = x + n.x;
    const ny = y + n.y;
    if (!inBounds(nx, ny, w, h)) continue;
    const i = idx(nx, ny, w);
    if (img[i] && !visited[i]) return { x: nx, y: ny };
  }
  return null;
}

function walkStroke(
  img: Uint8Array,
  start: Point,
  w: number,
  h: number,
  visited: Uint8Array,
): Point[] {
  const points: Point[] = [start];
  visited[idx(start.x, start.y, w)] = 1;
  let prev: Point | undefined;
  let cur = start;
  while (true) {
    const dir = prev ? { x: cur.x - prev.x, y: cur.y - prev.y } : undefined;
    const next = nextNeighbor(img, cur.x, cur.y, w, h, visited, dir);
    if (!next) break;
    visited[idx(next.x, next.y, w)] = 1;
    points.push(next);
    prev = cur;
    cur = next;
    // Stop at junctions so strokes stay readable as single marker passes
    if (degreeAt(img, cur.x, cur.y, w, h) > 2 && points.length > 3) break;
  }
  return points;
}

function rdp(points: Point[], epsilon: number): Point[] {
  if (points.length < 3) return points;
  let maxDist = 0;
  let index = 0;
  const start = points[0];
  const end = points[points.length - 1];
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len2 = dx * dx + dy * dy || 1;
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i];
    const t = ((p.x - start.x) * dx + (p.y - start.y) * dy) / len2;
    const projX = start.x + t * dx;
    const projY = start.y + t * dy;
    const dist = Math.hypot(p.x - projX, p.y - projY);
    if (dist > maxDist) {
      maxDist = dist;
      index = i;
    }
  }
  if (maxDist > epsilon) {
    const left = rdp(points.slice(0, index + 1), epsilon);
    const right = rdp(points.slice(index), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [start, end];
}

function polylineLength(points: Point[]) {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return len;
}

function toPathD(points: Point[]) {
  if (!points.length) return "";
  let d = `M${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) d += `L${points[i].x} ${points[i].y}`;
  return d;
}

function tipSamples(points: Point[], length: number): StrokePath["tips"] {
  if (points.length < 2 || length <= 0) {
    const p = points[0] || { x: 0, y: 0 };
    return [{ t: 0, x: p.x, y: p.y }, { t: 1, x: p.x, y: p.y }];
  }
  const tips: StrokePath["tips"] = [];
  const steps = Math.min(24, Math.max(4, Math.ceil(length / 18)));
  for (let s = 0; s <= steps; s++) {
    const target = (s / steps) * length;
    let walked = 0;
    for (let i = 1; i < points.length; i++) {
      const seg = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
      if (walked + seg >= target || i === points.length - 1) {
        const u = seg ? (target - walked) / seg : 0;
        tips.push({
          t: s / steps,
          x: points[i - 1].x + (points[i].x - points[i - 1].x) * Math.min(1, Math.max(0, u)),
          y: points[i - 1].y + (points[i].y - points[i - 1].y) * Math.min(1, Math.max(0, u)),
        });
        break;
      }
      walked += seg;
    }
  }
  return tips;
}

function extractPolylines(img: Uint8Array, w: number, h: number): Point[][] {
  const visited = new Uint8Array(w * h);
  const strokes: Point[][] = [];

  // Prefer starting from endpoints so strokes read like natural marker passes
  const endpoints: Point[] = [];
  const junctions: Point[] = [];
  const body: Point[] = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (!img[idx(x, y, w)]) continue;
      const deg = degreeAt(img, x, y, w, h);
      if (deg === 1) endpoints.push({ x, y });
      else if (deg > 2) junctions.push({ x, y });
      else body.push({ x, y });
    }
  }

  const seeds = [...endpoints, ...junctions, ...body];
  for (const seed of seeds) {
    if (visited[idx(seed.x, seed.y, w)]) continue;
    const poly = walkStroke(img, seed, w, h, visited);
    if (poly.length >= 4) strokes.push(poly);
  }
  return strokes;
}

function inkDensity(mask: Uint8Array) {
  let ink = 0;
  for (let i = 0; i < mask.length; i++) if (mask[i]) ink++;
  return ink / Math.max(1, mask.length);
}

function dilate(mask: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(mask);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (mask[idx(x, y, w)]) continue;
      for (const n of NEIGHBORS) {
        if (mask[idx(x + n.x, y + n.y, w)]) {
          out[idx(x, y, w)] = 1;
          break;
        }
      }
    }
  }
  return out;
}

/**
 * Trace centerline strokes from a grayscale/binary raw buffer.
 * Dark pixels (below threshold) are treated as ink.
 */
export function traceStrokesFromRaw(
  raw: Buffer | Uint8Array,
  width: number,
  height: number,
  options: { threshold?: number; maxStrokes?: number; simplify?: number } = {},
): StrokeSet {
  const threshold = options.threshold ?? 140;
  const maxStrokes = options.maxStrokes ?? 280;
  const simplify = options.simplify ?? 1.2;
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < mask.length; i++) mask[i] = raw[i]! < threshold ? 1 : 0;

  // Edge maps from photo line-art are already thin — thinning them shatters strokes.
  // Only skeletonize denser ink (marker fills / thick shapes).
  const density = inkDensity(mask);
  const prepared = density > 0.085 ? thinBinary(dilate(mask, width, height), width, height) : mask;

  let polylines = extractPolylines(prepared, width, height)
    .map(poly => rdp(poly, simplify))
    .filter(poly => poly.length >= 2 && polylineLength(poly) >= 6);

  // Natural whiteboard order: top-to-bottom, then longer structure strokes first within a band
  polylines.sort((a, b) => {
    const ay = a.reduce((s, p) => s + p.y, 0) / a.length;
    const by = b.reduce((s, p) => s + p.y, 0) / b.length;
    const band = Math.floor(ay / 28) - Math.floor(by / 28);
    if (band) return band;
    return polylineLength(b) - polylineLength(a);
  });

  if (polylines.length > maxStrokes) polylines = polylines.slice(0, maxStrokes);

  const strokes: StrokePath[] = polylines.map(points => {
    const length = polylineLength(points);
    return { d: toPathD(points), length, tips: tipSamples(points, length) };
  });

  const totalLength = strokes.reduce((s, stroke) => s + stroke.length, 0);
  return {
    viewBox: [0, 0, width, height],
    width,
    height,
    strokes,
    totalLength,
  };
}

/** Progress helpers: which stroke is active and how far along it we are. */
export function strokeProgressAt(
  strokeSet: StrokeSet,
  progress01: number,
): { strokeIndex: number; strokeLocal: number; tip: { x: number; y: number } | null; drawnThrough: number } {
  const p = Math.max(0, Math.min(1, progress01));
  if (!strokeSet.strokes.length || strokeSet.totalLength <= 0) {
    return { strokeIndex: 0, strokeLocal: 1, tip: null, drawnThrough: 0 };
  }
  const target = p * strokeSet.totalLength;
  let walked = 0;
  for (let i = 0; i < strokeSet.strokes.length; i++) {
    const stroke = strokeSet.strokes[i];
    if (walked + stroke.length >= target || i === strokeSet.strokes.length - 1) {
      const local = stroke.length ? Math.min(1, Math.max(0, (target - walked) / stroke.length)) : 1;
      const tip = tipAt(stroke, local);
      return { strokeIndex: i, strokeLocal: local, tip, drawnThrough: i + local };
    }
    walked += stroke.length;
  }
  const last = strokeSet.strokes[strokeSet.strokes.length - 1];
  return {
    strokeIndex: strokeSet.strokes.length - 1,
    strokeLocal: 1,
    tip: tipAt(last, 1),
    drawnThrough: strokeSet.strokes.length,
  };
}

export function tipAt(stroke: StrokePath, local01: number): { x: number; y: number } {
  const t = Math.max(0, Math.min(1, local01));
  const tips = stroke.tips;
  if (!tips.length) return { x: 0, y: 0 };
  for (let i = 1; i < tips.length; i++) {
    if (t <= tips[i].t) {
      const span = tips[i].t - tips[i - 1].t || 1;
      const u = (t - tips[i - 1].t) / span;
      return {
        x: tips[i - 1].x + (tips[i].x - tips[i - 1].x) * u,
        y: tips[i - 1].y + (tips[i].y - tips[i - 1].y) * u,
      };
    }
  }
  const last = tips[tips.length - 1];
  return { x: last.x, y: last.y };
}

/** Dash offset for a path using pathLength=100 convention. */
export function dashOffsetForStroke(
  strokeIndex: number,
  activeIndex: number,
  activeLocal: number,
): number {
  if (strokeIndex < activeIndex) return 0;
  if (strokeIndex > activeIndex) return 100;
  return 100 - activeLocal * 100;
}
