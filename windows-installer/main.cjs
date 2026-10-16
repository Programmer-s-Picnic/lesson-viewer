const { app, BrowserWindow, desktopCapturer, session, shell } = require("electron");
const http = require("http");
const fs = require("fs");
const path = require("path");

let server;
let mainWindow;

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".wasm": "application/wasm",
  ".zip": "application/zip"
};

function editorRoot() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "editor")
    : path.join(__dirname, "..", "python-starter", "editor", "super");
}

function startServer() {
  const root = editorRoot();
  server = http.createServer((request, response) => {
    const requestPath = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
    const relative = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
    const file = path.resolve(root, relative);
    if (file !== root && !file.startsWith(root + path.sep)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    fs.readFile(file, (error, data) => {
      if (error) {
        response.writeHead(404, {"Content-Type": "text/plain; charset=utf-8"}).end("Not found");
        return;
      }
      response.writeHead(200, {
        "Content-Type": types[path.extname(file).toLowerCase()] || "application/octet-stream",
        "Cache-Control": "no-cache"
      });
      response.end(data);
    });
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

async function createWindow() {
  const port = await startServer();
  const ses = session.defaultSession;
  ses.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(["media", "display-capture", "fullscreen", "clipboard-sanitized-write"].includes(permission));
  });
  ses.setDisplayMediaRequestHandler(async (_request, callback) => {
    const sources = await desktopCapturer.getSources({types: ["window", "screen"]});
    const ownWindow = sources.find(source => /Python Editor/i.test(source.name));
    callback({video: ownWindow || sources[0], audio: false});
  });

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 900,
    minHeight: 650,
    title: "Learn With Champak Python Editor",
    backgroundColor: "#fff7ed",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  });
  mainWindow.webContents.setWindowOpenHandler(({url}) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return {action: "deny"};
  });
  await mainWindow.loadURL(`http://127.0.0.1:${port}/`);
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
app.on("before-quit", () => { if (server) server.close(); });
