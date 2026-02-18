// Programmer's Picnic — Pyodide Editor (Judge v2 + Matplotlib Lessons)
// Modes:
//   ?tmode=1 => Teacher mode (Teacher Panel visible)
//   ?tmode=0 => Student mode (Classroom forced ON, teacher controls hidden)
// Share button is enabled in both modes.
//
// Strict share:
//   - Share writes ONLY: #pp=<base64url>
//   - Loader accepts ONLY: #pp=<base64url>

const $ = (id) => document.getElementById(id);

// ----- URL mode -----
const URLP = new URLSearchParams(location.search);
const TM = URLP.get("tmode"); // "1" | "0" | null
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

// Installed packages UI list (local display)
const K_INSTALLED_PKGS = "pp_installed_pkgs_v1";

// ---- Custom Problems Store (builder exports + optional remote JSON) ----
const K_PROBLEMS_LOCAL = "pp_problems_custom_v1";
const K_PROBLEMS_REMOTE_CACHE = "pp_problems_remote_cache_v1";
const K_PROBLEMS_REMOTE_URL = "pp_problems_remote_url_v1";

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

    // Accepted formats:
    // 1) { tabs:[{name,code}], currentTab, stdin, problem }
    // 2) { code:"print(...)" }  -> becomes one tab main.py
    // 3) [{name,code}, ...] -> tabs array
    let tabs = null;
    let currentTabRemote = 0;
    let stdin = "";
    let problem = "";

    if (Array.isArray(payload)) {
      tabs = payload;
    } else if (payload && typeof payload === "object") {
      if (Array.isArray(payload.tabs)) tabs = payload.tabs;
      else if (typeof payload.code === "string")
        tabs = [{ name: "main.py", code: payload.code }];
      currentTabRemote = payload.currentTab ?? payload.current_tab ?? 0;
      stdin = payload.stdin ?? "";
      problem = payload.problem ?? "";
    }

    if (!Array.isArray(tabs) || !tabs.length)
      throw new Error("Invalid code JSON");
    tabs = tabs.map((t, i) => ({
      name: String(
        t?.name || (i === 0 ? "main.py" : "file" + (i + 1) + ".py"),
      ),
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
    const txt = await res.text();
    return String(txt ?? "");
  } catch {
    return null;
  }
}

// Single submissions store
const K_SUBS = "pp_class_submissions_v1";

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

/* -------------------------
   MATPLOTLIB INTERACTIVE LESSONS
   - These appear under Examples…
   - When selected, they can auto-request packages install (matplotlib)
-------------------------- */
const EXAMPLES = [
  {
    title: "Hello + loops",
    code: 'print("Hello")\nfor i in range(3):\n    print(i)\n',
  },
  {
    title: "stdin + sum",
    code: "n=int(input())\nt=0\nfor _ in range(n):\n    t+=int(input())\nprint(t)\n",
  },

  // --- Matplotlib lessons ---
  {
    title: "📈 Matplotlib Lesson 1 — Line Plot",
    needsPkgs: ["matplotlib"],
    code:
      `# Matplotlib Lesson 1: Line Plot\n` +
      `# Goal: Plot y = x^2\n\n` +
      `import matplotlib.pyplot as plt\n\n` +
      `x = [0,1,2,3,4,5]\n` +
      `y = [i*i for i in x]\n\n` +
      `plt.figure()\n` +
      `plt.plot(x, y, marker="o")\n` +
      `plt.title("y = x^2")\n` +
      `plt.xlabel("x")\n` +
      `plt.ylabel("y")\n` +
      `plt.grid(True)\n\n` +
      `print("✅ Plot created. See image below.")\n` +
      `plt.show()\n`,
  },
  {
    title: "📊 Matplotlib Lesson 2 — Bar Chart",
    needsPkgs: ["matplotlib"],
    code:
      `# Matplotlib Lesson 2: Bar Chart\n` +
      `# Goal: Plot student marks\n\n` +
      `import matplotlib.pyplot as plt\n\n` +
      `names = ["A", "B", "C", "D"]\n` +
      `marks = [72, 88, 64, 91]\n\n` +
      `plt.figure()\n` +
      `plt.bar(names, marks)\n` +
      `plt.title("Marks")\n` +
      `plt.xlabel("Student")\n` +
      `plt.ylabel("Marks")\n\n` +
      `print("✅ Bar chart created. See image below.")\n` +
      `plt.show()\n`,
  },
  {
    title: "🟣 Matplotlib Lesson 3 — Scatter + Labels",
    needsPkgs: ["matplotlib"],
    code:
      `# Matplotlib Lesson 3: Scatter + Labels\n` +
      `# Goal: Plot points and annotate them\n\n` +
      `import matplotlib.pyplot as plt\n\n` +
      `pts = [(1,2), (2,1), (3,4), (4,3)]\n` +
      `x = [p[0] for p in pts]\n` +
      `y = [p[1] for p in pts]\n\n` +
      `plt.figure()\n` +
      `plt.scatter(x, y)\n` +
      `for i,(a,b) in enumerate(pts, start=1):\n` +
      `    plt.text(a+0.05, b+0.05, f"P{i}")\n` +
      `plt.title("Scatter + Labels")\n` +
      `plt.grid(True)\n\n` +
      `print("✅ Scatter plot created. See image below.")\n` +
      `plt.show()\n`,
  },
  {
    title: "📉 Matplotlib Lesson 4 — Histogram",
    needsPkgs: ["matplotlib"],
    code:
      `# Matplotlib Lesson 4: Histogram\n` +
      `# Goal: Frequency distribution\n\n` +
      `import matplotlib.pyplot as plt\n\n` +
      `data = [12, 15, 12, 20, 22, 15, 14, 14, 14, 18, 19, 20, 21, 22, 23]\n\n` +
      `plt.figure()\n` +
      `plt.hist(data, bins=6)\n` +
      `plt.title("Histogram")\n` +
      `plt.xlabel("Value")\n` +
      `plt.ylabel("Frequency")\n\n` +
      `print("✅ Histogram created. See image below.")\n` +
      `plt.show()\n`,
  },
  {
    title: "🌊 Matplotlib Lesson 5 — Multiple Plots (sin & cos)",
    needsPkgs: ["matplotlib"],
    code:
      `# Matplotlib Lesson 5: Multiple Plots\n` +
      `# Goal: Plot sin(x) and cos(x)\n\n` +
      `import math\n` +
      `import matplotlib.pyplot as plt\n\n` +
      `x = [i*0.2 for i in range(0, 50)]\n` +
      `sinx = [math.sin(v) for v in x]\n` +
      `cosx = [math.cos(v) for v in x]\n\n` +
      `plt.figure()\n` +
      `plt.plot(x, sinx, label="sin(x)")\n` +
      `plt.plot(x, cosx, label="cos(x)")\n` +
      `plt.title("sin(x) & cos(x)")\n` +
      `plt.legend()\n` +
      `plt.grid(True)\n\n` +
      `print("✅ Two curves plotted. See image below.")\n` +
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

// ----- Installed packages list helpers -----
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

// ----- Output renderer (stdout + plots) -----
let _lastStdout = "";
let _lastPlots = []; // array of data:image/png;base64,...
function renderOut(stdoutText, plots = []) {
  _lastStdout = String(stdoutText || "");
  _lastPlots = Array.isArray(plots) ? plots : [];

  const pre = `<pre class="pp-mono pp-pre" style="margin:0">${esc(_lastStdout)}</pre>`;
  const imgs =
    _lastPlots.length
      ? `<div style="margin-top:10px;display:grid;gap:10px">
          ${_lastPlots
            .map(
              (src, i) =>
                `<div style="border:1px solid var(--pp-border, rgba(31,41,55,.12));border-radius:14px;overflow:hidden;background:rgba(255,255,255,.7)">
                   <div class="pp-small" style="padding:8px 10px;border-bottom:1px solid rgba(31,41,55,.08)">Plot #${i + 1}</div>
                   <img alt="plot ${i + 1}" src="${src}" style="width:100%;display:block" />
                 </div>`,
            )
            .join("")}
        </div>`
      : "";

  ui.out.innerHTML = pre + imgs;
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

// ----- Classroom/teacher flags -----
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
    localStorage.setItem(
      K_STATE,
      JSON.stringify({ tabs: state.tabs, currentTab }),
    );
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
  let n = 1,
    name = `untitled${n}.py`;
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
ui.code.addEventListener(
  "scroll",
  () => (ui.gutter.scrollTop = ui.code.scrollTop),
);
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
const attUsed = (pid) =>
  parseInt(localStorage.getItem(attKey(pid)) || "0", 10) || 0;
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
    allow_imports: classroomMode && !pkgOK
      ? ["math", "random", "re", "statistics"]
      : [],
    allow_micropip: pkgOK,
  };
}
function makeWorker(force = false) {
  if (worker && !force && packagesInstalled) {
    return;
  }
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
      renderOut(msg.text || "", []); // show list in stdout box
      return;
    }
    if (msg.type === "INSTALLED") {
      installBusy = false;
      try {
        btn.install.disabled = false;
      } catch {}
      packagesInstalled = true;

      // Update installed packages UI list (best-effort)
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
      try {
        btn.install.disabled = false;
      } catch {}
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

      // IMPORTANT: judge compares stdout only (plots ignored)
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
        error: isTimeout
          ? "Timeout (infinite loop?)"
          : err?.message || String(err),
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

  // XP
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

  // Record submission (students always; teachers only when classroom on)
  if (STUDENT_LOCKED || (TEACHER_UI && classroomMode)) {
    const usedNow = attemptLimitOn
      ? attInc(currentProblemId)
      : attUsed(currentProblemId);
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
      toast(
        `Submitted. Attempts left: ${Math.max(0, attemptLimitMax - usedNow)}`,
      );
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
  try {
    btn.install.disabled = true;
  } catch {}

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

// ----- Share (STRICT: only #pp=...) -----
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
  const url =
    location.origin + location.pathname + location.search + "#pp=" + b64;

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
// Strict loader: ONLY accepts #pp=...
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

  // Fix: HTML uses visibility:hidden sometimes; enforce visibility here too.
  ui.teacherBtn.style.display = TEACHER_UI ? "inline-flex" : "none";
  ui.teacherBtn.style.visibility = TEACHER_UI ? "visible" : "hidden";
  ui.teacherPanel.style.display = TEACHER_UI ? "block" : "none";

  // share always available
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
    const blob = new Blob([JSON.stringify(list, null, 2)], {
      type: "application/json",
    });
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
  // Copy stdout (text) + stderr (text). Plots are images so we only copy text.
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

// Examples (Matplotlib lessons included)
ui.example.onchange = () => {
  const i = parseInt(ui.example.value, 10);
  if (Number.isFinite(i) && EXAMPLES[i]) {
    const ex = EXAMPLES[i];

    ui.code.value = ex.code;
    updateGutter();
    autosave();
    toast("Example loaded");

    // If this example needs packages, auto-fill and auto-install.
    if (ex.needsPkgs && Array.isArray(ex.needsPkgs) && ex.needsPkgs.length) {
      ui.pkgs.value = ex.needsPkgs.join(", ");
      if (!allowPackages) {
        toast("This lesson needs packages, but packages are disabled.");
      } else {
        // try auto install (no confirm/prompt)
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
  }
  if (e.key === "Tab") {
    e.preventDefault();
    const mode = ui.indent.value;
    const ins = mode === "tab" ? "\t" : " ".repeat(parseInt(mode, 10) || 4);
    const el = ui.code;
    const s = el.selectionStart,
      t = el.selectionEnd;

    if (s !== t) {
      const v = el.value;
      const ls = v.lastIndexOf("\n", s - 1) + 1;
      const le = v.indexOf("\n", t);
      const end = le === -1 ? v.length : le;
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

// problems
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

// ----- Init -----
async function init() {
  setXP(getXP());
  setStreak(getStreak());
  updateSubCount();
  renderInstalledPkgs();

  // Optional URL loaders
  const codeFile = URLP.get("codefile");
  const codeURL = URLP.get("code");

  if (codeFile) {
    const txt = await loadTextFileFromURL(codeFile);
    if (typeof txt === "string") {
      const fname =
        (String(codeFile).split("/").pop() || "main.py").replace(/\?.*$/, "") ||
        "main.py";
      state.tabs = [
        { name: fname.endsWith(".py") ? fname : "main.py", code: txt },
      ];
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
    // strict share loader
    loadFromHash();
  }

  // stdin
  ui.stdin.value = localStorage.getItem(K_STDIN) || "";
  ui.stdin.addEventListener("input", () =>
    localStorage.setItem(K_STDIN, ui.stdin.value || ""),
  );

  loadStudent();

  renderTabs();

  // Load local + optional remote problems
  const custom = loadCustomProblems();
  const remoteURL = URLP.get("problems");
  const remote = remoteURL
    ? await loadProblemsFromURL(remoteURL)
    : loadRemoteCache();

  // Merge (defaults first, then custom, then remote). Dedupe by id.
  const byId = new Map();
  [...DEFAULT_PROBLEMS, ...custom, ...remote].forEach((p) => {
    byId.set(p.id, p);
  });
  PROBLEMS = Array.from(byId.values());

  renderProblems();

  ui.code.value = state.tabs[currentTab].code || "";
  updateGutter();
  btn.stop.disabled = true;

  // output init
  renderOut("", []);

  // mode UI
  applyModeUI();
  wireTeacherPanel();

  // problem
  const pid = currentProblemId || pickToday();
  ui.problemSel.value = pid;
  showProblem(pid);

  makeWorker();
  setStatus("Ready.", "ok");
  setProgress(0);
}
init();