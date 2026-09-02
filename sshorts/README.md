# EduShorts Maker — Complete Replacement Package

Files:
- index.html
- styles.css
- app.js

Main features:
- Educational slide templates
- Typeable subject field
- Photo Reel: 10 recommended, 100 maximum
- Entrance, continuous image-motion and exit animations
- Webcam overlay
- Looping uploaded video overlay instead of webcam
- Overlay position, size, round/rectangle and mirror controls
- Microphone narration
- Uploaded narration
- Browser speech synthesis preview and system-audio recording option
- Background music
- Vertical 1080×1920 and landscape 1920×1080 WebM export
- Project save/open JSON

## Looping video overlay
Open "Camera / looping video overlay".
Choose "Looping video file", select an MP4/WebM, and the clip will autoplay muted and repeat continuously through all slides and export.

Note: the uploaded overlay video is intentionally not embedded in project JSON because large video files can make JSON enormous. Re-select the overlay video after reloading/opening a project.

## Spoken-word highlighting

Narration now uses karaoke-style captions:
- spoken words remain visible while speech/narration is active
- the current word is highlighted with the accent colour
- live browser speech synthesis uses word-boundary events when the browser provides them
- recorded narration, including recorded synthesized speech, is highlighted during preview
- the same captions and highlighting are rendered into exported WebM video

## File controls

Brand logo and background music now use explicit status indicators. After a file is loaded the UI shows `Loaded: filename` instead of the browser's misleading `No file selected` text. The filename status is also restored when a saved project is opened.

## Synthesized-speech timing and subtitle layout

- Synthesized narration starts 3 seconds after the slide has appeared.
- The complete synthesized narration is allowed to finish.
- The completed slide then remains visible for another 5 seconds before advancing.
- Export uses the same timing.
- Karaoke captions use an explicitly left-aligned canvas layout, fixing overlapping words caused by inherited footer alignment.
- Landscape captions use a centered two-line lower-third block; portrait captions use up to three lines.
