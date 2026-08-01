"use client";
import { useRef, useState } from "react";
import { Check, ChevronRight, ImagePlus, Mic, WandSparkles, X } from "lucide-react";
import { demoProject } from "@/lib/demo";
import type { Project } from "@/lib/types";
import FilmEditor from "./FilmEditor";

type Stage = "start" | "editor";
export default function Studio() {
  const [stage, setStage] = useState<Stage>("start");
  const [project, setProject] = useState<Project>(() => demoProject());
  const [notes, setNotes] = useState(project.notes);
  const [title, setTitle] = useState(project.title);
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
    const res = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, notes, photos, narrationUrl: audio }) });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return alert(data.error);
    setProject(data);
    setStage("editor");
  }

  async function save(next = project) {
    if (next.id === "demo") return;
    const res = await fetch(`/api/projects/${next.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
    if (res.ok) setProject(await res.json());
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
          <div className="card-head"><span>01</span><div><small>NEW STORY</small><h2>What should we draw?</h2></div></div>
          <label className="field-label">Story title<input value={title} onChange={e => setTitle(e.target.value)} placeholder="The summer everything changed" /></label>
          <button className="dropzone" onClick={() => photoRef.current?.click()}><ImagePlus/><strong>{photos.length ? `${photos.length} memories added` : "Drop in your memories"}</strong><small>JPG, PNG or WEBP · up to 24 photos</small><span>Choose photos</span></button>
          <input ref={photoRef} hidden type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e => upload(e.target.files, "photo")}/>
          {photos.length > 0 && <div className="photo-strip">{photos.map((p, i) => <div key={p}><img src={p} alt={`memory ${i + 1}`}/><button onClick={() => setPhotos(x => x.filter(v => v !== p))}><X/></button></div>)}</div>}
          <button className={`voice-drop ${audio ? "added" : ""}`} onClick={() => audioRef.current?.click()}><Mic/><span><strong>{audio ? "Your voice is ready" : "Add your narration"}</strong><small>{audio ? "Tap to replace the recording" : "Upload MP3, WAV, M4A or WEBM"}</small></span>{audio && <Check/>}</button>
          <input ref={audioRef} hidden type="file" accept="audio/*" onChange={e => upload(e.target.files, "audio")}/>
          <label className="field-label">Notes for the editor<textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4}/></label>
          <label className="consent"><input type="checkbox" defaultChecked/><span>I have permission to use these photos and audio.</span></label>
          <button className="generate" onClick={generate} disabled={busy}><WandSparkles/>{busy ? "Shaping your first cut…" : "Make my first cut"}<ChevronRight/></button>
          <p className="local-note">⌂ Your originals stay on this machine.</p>
        </div>
      </section>
      <footer className="story-beats"><span>HOOK <i/></span><span>SETUP <i/></span><span>THE TURN <i/></span><span>PAYOFF <i/></span><span>LAST LINE</span></footer>
    </main>
  );
}
