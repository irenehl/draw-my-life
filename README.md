# Life, Drawn

A local-first story studio that turns photos, narration, and notes into a tactile vertical Draw My Life film — stroke-by-stroke marker drawing of your photos, pencil sounds while ink is down, and a full-bleed 9:16 YouTube Short frame.

## Run locally

Requirements: Node.js 20+, npm, and FFmpeg available on your PATH.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Uploads, project JSON, and exports stay in the local `public/uploads`, `data`, and `public/exports` folders.

## MVP provider model

The included provider is deliberately deterministic and offline: it builds story beats only from creator notes and photo order, so it cannot invent biographical details. The storage and generation code are separated in `lib/` so cloud transcription, image understanding, line-art transformation, and object storage can be added without changing the editor.

The export route requires FFmpeg and creates an H.264/AAC MP4 in either **1080×1920 (vertical Short)** or **1920×1080 (horizontal)**. Pick the format on the setup screen or in the editor. The Remotion player provides the interactive scene preview.
