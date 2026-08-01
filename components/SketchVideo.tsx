import { AbsoluteFill, Audio, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Project, Scene } from "@/lib/types";
import type { StrokeSet } from "@/lib/stroke-trace";
import { getStrokeReveal } from "@/lib/reveal";

const paths = {
  portrait: ["M27 47c0-17 10-29 24-29 16 0 25 12 25 29 0 18-10 31-25 31S27 65 27 47Z", "M36 44c4-5 8-7 15-7 8 0 13 2 17 7", "M42 56h1m16 0h1M45 65c4 3 8 3 13 0"],
  timeline: ["M8 61C28 48 55 52 92 28", "M14 57v14m25-19v16m25-24v15m22-28v14", "M10 72h10m14-2h10m15-9h10m12-15h10"],
  thought: ["M25 66c-14-6-14-24 0-28 0-17 23-24 34-12 17-7 32 8 26 23-5 12-20 17-34 12-8 8-23 8-30-7Z", "M37 49c6-8 18-9 24-1 4 6 1 13-6 17", "M52 73h1"],
  map: ["M8 26l21-10 22 9 21-10 20 9v51L72 65 51 76 29 65 8 76Z", "M29 16v49m22-40v51m21-61v50", "M20 48c15-14 28 8 42-6 9-9 14-6 22 2"],
};

function MarkerDrawing({ scene, progress }: { scene: Scene; progress: number }) {
  const style = scene.style || "portrait";
  const strokes = paths[style];
  return (
    <svg className="marker-drawing" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
      {strokes.map((d, i) => (
        <path
          key={d}
          d={d}
          pathLength="100"
          style={{ strokeDasharray: 100, strokeDashoffset: Math.max(0, 100 - progress * 1.3 + i * 24) }}
        />
      ))}
      <path
        className="accent-stroke"
        d={style === "timeline" ? "M9 79c27 5 54 4 82-2" : "M19 84c20 4 43 4 65-1"}
        pathLength="100"
        style={{ stroke: scene.accent, strokeDasharray: 100, strokeDashoffset: Math.max(0, 125 - progress) }}
      />
    </svg>
  );
}

function StrokeSketch({
  scene,
  strokeSet,
  progress,
}: {
  scene: Scene;
  strokeSet: StrokeSet;
  progress: number;
}) {
  const reveal = getStrokeReveal(strokeSet, progress);
  const [vx, vy, vw, vh] = strokeSet.viewBox;
  return (
    <div className="stroke-sketch" style={{ transform: scene.flip ? "scaleX(-1)" : undefined }}>
      <svg
        className="stroke-drawing"
        viewBox={`${vx} ${vy} ${vw} ${vh}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {strokeSet.strokes.map((stroke, i) => (
          <path
            key={`${i}-${stroke.d.slice(0, 24)}`}
            d={stroke.d}
            pathLength="100"
            style={{
              strokeDasharray: 100,
              strokeDashoffset: reveal.dashFor(i),
              strokeWidth: Math.max(1.6, Math.min(strokeSet.width, strokeSet.height) * 0.012),
            }}
          />
        ))}
      </svg>
      {/* Soft photo underlay once enough ink is down — still reads as drawing */}
      {scene.photoUrl && progress > 55 && (
        <Img
          src={scene.photoUrl}
          className="photo-underlay"
          style={{
            opacity: interpolate(progress, [55, 92], [0, 0.14], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
            objectPosition: `${35 + (scene.crop || 0) * 15}% center`,
            transform: scene.flip ? "scaleX(-1)" : undefined,
          }}
        />
      )}
    </div>
  );
}

function useSceneFrame(project: Project, selected?: number) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enabled = project.scenes.filter(s => s.enabled);
  let scene = selected === undefined ? enabled[0] : project.scenes[selected];
  let localFrame = frame;
  let sceneIndex = selected ?? 0;
  if (selected === undefined) {
    let cursor = 0;
    for (let i = 0; i < enabled.length; i++) {
      const length = enabled[i].duration * fps;
      if (frame < cursor + length) {
        scene = enabled[i];
        localFrame = frame - cursor;
        sceneIndex = project.scenes.indexOf(scene);
        break;
      }
      cursor += length;
    }
  }
  return { scene, localFrame, sceneIndex, fps, frame };
}

export default function SketchVideo({ project, selected }: { project: Project; selected?: number }) {
  const { scene, localFrame, sceneIndex, fps } = useSceneFrame(project, selected);
  if (!scene) return <AbsoluteFill style={{ background: "#f8f7f1" }} />;

  const drawWindow = Math.min(scene.duration * fps * 0.72, fps * 5.2);
  const progress = interpolate(localFrame, [0, drawWindow], [0, 100], { extrapolateRight: "clamp" });
  const strokeSet = scene.strokes;
  const reveal = getStrokeReveal(strokeSet, progress);
  const captionIn = interpolate(localFrame, [fps * 1.35, fps * 1.85], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const handX = reveal.tipPercent
    ? Math.min(88, Math.max(8, reveal.tipPercent.x + (scene.flip ? 4 : -2)))
    : 20 + (progress % 25) * 2.2;
  const handY = reveal.tipPercent
    ? Math.min(82, Math.max(10, reveal.tipPercent.y - 2))
    : 22 + Math.floor(progress / 25) * 14;

  const drawingSound = scene.effects.marker && reveal.isDrawing && !!strokeSet?.strokes.length;
  const pencilVolume = project.music === "none" ? 0.55 : 0.42;

  return (
    <AbsoluteFill className="whiteboard-video short-film" style={{ color: "#18201d" }}>
      {scene.effects.paper && (
        <>
          <div className="erase-ghost ghost-one" />
          <div className="erase-ghost ghost-two" />
        </>
      )}
      <div className="board-date">
        {String(sceneIndex + 1).padStart(2, "0")} · {scene.role}
      </div>
      <div
        className={`memory-sketch short-sketch style-${scene.style || "portrait"}`}
        style={{
          transform: `scale(${1 + (scene.effects.zoom ? localFrame / (scene.duration * fps) * 0.04 : 0)})`,
        }}
      >
        {strokeSet?.strokes.length ? (
          <StrokeSketch scene={scene} strokeSet={strokeSet} progress={progress} />
        ) : scene.sketchUrl ? (
          <FallbackImageSketch scene={scene} progress={progress} />
        ) : (
          <MarkerDrawing scene={scene} progress={progress} />
        )}
        <div className="scribble-label" style={{ opacity: Math.max(0, (progress - 70) / 18) }}>
          {scene.title}
        </div>
      </div>
      {scene.effects.marker && progress < 98 && (
        <div
          className="drawing-hand"
          style={{
            left: `${handX}%`,
            top: `${handY}%`,
            transform: `rotate(${scene.flip ? -22 : 16}deg)`,
            opacity: reveal.isDrawing ? 1 : 0.35,
          }}
        >
          <span />
          <i />
        </div>
      )}
      <div
        className="film-caption short-caption"
        style={{ opacity: captionIn, transform: `translateY(${(1 - captionIn) * 18}px)` }}
      >
        <span>{scene.caption.text}</span>
      </div>
      {drawingSound && (
        <Audio src="/sounds/pencil-scratch.wav" volume={pencilVolume} loop startFrom={0} />
      )}
    </AbsoluteFill>
  );
}

/** Last-resort image reveal if strokes failed — still paints in short marker passes. */
function FallbackImageSketch({ scene, progress }: { scene: Scene; progress: number }) {
  const bands = 12;
  return (
    <div className="extracted-sketch stroke-fallback" style={{ transform: scene.flip ? "scaleX(-1)" : undefined }}>
      {Array.from({ length: bands }, (_, band) => {
        const start = (band / bands) * 100;
        const local = Math.max(0, Math.min(100, (progress - start) * (bands * 0.95)));
        const odd = band % 2 === 1;
        const clipPath = odd
          ? `inset(${(band / bands) * 100}% 0 ${100 - ((band + 1) / bands) * 100}% ${100 - local}%)`
          : `inset(${(band / bands) * 100}% ${100 - local}% ${100 - ((band + 1) / bands) * 100}% 0)`;
        return (
          <Img
            key={band}
            src={scene.sketchUrl!}
            className="line-art-source"
            style={{
              clipPath,
              objectPosition: `${35 + (scene.crop || 0) * 15}% center`,
            }}
          />
        );
      })}
    </div>
  );
}
