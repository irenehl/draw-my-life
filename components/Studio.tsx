"use client";
import { useRef, useState } from "react";
import { Check, ChevronRight, ImagePlus, Mic, WandSparkles, X } from "lucide-react";
import { demoProject } from "@/lib/demo";
import type { Project, VideoFormat } from "@/lib/types";
import FilmEditor from "./FilmEditor";

type Stage = "start" | "editor";
export default function Studio() {
  const [stage, setStage] = useState<Stage>("start");
  const [project, setProject] = useState<Project>(() => demoProject());
  const [notes, setNotes] = useState(project.notes);
  const [title, setTitle] = useState(project.title);
  const [format, setFormat] = useState<VideoFormat>("vertical");
  const [photos, setPhotos] = useState<string[]>([]);
  const [audio, setAudio] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [rendering, setRendering] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | null, kind: "photo" | "audio") {
    if (!files?.length) return;
    const form = new FormData();
    [...files].forEach(f => form.append("files", f));
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) return alert(data.error);
    kind === "photo" ? setPhotos(p => [...p, ...data.urls]) : setAudio(data.urls[0]);
  }

  async function generate() {
    if (notes.trim().length < 20) return alert("Tell us a little more—at least 20 characters keeps the story grounded.");
    setBusy(true);
    const res = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, notes, photos, narrationUrl: audio, format }) });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return alert(data.error);
    setProject(data);
    setStage("editor");
  }

  async function save(next = project) {
    if (next.id === "demo") return;
    const payload = {
      ...next,
      scenes: next.scenes.map(({ strokes: _strokes, ...scene }) => scene),
    };
    const res = await fetch(`/api/projects/${next.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (res.ok) {
      const saved = await res.json();
      setProject({
        ...saved,
        scenes: saved.scenes.map((scene: Project["scenes"][number], i: number) => ({
          ...scene,
          strokes: next.scenes[i]?.strokes,
        })),
      });
    }
  }

  async function render() {
    if (project.id === "demo") return alert("Create your own draft first, then export it.");
    setRendering(true);
    await save();
    const res = await fetch("/api/render", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId: project.id }) });
    const data = await res.json();
    setRendering(false);
    if (!res.ok) return alert(data.error);
    setProject(p => ({ ...p, status: "complete", exportUrl: data.output }));
  }

  if (stage === "editor") {
    return <FilmEditor project={project} setProject={setProject} onBack={() => setStage("start")} onSave={save} onRender={render} rendering={rendering} />;
  }

  return (
    <main className="onboarding">
      <header className="mast"><a className="brand"><i>✦</i> LIFE, DRAWN</a><span>Your memories. In your voice.</span></header>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span /> A tiny film studio for real life</div>
          <h1>Every life has<br/>a <em>turning point.</em></h1>
          <p>Bring the photos. Tell it in your own voice. We’ll shape the pacing, drawings, captions and sound into a short people won’t scroll past.</p>
          <div className="promise"><div className="avatars">♥</div><span><strong>Made to feel handmade</strong><small>No synthetic voices. No plastic transitions.</small></span></div>
        </div>
        <div className="setup-card">
          <div className="tape"/>
          <div className="card-head"><span>01</span><div><small>NEW STORY</small><h2>Tell it, then draw it</h2></div></div>
          <label className="field-label">Story title<input value={title} onChange={e => setTitle(e.target.value)} placeholder="The summer everything changed" /></label>
          <div className="field-label">Video format
            <div className="format-picker onboarding-format">
              <button type="button" className={format==="vertical"?"selected":""} onClick={()=>setFormat("vertical")}>Vertical 9:16<small>YouTube Short</small></button>
              <button type="button" className={format==="horizontal"?"selected":""} onClick={()=>setFormat("horizontal")}>Horizontal 16:9<small>YouTube / landscape</small></button>
            </div>
          </div>
          <label className="field-label">Your story<textarea value={notes} onChange={e => setNotes(e.target.value)} rows={6} placeholder={"This was me 10 years ago — scared and stuck.\n\nThen one moment changed everything.\n\nLooking back, that was the beginning."}/><small className="story-hint">One paragraph (or numbered beat) per scene. We’ll animate each drawing to that part of your story.</small></label>
          <button className="dropzone" onClick={() => photoRef.current?.click()}><ImagePlus/><strong>{photos.length ? `${photos.length} drawings paired to your story` : "Add drawings for each beat"}</strong><small>JPG, PNG or WEBP · 1st drawing → 1st paragraph</small><span>Choose drawings</span></button>
          <input ref={photoRef} hidden type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e => upload(e.target.files, "photo")}/>
          {photos.length > 0 && <div className="photo-strip">{photos.map((p, i) => <div key={p}><img src={p} alt={`beat ${i + 1}`}/><em className="beat-tag">{i + 1}</em><button onClick={() => setPhotos(x => x.filter(v => v !== p))}><X/></button></div>)}</div>}
          <button className={`voice-drop ${audio ? "added" : ""}`} onClick={() => audioRef.current?.click()}><Mic/><span><strong>{audio ? "Your voice is ready" : "Optional: add your voice"}</strong><small>{audio ? "Tap to replace the recording" : "Upload MP3, WAV, M4A or WEBM — or just use the story text on screen"}</small></span>{audio && <Check/>}</button>
          <input ref={audioRef} hidden type="file" accept="audio/*" onChange={e => upload(e.target.files, "audio")}/>
          <label className="consent"><input type="checkbox" defaultChecked/><span>I have permission to use these photos and audio.</span></label>
          <button className="generate" onClick={generate} disabled={busy}><WandSparkles/>{busy ? "Animating your story…" : "Animate my story"}<ChevronRight/></button>
          <p className="local-note">⌂ Your originals stay on this machine.</p>
        </div>
      </section>
      <footer className="story-beats"><span>HOOK <i/></span><span>SETUP <i/></span><span>THE TURN <i/></span><span>PAYOFF <i/></span><span>LAST LINE</span></footer>
    </main>
  );
}
