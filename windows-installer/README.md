# Windows installer

This folder packages the browser Python Editor as a Windows desktop application.

## Build locally on Windows

1. Install Node.js 22 or later.
2. Open PowerShell in this folder.
3. Run `npm install`.
4. Run `npm run dist:win`.
5. Find the installer in `dist/`.

The installer creates Start Menu and optional desktop shortcuts. The editor uses
its existing **Prepare Offline** button to download and cache Pyodide and the
common data-science packages on first use.
