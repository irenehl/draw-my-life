/** Classic dry-erase palette used in Draw My Life whiteboard videos. */
export const MARKER = {
  black: "#1a1a1a",
  red: "#d62828",
  blue: "#1d4e89",
  green: "#2a9d5c",
  orange: "#e07a1f",
  board: "#f7f5ef",
  tray: "#c4b59a",
} as const;

export type MarkerColor = (typeof MARKER)[keyof typeof MARKER];

const CYCLE: string[] = [MARKER.black, MARKER.black, MARKER.red, MARKER.blue, MARKER.black, MARKER.green];

/** Pick a marker color for a stroke index — mostly black, with accent colors like real boards. */
export function markerColorForStroke(index: number, accent?: string): string {
  if (accent && index % 7 === 3) return accent;
  return CYCLE[index % CYCLE.length]!;
}

/** Marker barrel color matching the active ink. */
export function markerBarrelForInk(ink: string): string {
  if (ink === MARKER.red) return "#b81f1f";
  if (ink === MARKER.blue) return "#163d6d";
  if (ink === MARKER.green) return "#1f7a47";
  if (ink === MARKER.orange) return "#c46512";
  return "#222222";
}
