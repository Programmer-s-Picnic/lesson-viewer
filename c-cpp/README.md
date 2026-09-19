# Learn With Champak — C/C++ Browser IDE

A static browser IDE for writing, compiling and running C and C++ programs, upgraded to mirror the interaction features of the Learn With Champak Python editor.

## Features

- C (GCC 14.1) and C++ (GCC 14.1)
- Ace code editor with syntax highlighting
- Auto indent, bracket/quote pairs, indent/outdent and Ctrl+/ commenting through Ace
- Run with Ctrl/Cmd + Enter
- Stop current compiler/network execution
- stdin, stdout and stderr/error panels
- Expand stdin/stdout/stderr panels
- Code-only full screen and whole-IDE full screen
- Copy stdout
- Optional text-to-speech for stdout and stderr, preferring an Indian English voice when available
- Shareable URL containing code, stdin, selected language, compiler flags and command-line arguments
- Local draft autosave
- Persistent light/dark theme and font size
- Starter examples
- Source code download and clipboard copy
- Compiler flags and command-line arguments
- Recommended compiler flag presets
- Common C/C++ library reference
- Project file upload, download, delete and Download All as ZIP
- Uploaded project files are sent to Judge0 as `additional_files`
- Project files are stored in IndexedDB in the browser
- Remote code loading with `?codefile=...` and `?code=...`
- Teacher/student display support with `?tmode=1` and `?tmode=0`
- Configurable Judge0-compatible execution endpoint
- Responsive desktop/mobile layout
- Plain textarea fallback if Ace cannot load

## Python-editor parity notes

Python's `Install modules` control uses Pyodide/micropip. C and C++ do not have an equivalent browser-side package installer, so this IDE maps that capability to compiler flags, command-line arguments, standard libraries and uploaded header/data files.

Python's Matplotlib plot capture is Python-specific. The C/C++ editor does not pretend to provide Matplotlib output.

Files created inside the remote Judge0 sandbox are temporary and are not returned by the normal Judge0 single-file submission API. Files uploaded in the Project Files panel remain available locally and are supplied again on later runs.

## Hosting

Live path:

`https://editor.learnwithchampak.live/c-cpp/`

This is a static site. Main files:

- `index.html`
- `styles.css`
- `app.js`
- `parity.css`
- `parity.js`
- `cloudflare-worker-proxy.js` (optional)

## Compiler

Default compiler API:

`https://ce.judge0.com`

Language IDs currently used by the app:

- C GCC 14.1: `103`
- C++ GCC 14.1: `105`

For a public production site, a controlled Judge0 instance or server-side proxy is recommended. Never expose private Judge0/RapidAPI credentials in browser JavaScript.
