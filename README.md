# Life, Drawn

A local-first story studio that turns photos, narration, and notes into a tactile vertical draw-my-life film.

## Run locally

Requirements: Node.js 20+, npm, and FFmpeg available on your PATH.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Uploads, project JSON, and exports stay in the local `public/uploads`, `data`, and `public/exports` folders.

## MVP provider model

The included provider is deliberately deterministic and offline: it builds story beats only from creator notes and photo order, so it cannot invent biographical details. The storage and generation code are separated in `lib/` so cloud transcription, image understanding, line-art transformation, and object storage can be added without changing the editor.

The export route requires FFmpeg and creates an H.264/AAC 1080×1920 MP4. The Remotion player provides the interactive scene preview.
