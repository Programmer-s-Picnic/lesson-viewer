# EduShorts Maker — Learn With Champak

Browser-based educational short-video editor. Open `index.html` through an HTTP(S) static web server in a recent Chromium browser.

## Active files

- `index.html` — application interface and controls
- `styles.css` — responsive light-blue theme
- `app.js` — project data, editor, photo reels, camera/video overlays, audio, and standard WebM export
- `speech-captions.js` — captions and highlighted speech words
- `voice-director.js` — expressive voice settings, speech planning and sentence controls
- `auto-tts-export.js` — optional experimental browser TTS screen-audio capture

The superseded `photo-reel.js`, `tts-recorder.js` and `audio-export-fix.js` are intentionally not loaded. Their active functionality is in `app.js`.

## Features

Lesson templates, portrait and landscape video, up to 100 photos per reel, image transitions and movement, webcam or looping video overlay, microphone and uploaded narration, browser speech preview/recording, background music, captions, image cover export, and JSON save/open.

## Natural Voice Studio (Phase 1 + Phase 2)

Speech preview, recorded synthesized narration and optional automatic TTS export now use one rule-based speech director.

- **Speaking styles:** Natural, Warm, Energetic and Calm
- **Advanced settings:** base pitch, voice volume, overall speed, expressiveness, pitch variation and natural pauses
- **Smart narration director:** detects questions, excited statements, cautions, emphasis, invitations and explanations
- **Per-sentence editing:** select a delivery category and an additional post-sentence pause in milliseconds. Use *Reset sentence directions* to return to automatic detection
- **Pronunciation dictionary:** `term = spoken words`, one entry per line, with defaults for common coding terms. It affects audio only, not slide text
- **Persistence:** studio configuration is stored in project JSON and browser autosave; per-sentence overrides are saved on each slide
- **Shared engine:** narration preview, system-audio speech recording and automatic WebM TTS export follow the same rule set

Open **Narration → Natural Voice Studio — advanced settings** to adjust global controls, then **Sentence direction — current slide** for individual sentences.

Browser limitations: Web Speech varies by voice and operating system; pitch, rate and volume can only change between utterances. Word boundaries supplied by the browser are used for caption highlighting; when pronunciation replacements change utterance text length, positions are approximated. The rule-based director does not provide neural emotion synthesis, actual breathing, phoneme-level timing or guaranteed human-quality speech. The experimental automatic export still requires system-audio screen sharing.

## Portable JSON projects and automatically generated screenshots

Choose **Save project + screenshots** to generate a full-slide preview image for every slide before downloading the JSON. Each slide receives a JPEG data URL in `screenshot` and a `screenshotFormat` (vertical/landscape). Pre-existing `image` data URLs, embedded logo, attached audio data, narration text, sentence overrides and the full `state.voiceStudio` configuration remain inside the project. The complete voice configuration also appears in `settings.voiceStudio` to help other tools inspect the project.

Open the saved JSON with **Open project**; it restores original illustrations and narration settings without external image URLs. The generated screenshots are preview assets, not replacements for the original editable slide content. Screen captures are generated whenever the project is saved, not by the audio exporter. A project with many screenshots will be larger than before, and browser storage quotas may limit autosaving.

Example: a selection-sort lesson can carry each illustrated pass as a slide image plus a captured preview under `screenshot`; teacher-like vocal delivery is controlled through `voiceStudio` and `voiceDirections`. Browser voice availability is specific to the machine, so `speechVoice` can be empty to use its default.

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
