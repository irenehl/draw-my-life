import { describe, expect, it } from "vitest";
import { ffmpegSize, frameSize, isVideoFormat } from "./format";

describe("video formats", () => {
  it("defines vertical Short and horizontal landscape sizes", () => {
    expect(frameSize("vertical")).toMatchObject({ width: 1080, height: 1920, aspect: "9:16" });
    expect(frameSize("horizontal")).toMatchObject({ width: 1920, height: 1080, aspect: "16:9" });
    expect(ffmpegSize("horizontal")).toBe("1920x1080");
  });

  it("validates format strings", () => {
    expect(isVideoFormat("vertical")).toBe(true);
    expect(isVideoFormat("horizontal")).toBe(true);
    expect(isVideoFormat("square")).toBe(false);
  });
});
