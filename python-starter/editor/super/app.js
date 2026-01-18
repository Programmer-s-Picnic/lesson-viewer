const $ = (id) => document.getElementById(id);

// ---- Teacher Mode from URL ----
// index.html?tmode=1  => teacher UI
// index.html?tmode=0  => student locked view
const URLP = new URLSearchParams(location.search);
const TM = URLP.get("tmode");
const TEACHER_UI = (TM === "1");
const STUDENT_LOCKED = (TM === "0");

const ui = {
  tabs: $("ppTabs"),
  code: $("ppCode"),
  gutter: $("ppGutter"),
  out: $("ppOut"),
  err: $("ppErr"),
  stdin: $("ppStdin"),
  pkgs: $("ppPkgs"),
  example: $("ppExample"),
  indent: $("ppIndent"),
  pyText: $("ppPyText"),
  dot: $("ppDot"),
  status: $("ppStatus"),
  bar: $("ppBar"),
  timer: $("ppTimer"),
  toast: $("ppToast"),

  // judge ui
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

  packagesCard: $("ppPackagesCard"),

  // teacher + student
  teacherPanel: $("ppTeacherPanel"),
  tpForceClass: $("ppTPForceClass"),
  tpExam: $("ppTPExam"),
  tpLockProblem: $("ppTPLockProblem"),
  tpAttempts: $("ppTPAttempts"),
  tpExport: $("ppTPExport"),
  tpClear: $("ppTPClear"),
  tpCount: $("ppTPCount"),

  studentCard: $("ppStudentCard"),
  studentName: $("ppStudentName"),
  studentRoll: $("ppStudentRoll"),
};

const btn = {
  run: $("ppRun"),
  stop: $("ppStop"),
  format: $("ppFormat"),
  save: $("ppSave"),
  share: $("ppShare"),
  classroom: $("ppClassroom"),

  newTab: $("ppNewTab"),
  delTab: $("ppDelTab"),

  install: $("ppInstall"),
  list: $("ppList"),

  sample: $("ppStdinSample"),
  clearStdin: $("ppStdinClear"),
  copyOut: $("ppCopyOut"),
  clearOut: $("ppClearOut"),
};

const STORAGE_KEY = "pp_editor_v2_state";
const STORAGE_STDIN = "pp_editor_v2_stdin";
const STORAGE_XP = "pp_xp_v2";
const STORAGE_STREAK = "pp_streak_v2";
const STORAGE_LASTDAY = "pp_last_day_v2";

const STORAGE_CLASSMODE = "pp_classroom_mode_v2";
const STORAGE_TEACHER_CFG = "pp_teacher_cfg_v1";
const STORAGE_STUDENT = "pp_student_v1";
const STORAGE_SUBMISSIONS = "pp_class_submissions_v1";
const STORAGE_ATTEMPTS = "pp_attempts_v1";

const JUDGE_TIMEOUT_MS = 2500;
ui.timeout.textContent = (JUDGE_TIMEOUT_MS / 1000).toFixed(1);

// ---------- Problems ----------
const PROBLEMS = [
  {
    id: "sum_n",
    title: "Sum of N Numbers",
    level: "Easy",
    statement: `Given an integer N, print the sum of the first N natural numbers.`,
    starter: `n=int(input())\n# TODO\n# print(ans)\n`,
    examples: [{ input: "5\n", output: "15\n" }],
    tests: [
      { input: "10\n", output: "55\n", hidden: false },
      { input: "100\n", output: "5050\n", hidden: true },
      { input: "0\n", output: "0\n", hidden: true },
    ],
    hints: ["Use n*(n+1)//2", "If N=0 output 0", "Print only the number"],
  },
  {
    id: "reverse_num",
    title: "Reverse a Number",
    level: "Selection",
    statement: `Given N (0 ≤ N ≤ 10^18), print reversed digits. N=0 => 0.`,
    starter: `n=int(input())\n# TODO\n# print(ans)\n`,
    examples: [{ input: "1200\n", output: "21\n" }],
    tests: [
      { input: "123456\n", output: "654321\n", hidden: false },
      { input: "9070\n", output: "709\n", hidden: true },
    ],
    hints: ["While loop with %10", "Or string reverse", "Handle N=0"],
  },
];

const EXAMPLES = [
  { title: "Hello + loops", code: `print("Hello")\nfor i in range(3):\n    print(i)\n` },
  { title: "stdin + sum", code: `n=int(input())\nt=0\nfor _ in range(n):\n    t+=int(input())\nprint(t)\n` },
];

const DEFAULT_TABS = [{ name: "main.py", code: `print("Namaste Champak 👋")\n` }];

// ---------- submissions (ONE declaration only) ----------
function loadSubmissions() {
  try { return JSON.parse(localStorage.getItem(STORAGE_SUBMISSIONS) || "[]"); } catch { return []; }
}
function saveSubmissions(list) {
  localStorage.setItem(STORAGE_SUBMISSIONS, JSON.stringify(list || []));
}
function addSubmission(entry) {
  const list = loadSubmissions();
  list.push(entry);
  saveSubmissions(list);
}

// ---------- teacher config ----------
function loadTeacherCfg() {
  try {
    const raw = localStorage.getItem(STORAGE_TEACHER_CFG);
    if (!raw) return { forceClassroom: true, examMode: false, lockProblem: true, attemptLimit: 0 };
    const c = JSON.parse(raw);
    return {
      forceClassroom: !!c.forceClassroom,
      examMode: !!c.examMode,
      lockProblem: !!c.lockProblem,
      attemptLimit: Number.isFinite(+c.attemptLimit) ? Math.max(0, +c.attemptLimit) : 0,
    };
  } catch {
    return { forceClassroom: true, examMode: false, lockProblem: true, attemptLimit: 0 };
  }
}
function saveTeacherCfg(cfg) {
  localStorage.setItem(STORAGE_TEACHER_CFG, JSON.stringify(cfg));
}

// ---------- student info ----------
function loadStudent() {
  try {
    const raw = localStorage.getItem(STORAGE_STUDENT);
    if (!raw) return { name: "", roll: "" };
    const s = JSON.parse(raw);
    return { name: (s.name || "").toString(), roll: (s.roll || "").toString() };
  } catch {
    return { name: "", roll: "" };
  }
}
function saveStudent(s) {
  localStorage.setItem(STORAGE_STUDENT, JSON.stringify({ name: (s.name||"").toString(), roll: (s.roll||"").toString() }));
}

// ---------- state ----------
function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && Array.isArray(p.tabs) && p.tabs.length) return p;
    }
  } catch {}
  return { tabs: structuredClone(DEFAULT_TABS), currentTab: 0 };
}

let state = loadState();
let currentTab = clamp(state.currentTab || 0, 0, state.tabs.length - 1);
let currentProblemId = null;
let currentStarter = null;

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ tabs: state.tabs, currentTab })); } catch {}
}

function loadStdin() {
  try { ui.stdin.value = localStorage.getItem(STORAGE_STDIN) || ""; } catch {}
}
function saveStdin() {
  try { localStorage.setItem(STORAGE_STDIN, ui.stdin.value || ""); } catch {}
}

// ---------- toast/status ----------
function toast(msg) {
  ui.toast.textContent = msg;
  ui.toast.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => ui.toast.classList.remove("show"), 1500);
}

function setStatus(text, kind) {
  ui.status.textContent = text;
  ui.dot.className = "pp-dot" + (kind ? " " + kind : "");
}

function setProgress(p) {
  ui.bar.style.width = clamp(p, 0, 100) + "%";
}

function normalizeOut(s) {
  s = (s ?? "").toString().replace(/\r\n/g, "\n");
  s = s.split("\n").map(line => line.replace(/[ \t]+$/g, "")).join("\n");
  s = s.replace(/\s+$/g, "");
  return s + "\n";
}

function writeStdout(text, append = true) {
  if (!append) ui.out.textContent = "";
  ui.out.textContent += text;
  ui.out.scrollTop = ui.out.scrollHeight;
}

function writeStderr(text, append = true) {
  if (!append) ui.err.textContent = "";
  ui.err.textContent += text;
  ui.err.scrollTop = ui.err.scrollHeight;
}

// ---------- XP / streak ----------
function getLocalDayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}
function getXP(){ return parseInt(localStorage.getItem(STORAGE_XP) || "0", 10) || 0; }
function setXP(v){ localStorage.setItem(STORAGE_XP, String(v)); ui.xp.textContent = String(v); }
function getStreak(){ return parseInt(localStorage.getItem(STORAGE_STREAK) || "0", 10) || 0; }
function setStreak(v){ localStorage.setItem(STORAGE_STREAK, String(v)); ui.streak.textContent = String(v); }

function updateStreakOnSolve() {
  const today = getLocalDayKey();
  const last = localStorage.getItem(STORAGE_LASTDAY) || "";
  let streak = getStreak();
  if (last === today) return;

  const d = new Date();
  const y = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
  const ykey = getLocalDayKey(y);

  streak = (last === ykey) ? streak + 1 : 1;
  localStorage.setItem(STORAGE_LASTDAY, today);
  setStreak(streak);
}

// ---------- Classroom Mode + policy ----------
function loadClassroomMode() {
  try { return localStorage.getItem(STORAGE_CLASSMODE) === "1"; } catch { return false; }
}
function saveClassroomMode(v) {
  try { localStorage.setItem(STORAGE_CLASSMODE, v ? "1" : "0"); } catch {}
}

let teacherCfg = loadTeacherCfg();
let classroomMode = loadClassroomMode();

// student locked: force classroom ON and prevent toggling
if (STUDENT_LOCKED) classroomMode = true;

function effectiveClassroomMode() {
  // teacher can force classroom on for everyone locally
  if (TEACHER_UI && teacherCfg.forceClassroom) return true;
  if (STUDENT_LOCKED) return true;
  return classroomMode;
}

function classPolicy() {
  const cm = effectiveClassroomMode();
  return {
    disable_open: cm,
    disable_eval_exec: false,
    block_imports: cm,
    allow_imports: cm ? ["math"] : [],
    allow_micropip: !cm,
  };
}

function updateTeacherPanelCount() {
  if (!ui.tpCount) return;
  ui.tpCount.textContent = String(loadSubmissions().length);
}

function applyModeUI() {
  const cm = effectiveClassroomMode();

  // packages
  ui.packagesCard.style.display = cm ? "none" : "block";

  // classroom toggle visibility/behavior
  if (STUDENT_LOCKED) {
    btn.classroom.style.display = "none";
  } else if (TEACHER_UI) {
    btn.classroom.style.display = "inline-flex";
  } else {
    // no tmode param: keep it visible (your old behavior)
    btn.classroom.style.display = "inline-flex";
  }
  btn.classroom.textContent = cm ? "🎓 Classroom: ON" : "🎓 Classroom";

  // teacher panel
  ui.teacherPanel.style.display = TEACHER_UI ? "block" : "none";
  ui.studentCard.style.display = STUDENT_LOCKED ? "block" : "none";

  // share hidden for students
  btn.share.style.display = true ? "none" : "inline-flex";
  // btn.share.style.display = STUDENT_LOCKED ? "none" : "inline-flex";

  // exam mode effects
  const exam = teacherCfg.examMode && (TEACHER_UI || STUDENT_LOCKED);
  ui.hintBtn.style.display = exam ? "none" : "inline-flex";
  ui.runSamples.style.display = exam ? "none" : "inline-flex";
  ui.pExamples.style.display = exam ? "none" : (ui.pExamples.textContent ? "block" : "none");

  // lock problem
  const lockProb = teacherCfg.lockProblem && (TEACHER_UI || STUDENT_LOCKED);
  ui.problemSel.disabled = lockProb;
  ui.todayBtn.disabled = lockProb;

  updateTeacherPanelCount();
}

// ---------- Worker lifecycle ----------
let worker = null;

function makeWorker() {
  if (worker) worker.terminate();
  worker = new Worker("./judge-worker.js");
  worker.onmessage = onWorkerMessage;
  worker.postMessage({ type: "INIT", policy: classPolicy() });
}

let pendingRunResolve = null;
let pendingRunReject = null;
let runTimer = null;

function onWorkerMessage(ev) {
  const msg = ev.data || {};
  if (msg.type === "READY") {
    setStatus("Judge worker ready.", "ok");
    return;
  }
  if (msg.type === "RUN_RESULT") {
    clearTimeout(runTimer);
    const r = msg.result;
    pendingRunResolve?.(r);
    pendingRunResolve = pendingRunReject = null;
    return;
  }
  if (msg.type === "PKG_LIST") {
    writeStdout(msg.text || "", false);
    return;
  }
  if (msg.type === "INSTALLED") {
    writeStdout("Installed: " + (msg.pkgs || []).join(", ") + "\n", true);
    return;
  }
  if (msg.type === "ERR") {
    clearTimeout(runTimer);
    pendingRunReject?.(new Error(msg.message || "Worker error"));
    pendingRunResolve = pendingRunReject = null;
    return;
  }
}

function runInWorker({ code, stdin }) {
  const policyJson = JSON.stringify(classPolicy());
  return new Promise((resolve, reject) => {
    pendingRunResolve = resolve;
    pendingRunReject = reject;

    worker.postMessage({ type: "RUN_ONE", code, stdin, policyJson });

    runTimer = setTimeout(() => {
      worker.terminate();
      worker = null;
      makeWorker();
      reject(new Error("TIMEOUT"));
    }, JUDGE_TIMEOUT_MS);
  });
}

// ---------- tabs ----------
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
  let n = 1;
  const names = new Set(state.tabs.map(t => t.name));
  let name = `untitled${n}.py`;
  while (names.has(name)) { n++; name = `untitled${n}.py`; }
  state.tabs.push({ name, code: "# new file\n" });
  currentTab = state.tabs.length - 1;
  ui.code.value = state.tabs[currentTab].code;
  renderTabs();
  updateGutter();
  saveState();
  toast("New tab created");
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
  toast("Tab deleted");
}

function updateGutter() {
  const lines = ui.code.value.split("\n").length || 1;
  let s = "";
  for (let i = 1; i <= lines; i++) s += i + "\n";
  ui.gutter.textContent = s.trimEnd();
  ui.gutter.scrollTop = ui.code.scrollTop;
}

ui.code.addEventListener("scroll", () => (ui.gutter.scrollTop = ui.code.scrollTop));
ui.code.addEventListener("input", () => { updateGutter(); autosave(); });

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
  const lines = ui.code.value.split("\n").map(l => {
    let x = l.replace(/\s+$/g, "");
    if (tabToSpaces) x = x.replace(/\t/g, " ".repeat(spaceCount));
    return x;
  });
  let out = lines.join("\n");
  if (!out.endsWith("\n")) out += "\n";
  ui.code.value = out;
  updateGutter();
  autosave();
  toast("Formatted");
}

// ---------- problems ----------
function getProblemById(id){ return PROBLEMS.find(p => p.id === id) || null; }

function renderProblems() {
  ui.problemSel.innerHTML = PROBLEMS.map(p => `<option value="${p.id}">${p.title} • ${p.level}</option>`).join("");
}

function pickTodayProblemId() {
  const d = new Date();
  const seed = d.getFullYear()*10000 + (d.getMonth()+1)*100 + d.getDate();
  return PROBLEMS[seed % PROBLEMS.length].id;
}

function showProblem(id) {
  const p = getProblemById(id);
  if (!p) return;
  currentProblemId = id;
  currentStarter = p.starter;
  ui.pTitle.textContent = `${p.title} • ${p.level}`;
  ui.pDesc.textContent = p.statement;

  const ex = p.examples.map(e => `INPUT:\n${e.input}\nOUTPUT:\n${e.output}`).join("\n\n---\n\n");
  ui.pExamples.textContent = ex;

  // only show examples if not exam-mode
  if (!(teacherCfg.examMode && (TEACHER_UI || STUDENT_LOCKED))) {
    ui.pExamples.style.display = "block";
  }

  ui.judgeSummary.textContent = "";
  ui.judgeTableWrap.innerHTML = "";

  applyModeUI();
}

function loadStarterIntoEditor() {
  const p = getProblemById(currentProblemId);
  if (!p) return toast("Pick a problem first");
  ui.code.value = p.starter;
  updateGutter();
  autosave();
  toast("Starter loaded");
}

function resetToStarter() {
  if (!currentStarter) return toast("No starter saved yet");
  ui.code.value = currentStarter;
  updateGutter();
  autosave();
  toast("Reset to starter");
}

function showHint() {
  const p = getProblemById(currentProblemId);
  if (!p) return toast("Pick a problem first");
  showHint._i = (showHint._i ?? -1) + 1;
  const hint = p.hints[showHint._i % p.hints.length];
  toast("💡 " + hint);
}

// ---------- Attempts limit ----------
function attemptsKey(problemId) {
  // per-day limits
  return `${STORAGE_ATTEMPTS}:${getLocalDayKey()}:${problemId}`;
}
function getAttempts(problemId) {
  try { return parseInt(localStorage.getItem(attemptsKey(problemId)) || "0", 10) || 0; } catch { return 0; }
}
function incAttempts(problemId) {
  const v = getAttempts(problemId) + 1;
  localStorage.setItem(attemptsKey(problemId), String(v));
  return v;
}
function attemptLimit() {
  return Math.max(0, teacherCfg.attemptLimit || 0);
}

function attemptGateOrToast() {
  const lim = attemptLimit();
  if (!lim) return true;
  const used = getAttempts(currentProblemId);
  if (used >= lim) {
    toast(`Attempt limit reached (${used}/${lim}) for today`);
    return false;
  }
  return true;
}

// ---------- Run (manual) ----------
async function run() {
  btn.run.disabled = true;
  btn.stop.disabled = false;

  writeStdout("— Running —\n", false);
  writeStderr("", false);

  state.tabs[currentTab].code = ui.code.value;
  saveState();
  saveStdin();

  try {
    setStatus("Running…", "warn");
    const t0 = performance.now();
    const r = await runInWorker({ code: ui.code.value || "", stdin: ui.stdin.value || "" });
    const t1 = performance.now();

    writeStdout(r.stdout || "", false);
    writeStderr(r.stderr ? ("— stderr —\n" + (r.stderr || "")) : "", false);

    if (!r.ok) {
      writeStderr((r.error || "Runtime error") + "\n", true);
      setStatus("Error.", "bad");
    } else {
      setStatus("Done.", "ok");
    }

    if (ui.timer.checked) writeStdout(`\n✓ Done (${Math.round(t1 - t0)} ms)\n`, true);
    else writeStdout("\n✓ Done\n", true);

  } catch (err) {
    const isTimeout = (err && String(err.message).includes("TIMEOUT"));
    if (isTimeout) {
      writeStderr("✗ Timeout. Your code may be stuck in a loop.\n", false);
    } else {
      writeStderr("✗ " + (err?.message || String(err)) + "\n", false);
    }
    setStatus("Error.", "bad");
  } finally {
    btn.run.disabled = false;
    btn.stop.disabled = true;
  }
}

function stop() {
  if (worker) worker.terminate();
  worker = null;
  makeWorker();
  setStatus("Stopped.", "warn");
  toast("Stopped");
}

// ---------- Judge ----------
async function runJudge(testList, label, captureSubmission) {
  const p = getProblemById(currentProblemId);
  if (!p) return toast("Pick a problem");

  if (captureSubmission && !attemptGateOrToast()) return;

  ui.judgeSummary.textContent = "Running tests…";
  ui.judgeTableWrap.innerHTML = "";
  ui.runSamples.disabled = true;
  ui.runAll.disabled = true;

  state.tabs[currentTab].code = ui.code.value;
  saveState();

  const userCode = ui.code.value || "";
  const rows = [];
  let pass = 0;
  const t0 = performance.now();

  for (let i = 0; i < testList.length; i++) {
    const t = testList[i];
    const name = t.hidden ? `Hidden #${i + 1}` : `Test #${i + 1}`;
    try {
      const r = await runInWorker({ code: userCode, stdin: t.input });

      const got = normalizeOut(r.stdout || "");
      const exp = normalizeOut(t.output);
      const ok = r.ok === true && got === exp;
      if (ok) pass++;

      rows.push({
        name,
        hidden: !!t.hidden,
        ok,
        input: t.input,
        expected: t.hidden ? "(hidden)" : t.output,
        got: t.hidden ? (ok ? "(hidden)" : got) : got,
        error: r.ok ? "" : (r.error || "Runtime error"),
        stderr: r.stderr || "",
      });

    } catch (err) {
      const isTimeout = err && String(err.message).includes("TIMEOUT");
      rows.push({
        name,
        hidden: !!t.hidden,
        ok: false,
        input: t.input,
        expected: t.hidden ? "(hidden)" : t.output,
        got: "(stopped)",
        error: isTimeout ? "Timeout (infinite loop?)" : (err?.message || String(err)),
        stderr: "",
      });
    }
  }

  const t1 = performance.now();
  const total = testList.length;
  const score = Math.round((pass / total) * 100);

  ui.judgeSummary.innerHTML =
    `<b>${label}:</b> <span style="font-weight:900">${pass}/${total}</span> • Score: <b>${score}</b> • Time: <span class="pp-dim">${Math.round(t1 - t0)} ms</span>`;

  // Render details
  const table = document.createElement("div");
  const esc = (s) => (s ?? "").toString().replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");

  table.innerHTML = rows.map(r => {
    const badge = r.ok ? `<span style="color:var(--pp-ok);font-weight:900">PASS</span>` : `<span style="color:var(--pp-bad);font-weight:900">FAIL</span>`;
    return `
      <div style="margin-top:10px;padding:10px;border:1px solid var(--pp-border);border-radius:14px;background:rgba(255,255,255,.6)">
        <div class="pp-row">
          <div><b>${esc(r.name)}</b> ${r.hidden ? `<span class="pp-small">(hidden)</span>` : ``}</div>
          <div>${badge}</div>
        </div>
        <div style="margin-top:8px"><b>Input</b><pre style="white-space:pre-wrap;margin:6px 0 0;padding:8px;border:1px solid var(--pp-border);border-radius:12px;background:rgba(11,18,32,.04)">${esc(r.input)}</pre></div>
        <div style="margin-top:8px"><b>Expected</b><pre style="white-space:pre-wrap;margin:6px 0 0;padding:8px;border:1px solid var(--pp-border);border-radius:12px;background:rgba(11,18,32,.04)">${esc(r.expected)}</pre></div>
        <div style="margin-top:8px"><b>Got (stdout)</b><pre style="white-space:pre-wrap;margin:6px 0 0;padding:8px;border:1px solid var(--pp-border);border-radius:12px;background:rgba(11,18,32,.04)">${esc(r.got)}</pre></div>
        ${r.stderr ? `<div style="margin-top:8px"><b>stderr</b><pre style="white-space:pre-wrap;margin:6px 0 0;padding:8px;border:1px solid var(--pp-border);border-radius:12px;background:rgba(11,18,32,.04)">${esc(r.stderr)}</pre></div>` : ""}
        ${r.error ? `<div style="margin-top:8px"><b style="color:#b91c1c">Error</b><pre style="white-space:pre-wrap;margin:6px 0 0;padding:8px;border:1px solid #f3c7c7;border-radius:12px;background:rgba(185,28,28,.06)">${esc(r.error)}</pre></div>` : ""}
      </div>
    `;
  }).join("");

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

  // attempts + submission (Run All)
  if (captureSubmission) {
    const used = incAttempts(currentProblemId);

    const student = loadStudent();
    addSubmission({
      ts: new Date().toISOString(),
      day: getLocalDayKey(),
      problemId: currentProblemId,
      problemTitle: p.title,
      score,
      passed: pass,
      total,
      attemptsToday: used,
      studentName: student.name || "",
      studentRoll: student.roll || "",
      code: userCode,
    });
    updateTeacherPanelCount();
  }

  ui.runSamples.disabled = false;
  ui.runAll.disabled = false;
}

// ---------- Packages ----------
async function installPkgs() {
  if (effectiveClassroomMode()) return toast("Packages disabled in Classroom Mode");
  const raw = (ui.pkgs.value || "").trim();
  if (!raw) return toast("No packages");
  const pkgs = raw.split(/[, ]+/).map(s => s.trim()).filter(Boolean);

  writeStdout("— Installing —\n", false);
  writeStderr("", false);
  setStatus("Installing…", "warn");

  worker.postMessage({ type: "INSTALL", pkgs, policy: classPolicy() });
  setStatus("Requested install…", "warn");
}
function listPkgs() {
  writeStdout("— Installed packages —\n", false);
  writeStderr("", false);
  worker.postMessage({ type: "LIST_PKGS" });
}

// ---------- Share ----------
function share() {
  state.tabs[currentTab].code = ui.code.value;
  const payload = { tabs: state.tabs, currentTab, stdin: ui.stdin.value || "", problem: currentProblemId || "" };
  const json = JSON.stringify(payload);
  const b64 = btoa(unescape(encodeURIComponent(json))).replaceAll("+","-").replaceAll("/","_").replaceAll("=","");
  const url = location.origin + location.pathname + "#" + b64;
  navigator.clipboard?.writeText(url).then(() => toast("Share link copied")).catch(() => prompt("Copy link:", url));
}

function loadFromHash() {
  const h = location.hash.replace("#", "");
  if (!h) return;
  try {
    let b64 = h.replaceAll("-", "+").replaceAll("_", "/");
    while (b64.length % 4) b64 += "=";
    const json = decodeURIComponent(escape(atob(b64)));
    const payload = JSON.parse(json);
    if (payload?.tabs?.length) {
      state.tabs = payload.tabs;
      currentTab = clamp(payload.currentTab || 0, 0, state.tabs.length - 1);
      ui.stdin.value = payload.stdin || "";
      ui.code.value = state.tabs[currentTab].code || "";
      saveState();
      saveStdin();
    }
    if (payload?.problem) currentProblemId = payload.problem;
  } catch {}
}

// ---------- teacher panel actions ----------
function bindTeacherPanel() {
  if (!TEACHER_UI) return;

  ui.tpForceClass.checked = !!teacherCfg.forceClassroom;
  ui.tpExam.checked = !!teacherCfg.examMode;
  ui.tpLockProblem.checked = !!teacherCfg.lockProblem;
  ui.tpAttempts.value = String(teacherCfg.attemptLimit || 0);

  ui.tpForceClass.addEventListener("change", () => {
    teacherCfg.forceClassroom = !!ui.tpForceClass.checked;
    saveTeacherCfg(teacherCfg);
    applyModeUI();
    makeWorker();
  });

  ui.tpExam.addEventListener("change", () => {
    teacherCfg.examMode = !!ui.tpExam.checked;
    saveTeacherCfg(teacherCfg);
    applyModeUI();
  });

  ui.tpLockProblem.addEventListener("change", () => {
    teacherCfg.lockProblem = !!ui.tpLockProblem.checked;
    saveTeacherCfg(teacherCfg);
    applyModeUI();
  });

  ui.tpAttempts.addEventListener("change", () => {
    const v = Math.max(0, parseInt(ui.tpAttempts.value || "0", 10) || 0);
    teacherCfg.attemptLimit = v;
    ui.tpAttempts.value = String(v);
    saveTeacherCfg(teacherCfg);
    toast(v ? `Attempt limit set: ${v}` : "Attempt limit removed");
  });

  ui.tpExport.addEventListener("click", () => {
    const data = loadSubmissions();
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), submissions: data }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `submissions_${getLocalDayKey()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast("Exported submissions JSON");
  });

  ui.tpClear.addEventListener("click", () => {
    if (!confirm("Clear ALL submissions on this device?")) return;
    saveSubmissions([]);
    updateTeacherPanelCount();
    toast("Cleared submissions");
  });
}

// ---------- student card bindings ----------
function bindStudentCard() {
  if (!STUDENT_LOCKED) return;
  const s = loadStudent();
  ui.studentName.value = s.name;
  ui.studentRoll.value = s.roll;

  const saveNow = () => {
    saveStudent({ name: ui.studentName.value || "", roll: ui.studentRoll.value || "" });
  };
  ui.studentName.addEventListener("input", saveNow);
  ui.studentRoll.addEventListener("input", saveNow);
}

// ---------- bindings ----------
btn.run.onclick = run;
btn.stop.onclick = stop;
btn.format.onclick = basicFormat;
btn.save.onclick = () => { state.tabs[currentTab].code = ui.code.value; saveState(); saveStdin(); toast("Saved"); };
btn.share.onclick = share;

btn.newTab.onclick = newTab;
btn.delTab.onclick = delTab;

btn.install.onclick = installPkgs;
btn.list.onclick = listPkgs;

btn.sample.onclick = () => { ui.stdin.value = "5\n10\n20\n30\n40\n50\n"; saveStdin(); toast("stdin sample filled"); };
btn.clearStdin.onclick = () => { ui.stdin.value = ""; saveStdin(); toast("stdin cleared"); };

btn.copyOut.onclick = () => {
  const t = (ui.out.textContent || "") + "\n" + (ui.err.textContent || "");
  navigator.clipboard?.writeText(t).then(() => toast("Output copied")).catch(() => prompt("Copy:", t));
};
btn.clearOut.onclick = () => { ui.out.textContent = ""; ui.err.textContent = ""; toast("Cleared"); };

ui.example.onchange = () => {
  const i = parseInt(ui.example.value, 10);
  if (Number.isFinite(i) && EXAMPLES[i]) {
    ui.code.value = EXAMPLES[i].code;
    updateGutter();
    autosave();
    toast("Example loaded");
  }
  ui.example.value = "";
};

// shortcuts
ui.code.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); run(); }
  if (e.key === "Tab") {
    e.preventDefault();
    const mode = ui.indent.value;
    const ins = (mode === "tab") ? "\t" : " ".repeat(parseInt(mode, 10) || 4);
    const el = ui.code;
    const s = el.selectionStart, t = el.selectionEnd;
    if (s !== t) {
      const v = el.value;
      const ls = v.lastIndexOf("\n", s - 1) + 1;
      const le = v.indexOf("\n", t);
      const end = (le === -1) ? v.length : le;
      const block = v.slice(ls, end).split("\n").map(line => ins + line).join("\n");
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

// problem mode
ui.problemSel.onchange = () => { showProblem(ui.problemSel.value); toast("Problem loaded"); };
ui.todayBtn.onclick = () => {
  const id = pickTodayProblemId();
  ui.problemSel.value = id;
  showProblem(id);
  toast("Today’s problem loaded");
};

ui.loadStarter.onclick = loadStarterIntoEditor;
ui.resetStarter.onclick = resetToStarter;
ui.hintBtn.onclick = showHint;

ui.runSamples.onclick = async () => {
  const p = getProblemById(currentProblemId);
  if (!p) return toast("Pick a problem");
  await runJudge(p.examples.map(e => ({ input: e.input, output: e.output, hidden: false })), "Samples", false);
};

ui.runAll.onclick = async () => {
  const p = getProblemById(currentProblemId);
  if (!p) return toast("Pick a problem");
  await runJudge(p.tests, "All tests", true);
};

btn.classroom.onclick = () => {
  if (STUDENT_LOCKED) return;
  classroomMode = !classroomMode;
  saveClassroomMode(classroomMode);
  applyModeUI();
  makeWorker();
};

// ---------- init ----------
function init() {
  setXP(getXP());
  setStreak(getStreak());

  loadFromHash();

  renderTabs();
  renderProblems();
  loadStdin();

  ui.code.value = state.tabs[currentTab].code || "";
  updateGutter();
  btn.stop.disabled = true;

  // bind teacher/student
  bindTeacherPanel();
  bindStudentCard();

  // init problems
  const pid = currentProblemId || pickTodayProblemId();
  ui.problemSel.value = pid;
  showProblem(pid);

  applyModeUI();

  makeWorker();
  setStatus("Ready.", "ok");
  setProgress(0);
}

init();
