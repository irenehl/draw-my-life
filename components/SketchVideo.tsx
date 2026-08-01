import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Project, Scene } from "@/lib/types";
import { getRevealBands } from "@/lib/reveal";

const paths = {
  portrait: ["M27 47c0-17 10-29 24-29 16 0 25 12 25 29 0 18-10 31-25 31S27 65 27 47Z", "M36 44c4-5 8-7 15-7 8 0 13 2 17 7", "M42 56h1m16 0h1M45 65c4 3 8 3 13 0"],
  timeline: ["M8 61C28 48 55 52 92 28", "M14 57v14m25-19v16m25-24v15m22-28v14", "M10 72h10m14-2h10m15-9h10m12-15h10"],
  thought: ["M25 66c-14-6-14-24 0-28 0-17 23-24 34-12 17-7 32 8 26 23-5 12-20 17-34 12-8 8-23 8-30-7Z", "M37 49c6-8 18-9 24-1 4 6 1 13-6 17", "M52 73h1"],
  map: ["M8 26l21-10 22 9 21-10 20 9v51L72 65 51 76 29 65 8 76Z", "M29 16v49m22-40v51m21-61v50", "M20 48c15-14 28 8 42-6 9-9 14-6 22 2"],
};

function MarkerDrawing({ scene, progress }: { scene: Scene; progress: number }) {
  const style = scene.style || "portrait"; const strokes = paths[style];
  return <svg className="marker-drawing" viewBox="0 0 100 100">
    {strokes.map((d, i) => <path key={d} d={d} pathLength="100" style={{ strokeDasharray: 100, strokeDashoffset: Math.max(0, 100 - progress * 1.3 + i * 24) }} />)}
    <path className="accent-stroke" d={style === "timeline" ? "M9 79c27 5 54 4 82-2" : "M19 84c20 4 43 4 65-1"} pathLength="100" style={{ stroke: scene.accent, strokeDasharray: 100, strokeDashoffset: Math.max(0, 125 - progress) }} />
  </svg>;
}

function ExtractedSketch({ scene, progress }: { scene: Scene; progress: number }) {
  const sketchUrl = scene.sketchUrl;
  if (!sketchUrl) return null;
  return <div className="extracted-sketch" style={{ transform: scene.flip ? "scaleX(-1)" : undefined }}>
    {getRevealBands(progress).map((reveal, band) => {
      return <Img key={band} src={sketchUrl} className="line-art-source" style={{ clipPath: reveal.clipPath, objectPosition: `${35 + (scene.crop || 0) * 15}% center` }}/>
    })}
  </div>;
}

export default function SketchVideo({ project, selected }: { project: Project; selected?: number }) {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig(); const enabled = project.scenes.filter(s => s.enabled);
  let scene = selected === undefined ? enabled[0] : project.scenes[selected]; let localFrame = frame; let sceneIndex = selected ?? 0;
  if (selected === undefined) { let cursor = 0; for (let i = 0; i < enabled.length; i++) { const length = enabled[i].duration * fps; if (frame < cursor + length) { scene = enabled[i]; localFrame = frame - cursor; sceneIndex = project.scenes.indexOf(scene); break; } cursor += length; } }
  if (!scene) return <AbsoluteFill style={{ background: "#f8f7f1" }} />;
  const progress = interpolate(localFrame, [0, Math.min(scene.duration * fps * .62, fps * 3.2)], [0, 100], { extrapolateRight: "clamp" });
  const band = Math.min(3, Math.floor(progress / 25)); const bandProgress = (progress % 25) * 4;
  const handX = band % 2 === 0 ? 15 + bandProgress * .68 : 83 - bandProgress * .68; const handY = 28 + band * 14;
  const photoReveal = interpolate(localFrame, [fps * .45, fps * 2.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const captionIn = interpolate(localFrame, [fps * 1.6, fps * 2.05], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill className="whiteboard-video" style={{ color: "#18201d" }}>
    <div className="erase-ghost ghost-one"/><div className="erase-ghost ghost-two"/>
    <div className="board-date">{String(sceneIndex + 1).padStart(2, "0")} · {scene.role}</div>
    <div className={`memory-sketch style-${scene.style || "portrait"}`} style={{ transform: `scale(${1 + (scene.effects.zoom ? localFrame / (scene.duration * fps) * .035 : 0)})` }}>
      {scene.photoUrl && !scene.sketchUrl && <Img src={scene.photoUrl} className="source-memory" style={{ opacity: photoReveal * .23, objectPosition: `${35 + (scene.crop || 0) * 15}% center`, transform: scene.flip ? "scaleX(-1)" : undefined }} />}
      {scene.sketchUrl ? <ExtractedSketch scene={scene} progress={progress}/> : <MarkerDrawing scene={scene} progress={progress}/>} 
      <div className="scribble-label" style={{ opacity: Math.max(0, (progress - 62) / 20) }}>{scene.title}</div>
    </div>
    {scene.effects.marker && progress < 97 && <div className="drawing-hand" style={{ left: `${handX}%`, top: `${handY}%`, transform: `rotate(${scene.flip ? -24 : 14}deg)` }}><span/><i/></div>}
    <div className="film-caption" style={{ opacity: captionIn, transform: `translateY(${(1-captionIn)*18}px)` }}><span>{scene.caption.text}</span></div>
    <div className="marker-tray"><i/><i/><i/></div>
  </AbsoluteFill>;
}
