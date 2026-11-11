# Cartoon Teacher integration — Python Super Editor

The Cartoon Teacher companion is integrated into the existing Python Super Editor at:

- Editor: https://editor.learnwithchampak.live/python-starter/editor/super/
- Speaker Studio: https://dsa.learnwithchampak.live/tools/cartoon-speaker/

## How to use

1. Open the Python editor, then click **🎓 Cartoon Teacher**.
2. Choose English or Hindi.
3. Click **Explain Code** to narrate the entire program or a highlighted selection.
4. Run a program normally, then click **Read Output** to narrate stdout.
5. If it fails, click **Explain Error** to get common traceback-oriented guidance.
6. Inside the embedded speaker click **Speak script**. The narrator animates using its expression, gesture, volume, pitch, pace and voice settings. Browser voice availability varies by device.
7. Click **Close** to hide the teacher without affecting the editor or its Python worker.

## Architecture

- `index.html` adds an opt-in, collapsible teacher panel and toolbar button.
- `speaker-integration.css` contains its isolated responsive styles.
- `speaker-integration.js` reads editor text, stdout and stderr from existing DOM elements; it does not modify `runCode` or Pyodide workers.
- The frame is loaded only after the teacher is opened; its URL is `https://dsa.learnwithchampak.live/tools/cartoon-speaker/?embed=1`.
- Narration scripts are passed from the editor to the iframe by `window.postMessage` with the explicit target origin `https://dsa.learnwithchampak.live`.
- The speaker only accepts narration messages from the known editor origin (and its known GitHub Pages host) while in embed mode. Incoming text is assigned as a textarea value, not evaluated as code or inserted as HTML.
- The speaker does not execute Python, and the integration does not call an AI API. The code walkthrough uses simple, intentionally limited Python pattern explanations.
- `service-worker.js` cache v9 pre-caches the new CSS/JS and app shell. The updated app registers the refreshed worker.

## Limitations

- The speaker uses the browser's Speech Synthesis API; voice quality, Hindi support, and playback restrictions vary.
- Starting sound inside the frame requires tapping **Speak script**, so browser media-activation rules are respected.
- Long code and output are summarized to avoid excessively long narration; the code run is unchanged.
- Full natural-language reasoning about arbitrary Python programs is not available in this release.
- The external DSA-hosted character requires network access unless separately cached; the Python editor's worker can still run in its existing supported modes.
- No recording, cloud voice cloning or external AI explanations are implemented by this integration.

## Regression checks

Check opening and closing the teacher, code selection narration with original line numbers, stdout and stderr narration, Hindi vs English, voice controls, existing Run/Stop behaviour, files, plots and reel recording. Test on desktop Chrome and Android Chrome.
