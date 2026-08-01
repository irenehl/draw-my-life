export type VideoFormat = "vertical" | "horizontal";

export type FrameSize = {
  width: number;
  height: number;
  label: string;
  aspect: string;
  cssRatio: string;
};

const FORMATS: Record<VideoFormat, FrameSize> = {
  vertical: {
    width: 1080,
    height: 1920,
    label: "YouTube Short",
    aspect: "9:16",
    cssRatio: "9/16",
  },
  horizontal: {
    width: 1920,
    height: 1080,
    label: "YouTube / landscape",
    aspect: "16:9",
    cssRatio: "16/9",
  },
};

export function isVideoFormat(value: unknown): value is VideoFormat {
  return value === "vertical" || value === "horizontal";
}

export function frameSize(format: VideoFormat = "vertical"): FrameSize {
  return FORMATS[format];
}

export function ffmpegSize(format: VideoFormat = "vertical"): string {
  const { width, height } = frameSize(format);
  return `${width}x${height}`;
}
