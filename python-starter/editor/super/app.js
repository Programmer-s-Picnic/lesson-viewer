// Programmer's Picnic — Pyodide Editor (Judge v2 + Matplotlib Lessons + Voice Commands + Voice Log)
const $ = (id) => document.getElementById(id);

// ----- URL mode -----
const URLP = new URLSearchParams(location.search);
const TM = URLP.get("tmode");
const TEACHER_UI = TM === "1";
const STUDENT_LOCKED = TM === "0";

// ----- UI refs -----
const ui = {
  tabs: $("ppTabs"),
  code: $("ppCode"),
  out: $("ppOut"),
  gutter: $("ppGutter"),

  err: $("ppErr"),
  stdin: $("ppStdin"),
  example: $("ppExample"),
  indent: $("ppIndent"),
  timer: $("ppTimer"),
  dot: $("ppDot"),
  status: $("ppStatus"),
  bar: $("ppBar"),
  toast: $("ppToast"),

  modeText: $("ppModeText"),
  stuName: $("ppStuName"),
  stuRoll: $("ppStuRoll"),

  packagesCard: $("ppPackagesCard"),
  pkgs: $("ppPkgs"),
  installedPkgs: $("ppInstalledPkgs"),

  problemSel: $("ppProblem"),
  todayBtn: $("ppToday"),
  pTitle: $("ppPTitle"),
  pDesc: $("ppPDesc"),
  pExamples: $("ppPExamples"),
  loadStarter: $("ppLoadStarter"),
  resetStarter: $("ppResetStarter"),
  hintBtn: $("ppHint"),
  runSamples: $("ppRunSamples"),
  runAll: $("ppRunAll"),
  judgeSummary: $("ppJudgeSummary"),
  judgeTableWrap: $("ppJudgeTableWrap"),
  xp: $("ppXP"),
  streak: $("ppStreak"),
  timeout: $("ppTimeout"),

  teacherBtn: $("ppTeacherBtn"),
  teacherPanel: $("ppTeacherPanel"),
  forceClass: $("ppForceClass"),
  examMode: $("ppExamMode"),
  lockProblem: $("ppLockProblem"),
  limitAttemptsOn: $("ppLimitAttemptsOn"),
  allowPkgs: $("ppAllowPkgs"),
  attemptLimit: $("ppAttemptLimit"),
  exportSubs: $("ppExportSubs"),
  clearSubs: $("ppClearSubs"),
  subCount: $("ppSubCount"),
  studentLink: $("ppStudentLink"),

  themeToggle: $("ppThemeToggle"),
  sidebarResizer: $("ppSidebarResizer"),
  panelResizer: $("ppPanelResizer"),
  sidebar: document.getElementById("vsSidebar"),
  panel: document.querySelector(".vs-panel"),

  voiceBtn: $("ppVoiceBtn"),
  voiceStatus: $("ppVoiceStatus"),
  voiceLog: $("ppVoiceLog"),
  voiceClear: $("ppVoiceClear"),
};

const btn = {
  run: $("ppRun"),
  stop: $("ppStop"),
  format: $("ppFormat"),
  save: $("ppSave"),
  share: $("ppShare"),
  newTab: $("ppNewTab"),
  delTab: $("ppDelTab"),
  install: $("ppInstall"),
  list: $("ppList"),
  sample: $("ppStdinSample"),
  clearStdin: $("ppStdinClear"),
  copyOut: $("ppCopyOut"),
  clearOut: $("ppClearOut"),
};

// ----- Storage keys -----
const K_STATE = "pp_editor_v2_state";
const K_STDIN = "pp_editor_v2_stdin";
const K_XP = "pp_xp_v2";
const K_STREAK = "pp_streak_v2";
const K_LASTDAY = "pp_last_day_v2";

const K_CLASS = "pp_classroom_mode_v2";
const K_EXAM = "pp_exam_mode_v2";
const K_LOCK = "pp_lock_problem_v2";
const K_ATT_ON = "pp_attempt_limit_on_v2";
const K_ATT_MAX = "pp_attempt_limit_max_v2";
const K_ALLOW_PKGS = "pp_allow_packages_v2";

const K_STU_NAME = "pp_student_name_v2";
const K_STU_ROLL = "pp_student_roll_v2";
const K_INSTALLED_PKGS = "pp_installed_pkgs_v1";
const K_THEME = "pp_theme_v1";
const K_SIDEBAR_W = "pp_sidebar_width_v1";
const K_PANEL_H = "pp_panel_height_v1";
const K_VOICE_LOG = "pp_voice_log_v1";

const K_PROBLEMS_LOCAL = "pp_problems_custom_v1";
const K_PROBLEMS_REMOTE_CACHE = "pp_problems_remote_cache_v1";
const K_PROBLEMS_REMOTE_URL = "pp_problems_remote_url_v1";
const K_SUBS = "pp_class_submissions_v1";

// ----- Problem loaders -----
function loadCustomProblems() {
  try {
    const raw = localStorage.getItem(K_PROBLEMS_LOCAL);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
function saveCustomProblems(arr) {
  try {
    localStorage.setItem(K_PROBLEMS_LOCAL, JSON.stringify(arr));
  } catch {}
}

function loadRemoteCache() {
  try {
    const raw = localStorage.getItem(K_PROBLEMS_REMOTE_CACHE);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
function saveRemoteCache(url, arr) {
  try {
    localStorage.setItem(K_PROBLEMS_REMOTE_URL, url || "");
    localStorage.setItem(K_PROBLEMS_REMOTE_CACHE, JSON.stringify(arr || []));
  } catch {}
}

function isProblemValid(p) {
  return !!(p && p.id && p.title && p.statement && Array.isArray(p.tests));
}

async function loadProblemsFromURL(url) {
  const u = String(url || "").trim();
  if (!u) return [];
  try {
    const res = await fetch(u, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const arr = await res.json();
    if (!Array.isArray(arr)) throw new Error("JSON must be an array");
    const cleaned = arr.filter(isProblemValid).map((p) => ({
      id: String(p.id),
      title: String(p.title),
      level: String(p.level || "Easy"),
      statement: String(p.statement || ""),
      starter: String(p.starter || "n=int(input())\n# TODO\n"),
      examples: Array.isArray(p.examples) ? p.examples : [],
      tests: Array.isArray(p.tests)
        ? p.tests.map((t) => ({
            input: String(t.input || ""),
            output: String(t.output || ""),
            hidden: !!t.hidden,
          }))
        : [],
      hints: Array.isArray(p.hints) ? p.hints.map(String) : [],
    }));
    saveRemoteCache(u, cleaned);
    return cleaned;
  } catch {
    const cachedURL = localStorage.getItem(K_PROBLEMS_REMOTE_URL) || "";
    if (cachedURL === u) return loadRemoteCache();
    return [];
  }
}

async function loadCodeFromURL(url) {
  const u = String(url || "").trim();
  if (!u) return null;
  try {
    const res = await fetch(u, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const payload = await res.json();

    let tabs = null;
    let currentTabRemote = 0;
    let stdin = "";
    let problem = "";

    if (Array.isArray(payload)) {
      tabs = payload;
    } else if (payload && typeof payload === "object") {
      if (Array.isArray(payload.tabs)) tabs = payload.tabs;
      else if (typeof payload.code === "string") tabs = [{ name: "main.py", code: payload.code }];
      currentTabRemote = payload.currentTab ?? payload.current_tab ?? 0;
      stdin = payload.stdin ?? "";
      problem = payload.problem ?? "";
    }

    if (!Array.isArray(tabs) || !tabs.length) throw new Error("Invalid code JSON");
    tabs = tabs.map((t, i) => ({
      name: String(t?.name || (i === 0 ? "main.py" : "file" + (i + 1) + ".py")),
      code: String(t?.code || ""),
    }));

    return {
      tabs,
      currentTab: currentTabRemote,
      stdin: String(stdin || ""),
      problem: String(problem || ""),
    };
  } catch {
    return null;
  }
}

async function loadTextFileFromURL(url) {
  const u = String(url || "").trim();
  if (!u) return null;
  try {
    const res = await fetch(u, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return String(await res.text());
  } catch {
    return null;
  }
}

// ----- Judge timeout -----
const JUDGE_TIMEOUT_MS = 2500;
ui.timeout.textContent = (JUDGE_TIMEOUT_MS / 1000).toFixed(1);

// ----- Problems -----
const DEFAULT_PROBLEMS = [
  {
    id: "sum_n",
    title: "Sum of N",
    level: "Easy",
    statement: "Given N, print sum of first N natural numbers.",
    starter: "n=int(input())\n# TODO\n# print(ans)\n",
    examples: [{ input: "5\n", output: "15\n" }],
    tests: [
      { input: "10\n", output: "55\n", hidden: false },
      { input: "100\n", output: "5050\n", hidden: true },
      { input: "0\n", output: "0\n", hidden: true },
    ],
    hints: ["Use n*(n+1)//2", "Print only the number"],
  },
  {
    id: "reverse_num",
    title: "Reverse a Number",
    level: "Selection",
    statement: "Given N (0≤N≤1e18), print reversed digits. N=0 => 0.",
    starter: "n=int(input())\n# TODO\n# print(ans)\n",
    examples: [{ input: "1200\n", output: "21\n" }],
    tests: [
      { input: "123456\n", output: "654321\n", hidden: false },
      { input: "9070\n", output: "709\n", hidden: true },
      { input: "0\n", output: "0\n", hidden: true },
    ],
    hints: ["Use while n>0 with %10", "Or use string reverse"],
  },
];

let PROBLEMS = [];

// ----- Examples -----
const EXAMPLES = [
  {
    title: "Hello + loops",
    code: 'print("Hello")\nfor i in range(3):\n    print(i)\n',
  },
  {
    title: "stdin + sum",
    code: "n=int(input())\nt=0\nfor _ in range(n):\n    t+=int(input())\nprint(t)\n",
  },
  {
    title: "📈 Matplotlib Lesson 1 — Line Plot",
    needsPkgs: ["matplotlib"],
    code:
      `import matplotlib.pyplot as plt\n\n` +
      `x = [0,1,2,3,4,5]\n` +
      `y = [i*i for i in x]\n\n` +
      `plt.figure()\n` +
      `plt.plot(x, y, marker="o")\n` +
      `plt.title("y = x^2")\n` +
      `plt.xlabel("x")\n` +
      `plt.ylabel("y")\n` +
      `plt.grid(True)\n` +
      `print("✅ Plot created. See image below.")\n` +
      `plt.show()\n`,
  },
];

const DEFAULT_TABS = [{ name: "main.py", code: 'print("Namaste Champak 👋")\n' }];

// ----- Basic helpers -----
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const esc = (s) =>
  String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

function toast(msg) {
  ui.toast.textContent = msg;
  ui.toast.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => ui.toast.classList.remove("show"), 1600);
}
function setStatus(text, kind) {
  ui.status.textContent = text;
  ui.dot.className = "pp-dot" + (kind ? " " + kind : "");
}
function setProgress(p) {
  ui.bar.style.width = clamp(p, 0, 100) + "%";
}

function loadBool(k, d) {
  try {
    const v = localStorage.getItem(k);
    return v == null ? d : v === "1";
  } catch {
    return d;
  }
}
function saveBool(k, v) {
  try {
    localStorage.setItem(k, v ? "1" : "0");
  } catch {}
}
function loadInt(k, d) {
  try {
    const v = parseInt(localStorage.getItem(k) || "", 10);
    return Number.isFinite(v) ? v : d;
  } catch {
    return d;
  }
}
function saveInt(k, v) {
  try {
    localStorage.setItem(k, String(v));
  } catch {}
}

function normalizeOut(s) {
  s = String(s ?? "").replace(/\r\n/g, "\n");
  s = s
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n");
  s = s.replace(/\s+$/g, "");
  return s + "\n";
}

// ----- Installed package helpers -----
function loadInstalledPkgs() {
  try {
    const raw = localStorage.getItem(K_INSTALLED_PKGS);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
function saveInstalledPkgs(arr) {
  try {
    localStorage.setItem(K_INSTALLED_PKGS, JSON.stringify(arr || []));
  } catch {}
}
function renderInstalledPkgs() {
  if (!ui.installedPkgs) return;
  const arr = loadInstalledPkgs();
  if (!arr.length) {
    ui.installedPkgs.textContent = "—";
    return;
  }
  ui.installedPkgs.innerHTML = arr
    .map((p) => `<span class="pp-kbd" style="margin:0">${esc(p)}</span>`)
    .join(" ");
}

// ----- Voice log helpers -----
function loadVoiceLog() {
  try {
    const raw = localStorage.getItem(K_VOICE_LOG);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveVoiceLog(list) {
  try {
    localStorage.setItem(K_VOICE_LOG, JSON.stringify(list));
  } catch {}
}

function renderVoiceLog() {
  if (!ui.voiceLog) return;
  const list = loadVoiceLog();

  if (!list.length) {
    ui.voiceLog.innerHTML = `<div class="vs-small">No voice commands yet.</div>`;
    return;
  }

  ui.voiceLog.innerHTML = list
    .map(
      (item) => `
        <div class="pp-voice-item">
          <div class="pp-voice-meta">${esc(item.time || "")}</div>
          <div><b>Heard:</b> ${esc(item.heard || "")}</div>
          <div><b>Normalized:</b> ${esc(item.normalized || "")}</div>
          <div><b>Status:</b> <span class="${item.ok ? "pp-voice-ok" : "pp-voice-bad"}">${esc(item.action || "unknown")}</span></div>
        </div>
      `,
    )
    .join("");
}

function addVoiceLog(heard, normalized, action, ok) {
  const list = loadVoiceLog();
  list.unshift({
    time: new Date().toLocaleString(),
    heard: String(heard || ""),
    normalized: String(normalized || ""),
    action: String(action || ""),
    ok: !!ok,
  });
  const trimmed = list.slice(0, 50);
  saveVoiceLog(trimmed);
  renderVoiceLog();
}

// ----- Theme / layout helpers -----
function applyTheme(theme) {
  const t = theme === "light" ? "light" : "dark";
  document.body.setAttribute("data-theme", t);
  try {
    localStorage.setItem(K_THEME, t);
  } catch {}
  if (ui.themeToggle) ui.themeToggle.textContent = t === "light" ? "☀️ Light" : "🌙 Dark";
}

function toggleTheme() {
  const cur = document.body.getAttribute("data-theme") || "dark";
  applyTheme(cur === "dark" ? "light" : "dark");
}

function setSidebarWidth(px) {
  if (!ui.sidebar) return;
  const w = clamp(px, 220, 520);
  ui.sidebar.style.width = w + "px";
  ui.sidebar.style.minWidth = w + "px";
  ui.sidebar.style.maxWidth = w + "px";
  try {
    localStorage.setItem(K_SIDEBAR_W, String(w));
  } catch {}
}

function setPanelHeight(px) {
  if (!ui.panel) return;
  const h = clamp(px, 180, Math.max(260, window.innerHeight - 140));
  ui.panel.style.height = h + "px";
  try {
    localStorage.setItem(K_PANEL_H, String(h));
  } catch {}
}

function wireDragResize(handle, onMove, className) {
  if (!handle) return;
  const start = (ev) => {
    if (window.matchMedia("(max-width: 980px)").matches && handle === ui.sidebarResizer) return;
    ev.preventDefault();
    document.body.classList.add(className);
    const move = (e) => onMove(e);
    const stop = () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", stop);
      document.body.classList.remove(className);
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", stop);
  };
  handle.addEventListener("pointerdown", start);
}

function lineBounds(value, start, end) {
  const ls = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const next = value.indexOf("\n", end);
  const le = next === -1 ? value.length : next;
  return [ls, le];
}

function toggleCommentSelection() {
  const el = ui.code;
  const v = el.value;
  const s = el.selectionStart;
  const t = el.selectionEnd;
  const [ls, le] = lineBounds(v, s, t);
  const lines = v.slice(ls, le).split("\n");
  const nonEmpty = lines.filter((line) => line.trim());
  const uncomment = nonEmpty.length > 0 && nonEmpty.every((line) => /^\s*#/.test(line));
  const updated = lines
    .map((line) => {
      if (!line.trim()) return line;
      if (uncomment) return line.replace(/^(\s*)# ?/, "$1");
      return line.replace(/^(\s*)/, "$1# ");
    })
    .join("\n");
  el.value = v.slice(0, ls) + updated + v.slice(le);
  el.selectionStart = ls;
  el.selectionEnd = ls + updated.length;
  updateGutter();
  autosave();
  toast(uncomment ? "Uncommented" : "Commented");
}

function getIndentUnit() {
  const mode = ui.indent.value;
  return mode === "tab" ? "\t" : " ".repeat(parseInt(mode, 10) || 4);
}

function handleSmartEnter(e) {
  if (e.key !== "Enter") return false;
  e.preventDefault();

  const el = ui.code;
  const value = el.value;
  const start = el.selectionStart;
  const end = el.selectionEnd;

  const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const lineEndIndex = value.indexOf("\n", start);
  const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;

  const beforeCursor = value.slice(lineStart, start);
  const afterCursor = value.slice(start, lineEnd);
  const currentLine = value.slice(lineStart, lineEnd);

  const indentMatch = currentLine.match(/^[\t ]*/);
  const currentIndent = indentMatch ? indentMatch[0] : "";
  const indentUnit = getIndentUnit();

  let nextIndent = currentIndent;

  if (beforeCursor.trimEnd().endsWith(":")) {
    nextIndent += indentUnit;
  }

  const shouldOutdentClosing =
    /^[\t ]*[\]\)\}]/.test(afterCursor) && nextIndent.length >= indentUnit.length;

  if (shouldOutdentClosing) {
    if (indentUnit === "\t") {
      if (nextIndent.endsWith("\t")) nextIndent = nextIndent.slice(0, -1);
    } else if (nextIndent.endsWith(indentUnit)) {
      nextIndent = nextIndent.slice(0, -indentUnit.length);
    }
  }

  el.setRangeText("\n" + nextIndent, start, end, "end");
  updateGutter();
  autosave();
  return true;
}

function handleSmartBackspace(e) {
  if (e.key !== "Backspace") return false;

  const el = ui.code;
  const start = el.selectionStart;
  const end = el.selectionEnd;
  if (start !== end) return false;

  const value = el.value;
  const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const beforeCursor = value.slice(lineStart, start);

  if (!/^[\t ]+$/.test(beforeCursor)) return false;

  const indentUnit = getIndentUnit();

  if (indentUnit === "\t") {
    if (!beforeCursor.endsWith("\t")) return false;
    e.preventDefault();
    el.setRangeText("", start - 1, start, "end");
    updateGutter();
    autosave();
    return true;
  }

  const spaces = indentUnit.length;
  const removeCount = beforeCursor.length % spaces || spaces;
  e.preventDefault();
  el.setRangeText("", start - removeCount, start, "end");
  updateGutter();
  autosave();
  return true;
}

// ----- Voice commands -----
let recognition = null;
let voiceSupported = false;
let voiceListening = false;

function normalizeSpeech(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[.,!?]/g, "")
    .replace(/\s+/g, " ");
}

function updateVoiceUI(stateText, btnText) {
  if (ui.voiceStatus) ui.voiceStatus.textContent = stateText;
  if (ui.voiceBtn) ui.voiceBtn.textContent = btnText;
}

function handleVoiceCommand(text) {
  const raw = String(text || "").trim();
  const cmd = normalizeSpeech(raw);

  if (!cmd) {
    addVoiceLog(raw, cmd, "empty", false);
    return;
  }

  const runWords = new Set(["run", "ran", "one", "start", "execute", "play"]);
  const stopWords = new Set(["stop", "halt", "cancel"]);
  const saveWords = new Set(["save"]);
  const formatWords = new Set(["format"]);
  const clearWords = new Set(["clear output"]);
  const newTabWords = new Set(["new tab"]);
  const starterWords = new Set(["load starter"]);

  if (
    runWords.has(cmd) ||
    cmd.startsWith("run ") ||
    cmd === "run code" ||
    cmd === "execute code" ||
    cmd === "start code"
  ) {
    addVoiceLog(raw, cmd, "run", true);
    toast("Voice: run");
    run();
    return;
  }

  if (stopWords.has(cmd) || cmd === "stop code") {
    addVoiceLog(raw, cmd, "stop", true);
    toast("Voice: stop");
    stop();
    return;
  }

  if (saveWords.has(cmd) || cmd === "save code") {
    state.tabs[currentTab].code = ui.code.value;
    saveState();
    localStorage.setItem(K_STDIN, ui.stdin.value || "");
    addVoiceLog(raw, cmd, "save", true);
    toast("Voice: saved");
    return;
  }

  if (formatWords.has(cmd) || cmd === "format code") {
    basicFormat();
    addVoiceLog(raw, cmd, "format", true);
    toast("Voice: format");
    return;
  }

  if (newTabWords.has(cmd)) {
    newTab();
    addVoiceLog(raw, cmd, "new tab", true);
    toast("Voice: new tab");
    return;
  }

  if (clearWords.has(cmd)) {
    renderOut("", []);
    ui.err.textContent = "";
    addVoiceLog(raw, cmd, "clear output", true);
    toast("Voice: cleared output");
    return;
  }

  if (starterWords.has(cmd)) {
    const p = getProblem(currentProblemId);
    if (!p) {
      addVoiceLog(raw, cmd, "load starter failed", false);
      toast("Pick a problem first");
      return;
    }
    ui.code.value = p.starter;
    updateGutter();
    autosave();
    addVoiceLog(raw, cmd, "load starter", true);
    toast("Voice: starter loaded");
    return;
  }

  addVoiceLog(raw, cmd, "not recognized", false);
  toast("Voice command not recognized: " + cmd);
}

function stopVoiceRecognition() {
  if (recognition && voiceListening) {
    try {
      recognition.stop();
    } catch {}
  }
}

function startVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    voiceSupported = false;
    updateVoiceUI("Voice: unsupported", "🎤 Voice");
    toast("Voice recognition not supported in this browser");
    return;
  }

  voiceSupported = true;

  if (!recognition) {
    recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      voiceListening = true;
      updateVoiceUI("Voice: listening", "🛑 Stop Voice");
      toast("Voice listening");
    };

    recognition.onend = () => {
      voiceListening = false;
      updateVoiceUI("Voice: ready", "🎤 Voice");
    };

    recognition.onerror = (e) => {
      updateVoiceUI("Voice: error", "🎤 Voice");
      toast("Voice error: " + (e.error || "unknown"));
    };

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result.isFinal) continue;

        const all = [];
        for (let j = 0; j < result.length; j++) {
          all.push(result[j].transcript || "");
        }

        const transcript = all[0] || "";
        handleVoiceCommand(transcript);
      }
    };
  }

  try {
    recognition.start();
  } catch {}
}

function toggleVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!voiceSupported && !SpeechRecognition) {
    startVoiceRecognition();
    return;
  }
  if (voiceListening) stopVoiceRecognition();
  else startVoiceRecognition();
}

// ----- Output renderer -----
let _lastStdout = "";
let _lastPlots = [];
let _activePlotFullscreen = null;

function togglePlotFullscreen(img) {
  if (!img) return;
  const isActive = img.classList.contains("pp-plot-fullscreen");
  document.querySelectorAll(".pp-plot-fullscreen").forEach((el) => {
    el.classList.remove("pp-plot-fullscreen");
    el.setAttribute("aria-expanded", "false");
  });
  if (isActive) {
    _activePlotFullscreen = null;
    document.body.classList.remove("pp-plot-has-fullscreen");
    return;
  }
  img.classList.add("pp-plot-fullscreen");
  img.setAttribute("aria-expanded", "true");
  _activePlotFullscreen = img;
  document.body.classList.add("pp-plot-has-fullscreen");
}

function closeFullscreenPlot() {
  if (!_activePlotFullscreen) return;
  _activePlotFullscreen.classList.remove("pp-plot-fullscreen");
  _activePlotFullscreen.setAttribute("aria-expanded", "false");
  _activePlotFullscreen = null;
  document.body.classList.remove("pp-plot-has-fullscreen");
}

function renderOut(stdoutText, plots = []) {
  closeFullscreenPlot();
  _lastStdout = String(stdoutText || "");
  _lastPlots = Array.isArray(plots) ? plots : [];

  ui.out.innerHTML = "";

  const pre = document.createElement("pre");
  pre.className = "pp-mono pp-pre";
  pre.style.margin = "0";
  pre.textContent = _lastStdout;
  ui.out.appendChild(pre);

  if (_lastPlots.length) {
    const wrap = document.createElement("div");
    wrap.className = "pp-plots-wrap";

    _lastPlots.forEach((src, i) => {
      const card = document.createElement("div");
      card.className = "pp-plot-card";

      const head = document.createElement("div");
      head.className = "pp-plot-head pp-small";
      head.textContent = `Plot #${i + 1} • double-click to fullscreen`;

      const img = document.createElement("img");
      img.alt = `plot ${i + 1}`;
      img.src = src;
      img.className = "pp-plot-img";
      img.loading = "lazy";
      img.decoding = "async";
      img.tabIndex = 0;
      img.setAttribute("role", "button");
      img.setAttribute("aria-label", `Plot ${i + 1}. Double-click to toggle fullscreen.`);
      img.setAttribute("aria-expanded", "false");
      img.addEventListener("dblclick", () => togglePlotFullscreen(img));
      img.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          togglePlotFullscreen(img);
        }
      });

      card.appendChild(head);
      card.appendChild(img);
      wrap.appendChild(card);
    });

    ui.out.appendChild(wrap);
  }

  ui.out.scrollTop = ui.out.scrollHeight;
}

// ----- State -----
function loadState() {
  try {
    const raw = localStorage.getItem(K_STATE);
    const p = raw ? JSON.parse(raw) : null;
    if (p && Array.isArray(p.tabs) && p.tabs.length) return p;
  } catch {}
  return { tabs: structuredClone(DEFAULT_TABS), currentTab: 0 };
}
let state = loadState();
let currentTab = clamp(state.currentTab || 0, 0, state.tabs.length - 1);
let currentProblemId = null;
let currentStarter = null;

// ----- Classroom flags -----
let classroomMode = loadBool(K_CLASS, false);
let examMode = loadBool(K_EXAM, false);
let lockProblem = loadBool(K_LOCK, false);
let attemptLimitOn = loadBool(K_ATT_ON, false);
let attemptLimitMax = loadInt(K_ATT_MAX, 5);
let allowPackages = loadBool(K_ALLOW_PKGS, true);

if (STUDENT_LOCKED) {
  classroomMode = true;
  allowPackages = true;
}

// ----- Submissions -----
function loadSubs() {
  try {
    return JSON.parse(localStorage.getItem(K_SUBS) || "[]");
  } catch {
    return [];
  }
}
function saveSubs(list) {
  try {
    localStorage.setItem(K_SUBS, JSON.stringify(list));
  } catch {}
}
function addSub(entry) {
  const list = loadSubs();
  list.push(entry);
  saveSubs(list);
  updateSubCount();
}
function clearSubs() {
  saveSubs([]);
  updateSubCount();
}
function updateSubCount() {
  if (ui.subCount) ui.subCount.textContent = String(loadSubs().length);
}

// ----- XP/streak -----
function dayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}
function getXP() {
  return parseInt(localStorage.getItem(K_XP) || "0", 10) || 0;
}
function setXP(v) {
  localStorage.setItem(K_XP, String(v));
  ui.xp.textContent = String(v);
}
function getStreak() {
  return parseInt(localStorage.getItem(K_STREAK) || "0", 10) || 0;
}
function setStreak(v) {
  localStorage.setItem(K_STREAK, String(v));
  ui.streak.textContent = String(v);
}
function updateStreakOnSolve() {
  const today = dayKey();
  const last = localStorage.getItem(K_LASTDAY) || "";
  if (last === today) return;
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const streak = last === dayKey(y) ? getStreak() + 1 : 1;
  localStorage.setItem(K_LASTDAY, today);
  setStreak(streak);
}

// ----- Student details -----
function loadStudent() {
  ui.stuName.value = localStorage.getItem(K_STU_NAME) || "";
  ui.stuRoll.value = localStorage.getItem(K_STU_ROLL) || "";
}
function saveStudent() {
  localStorage.setItem(K_STU_NAME, ui.stuName.value || "");
  localStorage.setItem(K_STU_ROLL, ui.stuRoll.value || "");
}
ui.stuName.addEventListener("input", saveStudent);
ui.stuRoll.addEventListener("input", saveStudent);

// ----- Tabs -----
function saveState() {
  try {
    localStorage.setItem(K_STATE, JSON.stringify({ tabs: state.tabs, currentTab }));
  } catch {}
}
function renderTabs() {
  ui.tabs.innerHTML = "";
  state.tabs.forEach((t, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "pp-tab" + (i === currentTab ? " pp-active" : "");
    b.textContent = t.name;
    b.onclick = () => switchTab(i);
    ui.tabs.appendChild(b);
  });

  ui.example.innerHTML =
    `<option value="">Examples…</option>` +
    EXAMPLES.map((e, i) => `<option value="${i}">${e.title}</option>`).join("");
}
function switchTab(i) {
  state.tabs[currentTab].code = ui.code.value;
  currentTab = clamp(i, 0, state.tabs.length - 1);
  ui.code.value = state.tabs[currentTab].code || "";
  renderTabs();
  updateGutter();
  saveState();
}
function newTab() {
  state.tabs[currentTab].code = ui.code.value;
  const names = new Set(state.tabs.map((t) => t.name));
  let n = 1, name = `untitled${n}.py`;
  while (names.has(name)) {
    n++;
    name = `untitled${n}.py`;
  }
  state.tabs.push({ name, code: "# new file\n" });
  currentTab = state.tabs.length - 1;
  ui.code.value = state.tabs[currentTab].code;
  renderTabs();
  updateGutter();
  saveState();
  toast("New tab");
}
function delTab() {
  if (state.tabs.length <= 1) return toast("Can't delete last tab");
  state.tabs[currentTab].code = ui.code.value;
  state.tabs.splice(currentTab, 1);
  currentTab = clamp(currentTab, 0, state.tabs.length - 1);
  ui.code.value = state.tabs[currentTab].code || "";
  renderTabs();
  updateGutter();
  saveState();
  toast("Deleted");
}
function updateGutter() {
  const lines = ui.code.value.split("\n").length || 1;
  let s = "";
  for (let i = 1; i <= lines; i++) s += i + "\n";
  ui.gutter.textContent = s.trimEnd();
  ui.gutter.scrollTop = ui.code.scrollTop;
}
ui.code.addEventListener("scroll", () => (ui.gutter.scrollTop = ui.code.scrollTop));
ui.code.addEventListener("input", () => {
  updateGutter();
  autosave();
});

let autosaveT = null;
function autosave() {
  clearTimeout(autosaveT);
  autosaveT = setTimeout(() => {
    state.tabs[currentTab].code = ui.code.value;
    saveState();
  }, 200);
}

function basicFormat() {
  const mode = ui.indent.value;
  const tabToSpaces = mode !== "tab";
  const spaceCount = parseInt(mode, 10) || 4;
  const out =
    ui.code.value
      .split("\n")
      .map((l) => {
        let x = l.replace(/\s+$/g, "");
        if (tabToSpaces) x = x.replace(/\t/g, " ".repeat(spaceCount));
        return x;
      })
      .join("\n") + "\n";
  ui.code.value = out;
  updateGutter();
  autosave();
  toast("Formatted");
}

// ----- Problems -----
function getProblem(id) {
  return PROBLEMS.find((p) => p.id === id) || null;
}
function renderProblems() {
  ui.problemSel.innerHTML = PROBLEMS.map(
    (p) => `<option value="${p.id}">${p.title} • ${p.level}</option>`,
  ).join("");
}
function pickToday() {
  const d = new Date();
  const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  return PROBLEMS[seed % PROBLEMS.length].id;
}
function showProblem(id) {
  const p = getProblem(id);
  if (!p) return;
  currentProblemId = id;
  currentStarter = p.starter;
  ui.pTitle.textContent = `${p.title} • ${p.level}`;
  ui.pDesc.textContent = p.statement;
  ui.pExamples.style.display = examMode ? "none" : "block";
  ui.pExamples.textContent = p.examples
    .map((e) => `INPUT:\n${e.input}\nOUTPUT:\n${e.output}`)
    .join("\n\n---\n\n");
  ui.judgeSummary.textContent = "";
  ui.judgeTableWrap.innerHTML = "";
  ui.problemSel.disabled = STUDENT_LOCKED && lockProblem;
}

// ----- Attempt limit -----
const attKey = (pid) => `pp_attempts_${pid}_v1`;
const attUsed = (pid) => parseInt(localStorage.getItem(attKey(pid)) || "0", 10) || 0;
const attInc = (pid) => {
  const u = attUsed(pid) + 1;
  localStorage.setItem(attKey(pid), String(u));
  return u;
};
const canAttempt = (pid) => !attemptLimitOn || attUsed(pid) < attemptLimitMax;

// ----- Worker judge -----
let worker = null,
  pendingResolve = null,
  pendingReject = null,
  runTimer = null;
let packagesInstalled = false;
let installBusy = false;

function classPolicy() {
  const pkgOK = !!allowPackages;
  return {
    disable_open: classroomMode,
    disable_eval_exec: false,
    block_imports: classroomMode && !pkgOK,
    allow_imports: classroomMode && !pkgOK ? ["math", "random", "re", "statistics"] : [],
    allow_micropip: pkgOK,
  };
}
function makeWorker(force = false) {
  if (worker && !force && packagesInstalled) return;
  if (worker) worker.terminate();
  worker = new Worker("./judge-worker.js");
  worker.onmessage = (ev) => {
    const msg = ev.data || {};
    if (msg.type === "READY") {
      setStatus("Judge worker ready.", "ok");
      return;
    }
    if (msg.type === "RUN_RESULT") {
      clearTimeout(runTimer);
      pendingResolve?.(msg.result);
      pendingResolve = pendingReject = null;
      return;
    }
    if (msg.type === "PKG_LIST") {
      renderOut(msg.text || "", []);
      return;
    }
    if (msg.type === "INSTALLED") {
      installBusy = false;
      try { btn.install.disabled = false; } catch {}
      packagesInstalled = true;

      try {
        const prev = new Set(loadInstalledPkgs());
        (msg.pkgs || []).forEach((p) => prev.add(String(p)));
        saveInstalledPkgs(Array.from(prev).sort());
        renderInstalledPkgs();
      } catch {}

      renderOut("Installed: " + (msg.pkgs || []).join(", ") + "\n", []);
      setStatus("Installed.", "ok");
      toast("Installed");
      return;
    }
    if (msg.type === "ERR") {
      installBusy = false;
      try { btn.install.disabled = false; } catch {}
      clearTimeout(runTimer);
      pendingReject?.(new Error(msg.message || "Worker error"));
      pendingResolve = pendingReject = null;
    }
  };
  worker.postMessage({ type: "INIT", policy: classPolicy() });
}

function runInWorker(code, stdin) {
  return new Promise((resolve, reject) => {
    pendingResolve = resolve;
    pendingReject = reject;
    worker.postMessage({ type: "RUN_ONE", code, stdin, policy: classPolicy() });
    runTimer = setTimeout(() => {
      worker.terminate();
      worker = null;
      makeWorker(true);
      reject(new Error("TIMEOUT"));
    }, JUDGE_TIMEOUT_MS);
  });
}

// ----- Run -----
async function run() {
  btn.run.disabled = true;
  btn.stop.disabled = false;

  renderOut("— Running —\n", []);
  ui.err.textContent = "";

  state.tabs[currentTab].code = ui.code.value;
  saveState();
  try {
    setStatus("Running…", "warn");
    const t0 = performance.now();
    const r = await runInWorker(ui.code.value || "", ui.stdin.value || "");
    const t1 = performance.now();

    const plots = Array.isArray(r.plots) ? r.plots : [];
    renderOut(r.stdout || "", plots);

    ui.err.textContent = r.stderr ? "— stderr —\n" + (r.stderr || "") : "";
    if (!r.ok) {
      ui.err.textContent += (r.error || "Runtime error") + "\n";
      setStatus("Error.", "bad");
    } else {
      setStatus("Done.", "ok");
    }

    if (ui.timer.checked) {
      renderOut((r.stdout || "") + `\n✓ Done (${Math.round(t1 - t0)} ms)\n`, plots);
    } else {
      renderOut((r.stdout || "") + "\n✓ Done\n", plots);
    }
  } catch (err) {
    const isTimeout = String(err?.message || "").includes("TIMEOUT");
    ui.err.textContent = isTimeout
      ? "✗ Timeout (infinite loop?)\n"
      : "✗ " + (err?.message || String(err)) + "\n";
    setStatus("Error.", "bad");
  } finally {
    btn.run.disabled = false;
    btn.stop.disabled = true;
  }
}
function stop() {
  if (worker) worker.terminate();
  worker = null;
  makeWorker(true);
  setStatus("Stopped.", "warn");
  toast("Stopped");
}

// ----- Judge UI -----
async function runJudge(testList, label) {
  const p = getProblem(currentProblemId);
  if (!p) return toast("Pick a problem");
  if (STUDENT_LOCKED && attemptLimitOn && !canAttempt(currentProblemId)) {
    return toast(`Attempt limit reached (${attemptLimitMax}).`);
  }

  ui.judgeSummary.textContent = "Running tests…";
  ui.judgeTableWrap.innerHTML = "";
  ui.runSamples.disabled = true;
  ui.runAll.disabled = true;

  state.tabs[currentTab].code = ui.code.value;
  saveState();

  const code = ui.code.value || "";
  let pass = 0;
  const rows = [];

  for (let i = 0; i < testList.length; i++) {
    const t = testList[i];
    const name = t.hidden ? `Hidden #${i + 1}` : `Test #${i + 1}`;
    try {
      const r = await runInWorker(code, t.input);

      const got = normalizeOut(r.stdout || "");
      const exp = normalizeOut(t.output);
      const ok = r.ok === true && got === exp;

      if (ok) pass++;
      rows.push({
        name,
        hidden: !!t.hidden,
        ok,
        input: t.input,
        expected: t.output,
        got,
        error: r.ok ? "" : r.error || "Runtime error",
        stderr: r.stderr || "",
      });
    } catch (err) {
      const isTimeout = String(err?.message || "").includes("TIMEOUT");
      rows.push({
        name,
        hidden: !!t.hidden,
        ok: false,
        input: t.input,
        expected: t.output,
        got: "",
        error: isTimeout ? "Timeout (infinite loop?)" : err?.message || String(err),
        stderr: "",
      });
    }
  }

  const total = testList.length;
  const score = Math.round((pass / total) * 100);
  ui.judgeSummary.innerHTML = `<b>${label}:</b> <span style="font-weight:900">${pass}/${total}</span> • Score: <b>${score}</b>`;

  const table = document.createElement("table");
  table.className = "pp-table";
  table.innerHTML = `<thead><tr><th style="width:90px">Result</th><th>Details</th><th style="width:90px">Status</th></tr></thead><tbody></tbody>`;
  const tb = table.querySelector("tbody");

  rows.forEach((r) => {
    const tr = document.createElement("tr");
    const showExpected = !examMode && !r.hidden;
    const expText = showExpected ? esc(r.expected) : "(hidden)";
    const gotText = r.hidden && r.ok ? "(hidden)" : esc(r.got);
    tr.innerHTML = `
      <td><b>${r.ok ? "✅" : "❌"}</b></td>
      <td>
        <div class="pp-small">${esc(r.name)} ${r.hidden ? "• hidden" : ""}</div>
        <div style="margin-top:6px"><b>Input</b><pre class="pp-mono pp-pre">${esc(r.input)}</pre></div>
        ${
          showExpected
            ? `<div style="margin-top:8px"><b>Expected</b><pre class="pp-mono pp-pre">${expText}</pre></div>`
            : ""
        }
        <div style="margin-top:8px"><b>Got (stdout)</b><pre class="pp-mono pp-pre">${gotText}</pre></div>
        ${
          r.stderr
            ? `<div style="margin-top:8px"><b>stderr</b><pre class="pp-mono pp-pre">${esc(r.stderr)}</pre></div>`
            : ""
        }
        ${
          r.error
            ? `<div style="margin-top:8px"><b style="color:#b91c1c">Error</b><pre class="pp-mono pp-pre" style="border-color:#f3c7c7;background:rgba(185,28,28,.06)">${esc(r.error)}</pre></div>`
            : ""
        }
      </td>
      <td>${r.ok ? `<span style="color:var(--pp-ok,#16a34a);font-weight:900">PASS</span>` : `<span style="color:var(--pp-bad,#dc2626);font-weight:900">FAIL</span>`}</td>
    `;
    tb.appendChild(tr);
  });

  ui.judgeTableWrap.innerHTML = "";
  ui.judgeTableWrap.appendChild(table);

  if (pass === total) {
    const gained = 25 + total * 5;
    setXP(getXP() + gained);
    updateStreakOnSolve();
    toast(`🏆 All tests passed! +${gained} XP`);
  } else {
    const gained = Math.max(5, pass * 3);
    setXP(getXP() + gained);
    toast(`Keep going! +${gained} XP`);
  }

  if (STUDENT_LOCKED || (TEACHER_UI && classroomMode)) {
    const usedNow = attemptLimitOn ? attInc(currentProblemId) : attUsed(currentProblemId);
    addSub({
      name: (ui.stuName.value || "").trim() || "Unknown",
      roll: (ui.stuRoll.value || "").trim() || "NA",
      problem: currentProblemId,
      score,
      pass,
      total,
      attempts_used: usedNow,
      attempt_limit: attemptLimitOn ? attemptLimitMax : null,
      exam_mode: !!examMode,
      timestamp: new Date().toISOString(),
      code,
    });
    if (STUDENT_LOCKED && attemptLimitOn) {
      toast(`Submitted. Attempts left: ${Math.max(0, attemptLimitMax - usedNow)}`);
    }
  }

  ui.runSamples.disabled = false;
  ui.runAll.disabled = false;
}

// ----- Packages -----
function installPkgs() {
  if (!allowPackages) return toast("Packages disabled");
  if (installBusy) return toast("Install already running");
  const raw = (ui.pkgs.value || "").trim();
  if (!raw) return toast("No packages");

  const pkgs = raw
    .split(/[, ]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  installBusy = true;
  try { btn.install.disabled = true; } catch {}

  renderOut("— Installing —\n", []);
  ui.err.textContent = "";
  setStatus("Installing…", "warn");
  worker.postMessage({ type: "INSTALL", pkgs, policy: classPolicy() });
  toast("Install requested");
}
function listPkgs() {
  renderOut("— Installed packages —\n", []);
  ui.err.textContent = "";
  worker.postMessage({ type: "LIST_PKGS" });
}

// ----- Share modal -----
const shareUI = {
  modal: document.getElementById("ppShareModal"),
  input: document.getElementById("ppShareInput"),
  copy: document.getElementById("ppShareCopy"),
  open: document.getElementById("ppShareOpen"),
  close: document.getElementById("ppShareClose"),
  hint: document.getElementById("ppShareHint"),
};

function openShareModal(url, hint = "") {
  if (!shareUI.modal || !shareUI.input) {
    console.log("Share link:", url);
    toast("Share link in console");
    return;
  }
  shareUI.input.value = url;
  shareUI.open.href = url;
  shareUI.hint.textContent = hint || "";
  shareUI.modal.style.display = "block";
  shareUI.modal.setAttribute("aria-hidden", "false");
  setTimeout(() => shareUI.input.select(), 0);
}

function closeShareModal() {
  if (!shareUI.modal) return;
  shareUI.modal.style.display = "none";
  shareUI.modal.setAttribute("aria-hidden", "true");
}

shareUI?.close?.addEventListener("click", closeShareModal);
shareUI?.modal?.addEventListener("click", (e) => {
  if (e.target?.dataset?.close) closeShareModal();
});
shareUI?.copy?.addEventListener("click", async () => {
  const url = shareUI.input.value || "";
  try {
    await navigator.clipboard.writeText(url);
    toast("Copied");
    shareUI.hint.textContent = "Copied ✓";
  } catch {
    shareUI.hint.textContent =
      "Copy failed (browser blocked clipboard). Select and copy manually.";
  }
});

// ----- Share -----
async function share() {
  state.tabs[currentTab].code = ui.code.value;

  const payload = {
    tabs: state.tabs,
    currentTab,
    stdin: ui.stdin.value || "",
    problem: currentProblemId || "",
  };

  const json = JSON.stringify(payload);
  const b64 = btoa(unescape(encodeURIComponent(json)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");

  location.hash = "#pp=" + b64;
  const url = location.origin + location.pathname + location.search + "#pp=" + b64;

  if (navigator.share) {
    try {
      await navigator.share({ title: document.title, url });
      toast("Shared");
      return;
    } catch {}
  }

  try {
    await navigator.clipboard.writeText(url);
    toast("Share link copied");
  } catch {
    openShareModal(url, "Select the link and press Ctrl+C if Copy is blocked.");
  }
}

function loadFromHash() {
  const h = location.hash || "";
  if (!h.startsWith("#pp=")) return;

  const enc = h.slice(4);
  if (!enc) return;

  try {
    let b64 = enc.replaceAll("-", "+").replaceAll("_", "/");
    while (b64.length % 4) b64 += "=";

    const json = decodeURIComponent(escape(atob(b64)));
    const payload = JSON.parse(json);

    if (payload?.tabs?.length) {
      state.tabs = payload.tabs;
      currentTab = clamp(payload.currentTab || 0, 0, state.tabs.length - 1);
      ui.stdin.value = payload.stdin || "";
      ui.code.value = state.tabs[currentTab].code || "";
      saveState();
      localStorage.setItem(K_STDIN, ui.stdin.value || "");
    }
    if (payload?.problem) currentProblemId = payload.problem;
  } catch {}
}

// ----- Teacher panel -----
function applyModeUI() {
  ui.modeText.textContent = TEACHER_UI
    ? "Teacher (tmode=1)"
    : STUDENT_LOCKED
      ? "Student (tmode=0)"
      : "Practice";

  ui.teacherBtn.style.display = TEACHER_UI ? "inline-flex" : "none";
  ui.teacherBtn.style.visibility = TEACHER_UI ? "visible" : "hidden";
  ui.teacherPanel.style.display = TEACHER_UI ? "block" : "none";

  btn.share.style.display = "inline-flex";

  ui.packagesCard.style.display = allowPackages ? "block" : "none";
  ui.runSamples.disabled = !!examMode;
  ui.problemSel.disabled = STUDENT_LOCKED && lockProblem;

  if (TEACHER_UI) {
    ui.forceClass.checked = classroomMode;
    ui.examMode.checked = examMode;
    ui.lockProblem.checked = lockProblem;
    ui.limitAttemptsOn.checked = attemptLimitOn;
    ui.allowPkgs.checked = allowPackages;
    ui.attemptLimit.value = String(attemptLimitMax);
    updateSubCount();
    const base = location.origin + location.pathname;
    ui.studentLink.textContent = base + "?tmode=0";
  }
}

function wireTeacherPanel() {
  if (!TEACHER_UI) return;

  ui.forceClass.addEventListener("change", () => {
    classroomMode = ui.forceClass.checked;
    saveBool(K_CLASS, classroomMode);
    applyModeUI();
    makeWorker(true);
    toast(classroomMode ? "Classroom forced" : "Classroom off");
  });
  ui.examMode.addEventListener("change", () => {
    examMode = ui.examMode.checked;
    saveBool(K_EXAM, examMode);
    applyModeUI();
    showProblem(currentProblemId);
    toast(examMode ? "Exam Mode ON" : "Exam Mode OFF");
  });
  ui.lockProblem.addEventListener("change", () => {
    lockProblem = ui.lockProblem.checked;
    saveBool(K_LOCK, lockProblem);
    applyModeUI();
    toast(lockProblem ? "Problem locked" : "Problem unlocked");
  });
  ui.limitAttemptsOn.addEventListener("change", () => {
    attemptLimitOn = ui.limitAttemptsOn.checked;
    saveBool(K_ATT_ON, attemptLimitOn);
    toast(attemptLimitOn ? "Attempt limit enabled" : "Attempt limit disabled");
  });
  ui.allowPkgs.addEventListener("change", () => {
    allowPackages = ui.allowPkgs.checked;
    saveBool(K_ALLOW_PKGS, allowPackages);
    applyModeUI();
    makeWorker(true);
    toast(allowPackages ? "Packages allowed" : "Packages blocked");
  });
  ui.attemptLimit.addEventListener("change", () => {
    attemptLimitMax = clamp(parseInt(ui.attemptLimit.value, 10) || 5, 1, 50);
    ui.attemptLimit.value = String(attemptLimitMax);
    saveInt(K_ATT_MAX, attemptLimitMax);
    toast("Attempt limit set to " + attemptLimitMax);
  });
  ui.exportSubs.addEventListener("click", () => {
    const list = loadSubs();
    const blob = new Blob([JSON.stringify(list, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    const ts = new Date().toISOString().replaceAll(":", "-");
    a.href = URL.createObjectURL(blob);
    a.download = `pp_submissions_${ts}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast("Exported submissions");
  });
  ui.clearSubs.addEventListener("click", () => {
    if (!confirm("Clear all submissions stored in this browser?")) return;
    clearSubs();
    toast("Submissions cleared");
  });
}

// ----- Bindings -----
btn.run.onclick = run;
btn.stop.onclick = stop;
btn.format.onclick = basicFormat;
btn.save.onclick = () => {
  state.tabs[currentTab].code = ui.code.value;
  saveState();
  localStorage.setItem(K_STDIN, ui.stdin.value || "");
  toast("Saved");
};
btn.share.onclick = share;

btn.newTab.onclick = newTab;
btn.delTab.onclick = delTab;

btn.install.onclick = installPkgs;
btn.list.onclick = listPkgs;

btn.sample.onclick = () => {
  ui.stdin.value = "5\n10\n20\n30\n40\n50\n";
  localStorage.setItem(K_STDIN, ui.stdin.value || "");
  toast("stdin sample");
};
btn.clearStdin.onclick = () => {
  ui.stdin.value = "";
  localStorage.setItem(K_STDIN, "");
  toast("stdin cleared");
};

btn.copyOut.onclick = async () => {
  const stdoutText = _lastStdout || (ui.out.textContent || "");
  const t = stdoutText + "\n" + (ui.err.textContent || "");
  try {
    await navigator.clipboard.writeText(t);
    toast("Output copied");
  } catch {
    openShareModal(t, "Clipboard blocked. Select the text and copy manually.");
  }
};
btn.clearOut.onclick = () => {
  renderOut("", []);
  ui.err.textContent = "";
  toast("Cleared");
};

ui.example.onchange = () => {
  const i = parseInt(ui.example.value, 10);
  if (Number.isFinite(i) && EXAMPLES[i]) {
    const ex = EXAMPLES[i];
    ui.code.value = ex.code;
    updateGutter();
    autosave();
    toast("Example loaded");

    if (ex.needsPkgs && Array.isArray(ex.needsPkgs) && ex.needsPkgs.length) {
      ui.pkgs.value = ex.needsPkgs.join(", ");
      if (!allowPackages) {
        toast("This lesson needs packages, but packages are disabled.");
      } else {
        toast("Installing: " + ui.pkgs.value);
        installPkgs();
      }
    }
  }
  ui.example.value = "";
};

ui.code.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    run();
    return;
  }

  if ((e.ctrlKey || e.metaKey) && e.key === "/") {
    e.preventDefault();
    toggleCommentSelection();
    return;
  }

  if (handleSmartEnter(e)) return;
  if (handleSmartBackspace(e)) return;

  if (e.key === "Tab") {
    e.preventDefault();
    const mode = ui.indent.value;
    const ins = mode === "tab" ? "\t" : " ".repeat(parseInt(mode, 10) || 4);
    const el = ui.code;
    const s = el.selectionStart;
    const t = el.selectionEnd;

    if (s !== t) {
      const v = el.value;
      const [ls, end] = lineBounds(v, s, t);
      const block = v
        .slice(ls, end)
        .split("\n")
        .map((line) => ins + line)
        .join("\n");
      el.value = v.slice(0, ls) + block + v.slice(end);
      el.selectionStart = ls;
      el.selectionEnd = ls + block.length;
    } else {
      el.setRangeText(ins, s, s, "end");
    }
    updateGutter();
    autosave();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeFullscreenPlot();
});

ui.problemSel.onchange = () => {
  if (STUDENT_LOCKED && lockProblem) return toast("Problem locked");
  showProblem(ui.problemSel.value);
};
ui.todayBtn.onclick = () => {
  if (STUDENT_LOCKED && lockProblem) return toast("Problem locked");
  const id = pickToday();
  ui.problemSel.value = id;
  showProblem(id);
};
ui.loadStarter.onclick = () => {
  const p = getProblem(currentProblemId);
  if (!p) return toast("Pick a problem");
  ui.code.value = p.starter;
  updateGutter();
  autosave();
  toast("Starter loaded");
};
ui.resetStarter.onclick = () => {
  if (!currentStarter) return toast("No starter");
  ui.code.value = currentStarter;
  updateGutter();
  autosave();
  toast("Reset");
};
ui.hintBtn.onclick = () => {
  if (examMode) return toast("Hints disabled in Exam Mode");
  const p = getProblem(currentProblemId);
  if (!p) return toast("Pick a problem");
  ui.hintBtn._i = (ui.hintBtn._i ?? -1) + 1;
  toast("💡 " + p.hints[ui.hintBtn._i % p.hints.length]);
};
ui.runSamples.onclick = async () => {
  if (examMode) return toast("Samples disabled in Exam Mode");
  const p = getProblem(currentProblemId);
  if (!p) return toast("Pick a problem");
  await runJudge(
    p.examples.map((e) => ({
      input: e.input,
      output: e.output,
      hidden: false,
    })),
    "Samples",
  );
};
ui.runAll.onclick = async () => {
  const p = getProblem(currentProblemId);
  if (!p) return toast("Pick a problem");
  await runJudge(p.tests, "All tests");
};

if (ui.themeToggle) ui.themeToggle.addEventListener("click", toggleTheme);
if (ui.voiceBtn) ui.voiceBtn.addEventListener("click", toggleVoiceRecognition);
if (ui.voiceClear) {
  ui.voiceClear.addEventListener("click", () => {
    saveVoiceLog([]);
    renderVoiceLog();
    toast("Voice log cleared");
  });
}

wireDragResize(
  ui.sidebarResizer,
  (e) => setSidebarWidth(e.clientX - 50),
  "pp-resizing-col",
);

wireDragResize(
  ui.panelResizer,
  (e) => {
    const rect = ui.panel.parentElement.getBoundingClientRect();
    const next = rect.bottom - e.clientY - 34;
    setPanelHeight(next);
  },
  "pp-resizing-row",
);

window.addEventListener("resize", () => {
  const saved = parseInt(localStorage.getItem(K_PANEL_H) || "0", 10);
  if (saved) setPanelHeight(saved);
});

// ----- Init -----
async function init() {
  setXP(getXP());
  setStreak(getStreak());
  updateSubCount();
  renderInstalledPkgs();
  renderVoiceLog();

  applyTheme(localStorage.getItem(K_THEME) || "dark");
  const savedSidebarW = parseInt(localStorage.getItem(K_SIDEBAR_W) || "0", 10);
  if (savedSidebarW) setSidebarWidth(savedSidebarW);
  const savedPanelH = parseInt(localStorage.getItem(K_PANEL_H) || "0", 10);
  if (savedPanelH) setPanelHeight(savedPanelH);

  const codeFile = URLP.get("codefile");
  const codeURL = URLP.get("code");

  if (codeFile) {
    const txt = await loadTextFileFromURL(codeFile);
    if (typeof txt === "string") {
      const fname =
        (String(codeFile).split("/").pop() || "main.py").replace(/\?.*$/, "") || "main.py";
      state.tabs = [{ name: fname.endsWith(".py") ? fname : "main.py", code: txt }];
      currentTab = 0;
      ui.code.value = state.tabs[0].code || "";
      saveState();
      toast("Loaded codefile");
    } else {
      toast("Codefile not reachable");
    }
  } else if (codeURL) {
    const remoteCode = await loadCodeFromURL(codeURL);
    if (remoteCode?.tabs?.length) {
      state.tabs = remoteCode.tabs;
      currentTab = clamp(
        parseInt(remoteCode.currentTab || 0, 10) || 0,
        0,
        state.tabs.length - 1,
      );
      ui.code.value = state.tabs[currentTab].code || "";
      ui.stdin.value = remoteCode.stdin || "";
      localStorage.setItem(K_STDIN, ui.stdin.value || "");
      if (remoteCode.problem) currentProblemId = remoteCode.problem;
      saveState();
      toast("Loaded code JSON");
    } else {
      toast("Code JSON invalid/unreachable");
    }
  } else {
    loadFromHash();
  }

  ui.stdin.value = localStorage.getItem(K_STDIN) || "";
  ui.stdin.addEventListener("input", () =>
    localStorage.setItem(K_STDIN, ui.stdin.value || ""),
  );

  loadStudent();
  renderTabs();

  const custom = loadCustomProblems();
  const remoteURL = URLP.get("problems");
  const remote = remoteURL ? await loadProblemsFromURL(remoteURL) : loadRemoteCache();

  const byId = new Map();
  [...DEFAULT_PROBLEMS, ...custom, ...remote].forEach((p) => byId.set(p.id, p));
  PROBLEMS = Array.from(byId.values());

  renderProblems();

  ui.code.value = state.tabs[currentTab].code || "";
  updateGutter();
  btn.stop.disabled = true;

  renderOut("", []);

  applyModeUI();
  wireTeacherPanel();

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  voiceSupported = !!SpeechRecognition;
  updateVoiceUI(voiceSupported ? "Voice: ready" : "Voice: unsupported", "🎤 Voice");

  const pid = currentProblemId || pickToday();
  ui.problemSel.value = pid;
  showProblem(pid);

  makeWorker();
  setStatus("Ready.", "ok");
  setProgress(0);
}
init();