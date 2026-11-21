# EduShorts Maker — Learn With Champak

Browser-based educational short-video editor. Open `index.html` through an HTTP(S) static web server in a recent Chromium browser.

## Active files

- `index.html` — application interface and controls
- `styles.css` — responsive light-blue theme
- `app.js` — project data, editor, photo reels, camera/video overlays, audio, and standard WebM export
- `speech-captions.js` — captions and highlighted speech words
- `auto-tts-export.js` — optional experimental browser TTS screen-audio capture

The superseded `photo-reel.js`, `tts-recorder.js` and `audio-export-fix.js` are intentionally not loaded. Their active functionality is in `app.js`.

## Features

Lesson templates, portrait and landscape video, up to 100 photos per reel, image transitions and movement, webcam or looping video overlay, microphone and uploaded narration, browser speech preview/recording, background music, captions, image cover export, and JSON save/open.

## Export

**Recommended:** Record or upload narration, leave **Automatic synthesized narration during export** unchecked, and click Export. The standard exporter mixes attached audio and background music.

**Experimental automatic TTS:** The optional mode requires an entire-screen share with system audio enabled. System-audio support differs by browser and OS. Unrelated system sounds may be included, and an audio track is not proof that speech was captured. Verify the resulting video before publishing.

Export uses WebM, not MP4. Large projects can consume significant memory; export or save the project JSON regularly. Local autosave is best-effort and can fail if browser storage is full. Uploaded looping overlay videos must be selected again after reopening a project.

## Known limits

- Recorded-audio word highlighting is estimated by timing; it is not a forced-alignment transcript.
- Browser-based real-time canvas recording can drop frames under load; avoid backgrounding the export tab.
- Captions near bottom-positioned video overlays may overlap.
- Web Speech voices and system-audio capture vary between browsers.
- No automated cross-browser end-to-end export suite is included yet.

## Acceptance checks

1. Create a simple slide project; preview and export it with and without audio.
2. Record or upload narration, mix music, and verify the complete export.
3. Test automatic TTS only after checking browser system-audio permissions.
4. Preview portrait and landscape format, captions, and camera overlay.
5. Create a photo reel and verify each photo and transition.
6. Save/open a project and verify the media content.
7. Confirm an unavailable image causes a visible export error.
