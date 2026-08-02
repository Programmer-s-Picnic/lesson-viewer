# EduShorts Maker

## Web camera overlay

Open **Web camera**, press **Start camera**, and allow browser camera access. Choose the corner, size, circular or rectangular frame, and mirroring. The live camera overlay is drawn into both the preview and the exported video. Camera access requires HTTPS or localhost.

A simplified, browser-based tool for creating vertical educational shorts.

## Run

Open `index.html` in a modern Chromium-based browser. For best results, serve the
folder through a local web server:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Features

- Quick Concept, Coding, MCQ and DSA templates
- Hook, explanation, spoken text, code, question, answer, image and CTA slides
- Per-slide microphone recording and audio upload
- Recorded narration mixed into preview and exported video
- Highlighted narration captions on every slide type
- Browser speech synthesis with voice and speed controls for rehearsal
- 1080×1920 canvas rendering and WebM export
- Background music with looping and volume control
- Learn With Champak branding
- Portable JSON projects containing images, logo, music and narration
- Browser autosave
- Cover image export

All editing and rendering happens locally in the browser.

For microphone access, use `http://localhost:8000` or HTTPS. Opening
`index.html` directly may prevent recording. Browser-generated speech remains a
rehearsal tool; recorded or uploaded narration is the reliable export method.
