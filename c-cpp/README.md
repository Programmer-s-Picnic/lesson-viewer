# Learn With Champak — C/C++ Browser IDE

A static browser IDE for writing, compiling and running C and C++ programs.

## Features

- C (GCC 14.1) and C++ (GCC 14.1)
- Ace code editor with syntax highlighting
- Standard input panel
- Output, compile errors and runtime errors
- Run with Ctrl/Cmd + Enter
- Starter examples
- Local draft autosave
- Source code download and clipboard copy
- Light/dark theme
- Responsive desktop/mobile layout
- Configurable Judge0-compatible execution endpoint
- Falls back to a plain textarea if Ace CDN is unavailable

## Hosting

This is a static site. Upload these files to GitHub Pages, Cloudflare Pages, Netlify, or your own web host:

- `index.html`
- `styles.css`
- `app.js`

Do not open `index.html` only as a local `file://` page if your browser blocks cross-origin requests. Use an HTTP/HTTPS web server.

## Compiler

The default compiler API is:

`https://ce.judge0.com`

The app currently uses Judge0 language IDs:

- C GCC 14.1: `103`
- C++ GCC 14.1: `105`

The endpoint is editable from **Compiler settings**.

For a production/public site, running your own Judge0 instance or proxy is recommended. Never put a private RapidAPI/Judge0 API key directly in frontend JavaScript.
