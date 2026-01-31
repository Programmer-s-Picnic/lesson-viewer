// Programmer's Picnic — Pyodide Editor (Judge v2)
// Modes:
//   ?tmode=1 => Teacher mode (Teacher Panel visible)
//   ?tmode=0 => Student mode (Classroom forced ON, teacher controls hidden)
// Share button is enabled in both modes.

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
  gutter: $("ppGutter"),
  out: $("ppOut"),
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

// Single submissions store (avoid redeclare bug)
const K_SUBS = "pp_class_submissions_v1";

// ----- Judge timeout -----
const JUDGE_TIMEOUT_MS = 2500;
ui.timeout.textContent = (JUDGE_TIMEOUT_MS / 1000).toFixed(1);

// ----- Problems -----
const PROBLEMS = [
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

  {
    id: "check_primes",
    title: "Check for Prime Number",
    level: "Easy",
    statement: "Given n print True if n is prime else print False",
    starter:
      "def isPrime(n):\n    if n<0:\n        n=-n\n    if n in (0,1):\n        return False\n    limit=n**0.5\n    i=2\n    while i<=limit:\n        if n % i==0:\n            return False\n        i+=1\n    return True\nn=int(input())\nresult=isPrime(n)\nprint(result)",
    examples: [{ input: "1200\n", output: "False\n" }],
    tests: [
      { input: "11\n", output: "True\n", hidden: false },
      { input: "97\n", output: "True\n", hidden: false },
      { input: "10\n", output: "False\n", hidden: false },
    ],
    hints: ["Use a while loop and check remainder", "Use % "],
  },
];

const EXAMPLES = [
  {
    title: "Hello + loops",
    code: 'print("Hello")\nfor i in range(3):\n    print(i)\n',
  },
  {
    title: "stdin + sum",
    code: "n=int(input())\nt=0\nfor _ in range(n):\n    t+=int(input())\nprint(t)\n",
  },
  { title: "prime + n", code: "n=int(input())\nprint(True)\n" },
];

const DEFAULT_TABS = [
  { name: "main.py", code: 'print("Namaste Champak 👋")\n' },
];

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

// ----- Submissions (single definition) -----
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

function classPolicy() {
  // If packages are allowed, do not block imports; otherwise classroom blocks most imports.
  const pkgOK = !!allowPackages;
  return {
    disable_open: classroomMode,
    disable_eval_exec: false,
    block_imports: classroomMode && !pkgOK,
    allow_imports: classroomMode && !pkgOK ? ["math"] : [],
    allow_micropip: pkgOK,
  };
}
function makeWorker() {
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
      writeStdout(msg.text || "", false);
      return;
    }
    if (msg.type === "INSTALLED") {
      writeStdout("Installed: " + (msg.pkgs || []).join(", ") + "\n", true);
      return;
    }
    if (msg.type === "ERR") {
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
      makeWorker();
      reject(new Error("TIMEOUT"));
    }, JUDGE_TIMEOUT_MS);
  });
}

// ----- Output helpers -----
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

// ----- Run -----
async function run() {
  btn.run.disabled = true;
  btn.stop.disabled = false;
  writeStdout("— Running —\n", false);
  writeStderr("", false);
  state.tabs[currentTab].code = ui.code.value;
  saveState();
  try {
    setStatus("Running…", "warn");
    const t0 = performance.now();
    const r = await runInWorker(ui.code.value || "", ui.stdin.value || "");
    const t1 = performance.now();
    writeStdout(r.stdout || "", false);
    writeStderr(r.stderr ? "— stderr —\n" + (r.stderr || "") : "", false);
    if (!r.ok) {
      writeStderr((r.error || "Runtime error") + "\n", true);
      setStatus("Error.", "bad");
    } else {
      setStatus("Done.", "ok");
    }
    if (ui.timer.checked)
      writeStdout(`\n✓ Done (${Math.round(t1 - t0)} ms)\n`, true);
    else writeStdout("\n✓ Done\n", true);
  } catch (err) {
    const isTimeout = String(err?.message || "").includes("TIMEOUT");
    writeStderr(
      isTimeout
        ? "✗ Timeout (infinite loop?)\n"
        : "✗ " + (err?.message || String(err)) + "\n",
      false,
    );
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
        <div style="margin-top:6px"><b>Input</b><pre class="pp-mono" style="margin:6px 0 0;padding:8px;border:1px solid var(--pp-border);border-radius:12px;background:rgba(11,18,32,.04)">${esc(r.input)}</pre></div>
        ${showExpected ? `<div style="margin-top:8px"><b>Expected</b><pre class="pp-mono" style="margin:6px 0 0;padding:8px;border:1px solid var(--pp-border);border-radius:12px;background:rgba(11,18,32,.04)">${expText}</pre></div>` : ""}
        <div style="margin-top:8px"><b>Got (stdout)</b><pre class="pp-mono" style="margin:6px 0 0;padding:8px;border:1px solid var(--pp-border);border-radius:12px;background:rgba(11,18,32,.04)">${gotText}</pre></div>
        ${r.stderr ? `<div style="margin-top:8px"><b>stderr</b><pre class="pp-mono" style="margin:6px 0 0;padding:8px;border:1px solid var(--pp-border);border-radius:12px;background:rgba(11,18,32,.04)">${esc(r.stderr)}</pre></div>` : ""}
        ${r.error ? `<div style="margin-top:8px"><b style="color:#b91c1c">Error</b><pre class="pp-mono" style="margin:6px 0 0;padding:8px;border:1px solid #f3c7c7;border-radius:12px;background:rgba(185,28,28,.06)">${esc(r.error)}</pre></div>` : ""}
      </td>
      <td>${r.ok ? `<span style="color:var(--pp-ok);font-weight:900">PASS</span>` : `<span style="color:var(--pp-bad);font-weight:900">FAIL</span>`}</td>
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
  const raw = (ui.pkgs.value || "").trim();
  if (!raw) return toast("No packages");
  const pkgs = raw
    .split(/[, ]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  writeStdout("— Installing —\n", false);
  writeStderr("", false);
  setStatus("Installing…", "warn");
  worker.postMessage({ type: "INSTALL", pkgs, policy: classPolicy() });
  toast("Install requested");
}
function listPkgs() {
  writeStdout("— Installed packages —\n", false);
  writeStderr("", false);
  worker.postMessage({ type: "LIST_PKGS" });
}

// ----- Share -----
function share() {
  state.tabs[currentTab].code = ui.code.value;
  const payload = {
    tabs: state.tabs,
    currentTab,
    stdin: ui.stdin.value || "",
    problem: currentProblemId || "",
    tmode: TM || "",
  };
  const json = JSON.stringify(payload);
  const b64 = btoa(unescape(encodeURIComponent(json)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
  const url = location.origin + location.pathname + location.search + "#" + b64;
  navigator.clipboard
    ?.writeText(url)
    .then(() => toast("Share link copied"))
    .catch(() => prompt("Copy link:", url));
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
  ui.teacherPanel.style.display = TEACHER_UI ? "block" : "none";

  // share is always available (your request)
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
    makeWorker();
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
    makeWorker();
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

btn.copyOut.onclick = () => {
  const t = (ui.out.textContent || "") + "\n" + (ui.err.textContent || "");
  navigator.clipboard
    ?.writeText(t)
    .then(() => toast("Output copied"))
    .catch(() => prompt("Copy:", t));
};
btn.clearOut.onclick = () => {
  ui.out.textContent = "";
  ui.err.textContent = "";
  toast("Cleared");
};

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
function init() {
  setXP(getXP());
  setStreak(getStreak());
  updateSubCount();

  // restore hash state first
  loadFromHash();

  // stdin
  ui.stdin.value = localStorage.getItem(K_STDIN) || "";
  ui.stdin.addEventListener("input", () =>
    localStorage.setItem(K_STDIN, ui.stdin.value || ""),
  );

  loadStudent();

  renderTabs();
  renderProblems();

  ui.code.value = state.tabs[currentTab].code || "";
  updateGutter();
  btn.stop.disabled = true;

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
