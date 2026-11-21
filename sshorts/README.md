# EduShorts Maker — Learn With Champak

Browser-based educational short-video editor. Open `index.html` through an HTTP(S) static web server in a recent Chromium browser.

## Active files

- `index.html` — application interface and controls
- `styles.css` — responsive light-blue theme
- `app.js` — project data, editor, photo reels, camera/video overlays, audio, and standard WebM export
- `speech-captions.js` — captions and highlighted speech words
- `voice-director.js` — expressive voice settings, speech planning and sentence controls
- `voice-profiler.js` — local voice-sample analysis, comparison and reusable profiles
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

## Learn voice settings from a recorded sample

Open **Narration → Learn voice settings from my recording**. Choose Classroom Teaching, Storytelling or Quiz Presenter. Read the displayed script aloud for approximately 20–60 seconds, or upload an audio file containing the same words. If uploading an existing recording, replace the script with the exact words spoken. Microphone permissions require HTTPS and user consent.

After stopping the microphone recording or uploading a file, the application decodes and analyzes it **locally in your browser**. The analysis estimates:

- Fundamental frequency (median pitch and interquartile variation, Hertz and semitones) from voiced frames using a YIN-like difference estimator
- Overall RMS and approximate loudness dynamics
- Number and duration of pauses from a relative energy threshold
- Approximate words per minute from the supplied script and detected speech duration (the audio is **not** transcribed or verified)

The proposed browser-TTS controls are automatically applied. Click **Save / replace this voice profile** to store named reusable settings and original measurements in the project, or edit Natural Voice Studio sliders and choose **Update saved profile with edited settings**. Choose a profile later from the Saved profiles dropdown. You can listen to the original recording in its player and then choose **Compare synthesized voice** with the same script.

**JSON persistence:** `state.voiceProfiles` stores the name, class, acoustic measurements, synthesized voice settings, and script for up to three named profiles (one per class). The active profile is `state.activeVoiceProfile`. When **Include the original recording in project JSON** is enabled, audio clips up to 1.25 MB are embedded as data URLs. Larger recordings or unchecked audio-embedding save the measurements and settings only; the reference clip must be selected again for listening after reopening. The selected browser voice and TTS speed are stored in project settings.

**Privacy:** Analysis is browser-local and never sends your recording to a service. Embedded recordings are personal voice data; anyone receiving the JSON can play them. Uncheck the audio embedding option when sharing your lesson.

**Limitations:** A recorded voice cannot be reproduced by ordinary browser TTS. Pitch and dynamics depend on microphone, environment, accent, and the installed synthetic voice. Emotion, timbre, phoneme timing and identity are not cloned. Word-rate accuracy depends on a correct transcript. Noise, music, very short or very quiet recordings can yield weak estimates. Audio samples are restricted to 2–90 seconds and up to 20 MB.

## Save recorded voice and reuse learned narration settings

Open **Narration → Learn voice settings from my recording** to record or upload a voice sample. The expanded **How to use saved voice settings as the synthesized voice** guide provides step-by-step instructions inside the editor.

**Use the actual recording:** After capturing audio, click **Save recorded voice (audio file)** to download the original microphone sound as an audio file. Alternatively choose **Use this recording on current slide** to attach the exact recording to the selected slide as its narration; this replaces existing slide narration and uses the supplied reference script for captions. It does **not** speak the slide's arbitrary new text.

**Use its speaking style for new synthetic words:** Analyze a recording, click **Save / replace this voice profile**, then select it and click **Use settings for synthesized narration**. The browser voice will use the saved pitch/speed/expression/pause controls globally for the project. Choose a compatible browser voice in **Voice**, enter the text to synthesize, and click **Test speech**, **Record synthesized speech**, or use the experimental automatic TTS export. Existing embedded narration clips are unaffected; remove or replace them if you want regenerated synthetic audio.

**Reuse settings in another project:** Click **Save voice settings (.json)** to download a standalone Edushorts voice-style JSON containing settings, measured characteristics, preferred base voice and sample transcript, but **not the reference audio**. In another project click **Load voice settings (.json)**, then **Use settings for synthesized narration**. The import validates the file and offers to replace a profile of the same type. Full project JSON still stores its saved profiles and optionally an embedded reference audio clip.

**Privacy and limits:** A separately downloaded recording contains the person's actual voice and should be shared carefully. A voice settings file cannot clone that voice or play back the original recording. Browser TTS only approximates delivery patterns, and some available voice engines ignore pitch/volume adjustments. Recording playback on a slide and synthesized voice generation are two different operations.

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
