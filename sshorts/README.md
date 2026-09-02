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

## Complete synthesized speech fix

Synthesized narration no longer advances based only on WebM metadata duration. Preview waits for the narration audio element's actual `ended` event, then holds the slide for five seconds. TTS recording also keeps a 1.2-second capture tail after Web Speech `onend`, protecting the final word from clipping. Export decodes narration first and uses the decoded AudioBuffer duration for slide/timeline timing.

## Final landscape caption position

In landscape/full-screen video, spoken-word subtitles now stay in the lower third just above the footer. A bottom-left or bottom-right webcam/video overlay no longer pushes the entire subtitle block upward; portrait mode still reserves vertical clearance where overlap is more likely.

## Final caption position in both formats

Spoken/highlighted subtitles now stay in the lower third in both landscape and portrait, just above the footer. Bottom camera/video overlays no longer push the subtitle block upward.


## Automatic TTS Export

`Automatic synthesized narration during export` is enabled by default.

Workflow:
1. Click Export once.
2. Choose **Entire Screen**.
3. Enable **Share system audio**.
4. The exporter processes every slide automatically:
   - show the slide
   - wait 3 seconds
   - synthesize that slide's narration
   - show/highlight the spoken words
   - wait for the actual speech `onend`
   - allow a short audio-drain tail so the final phoneme is not clipped
   - hold the completed slide for 5 seconds
   - move to the next slide
5. One WebM file is downloaded when all slides are complete.

The shared-screen video is not included in the output; only its system-audio track is used. Background music is mixed separately. Keep notification and other system sounds quiet while exporting because system-audio capture can include them.

Uncheck the Automatic TTS option to use the existing manual/pre-recorded narration exporter.
