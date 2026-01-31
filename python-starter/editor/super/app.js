/* ==========================================================
   Programmer’s Picnic — Pyodide Judge v2
   Teacher/Student Mode + Problems + Attempts + XP + Packages
   ========================================================== */

(function () {
  "use strict";

  /* ----------------- DOM HELPERS ----------------- */
  const $ = (id) => document.getElementById(id);

  function escapeHtml(s) {
    return (s ?? "").toString()
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

function loadInstalledPkgs(){
  try{
    const raw = localStorage.getItem(K_INSTALLED_PKGS);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  }catch{ return []; }
}
function saveInstalledPkgs(arr){
  try{ localStorage.setItem(K_INSTALLED_PKGS, JSON.stringify(arr||[])); }catch{}
}
function renderInstalledPkgs(){
  if(!ui.installedPkgs) return;
  const arr = loadInstalledPkgs();
  if(!arr.length){
    ui.installedPkgs.textContent = "—";
    return;
  }
  ui.installedPkgs.innerHTML = arr.map(p=>`<span class="pp-kbd" style="margin:0">${escapeHtml(p)}</span>`).join("");
}

  /* ----------------- URL MODE ----------------- */
  const URLP = new URLSearchParams(location.search);
  const IS_TEACHER = (URLP.get("tmode") === "1");

  /* ----------------- STORAGE KEYS ----------------- */
  const K_STATE = "pp_state_v2";
  const K_STDIN = "pp_stdin_v2";
  const K_POLICY = "pp_policy_v2";
  const K_PKGS = "pp_pkgs_v2";
const K_INSTALLED_PKGS = "pp_installed_pkgs_v1";
  const K_XP = "pp_xp_v2";
  const K_STREAK = "pp_streak_v2";
  const K_ATTEMPTS = "pp_attempts_v2";
  const K_LAST_DAY = "pp_last_day_v2";
  const K_STU_NAME = "pp_student_name_v2";
  const K_STU_ROLL = "pp_student_roll_v2";

// ---- Custom Problems Store (builder exports + optional remote JSON) ----
const K_PROBLEMS_LOCAL = "pp_problems_custom_v1";
const K_PROBLEMS_REMOTE_CACHE = "pp_problems_remote_cache_v1";
const K_PROBLEMS_REMOTE_URL = "pp_problems_remote_url_v1";

function loadCustomProblems(){
  try{
    const raw = localStorage.getItem(K_PROBLEMS_LOCAL);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  }catch{ return []; }
}
function saveCustomProblems(arr){
  try{ localStorage.setItem(K_PROBLEMS_LOCAL, JSON.stringify(arr)); }catch{}
}

function loadRemoteCache(){
  try{
    const raw = localStorage.getItem(K_PROBLEMS_REMOTE_CACHE);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  }catch{ return []; }
}
function saveRemoteCache(url, arr){
  try{
    localStorage.setItem(K_PROBLEMS_REMOTE_URL, url || "");
    localStorage.setItem(K_PROBLEMS_REMOTE_CACHE, JSON.stringify(arr || []));
  }catch{}
}

function isProblemValid(p){
  return !!(p && p.id && p.title && p.statement && Array.isArray(p.tests));
}

async function loadProblemsFromURL(url){
  const u = String(url||"").trim();
  if(!u) return [];
  try{
    const res = await fetch(u, { cache: "no-store" });
    if(!res.ok) throw new Error("HTTP " + res.status);
    const arr = await res.json();
    if(!Array.isArray(arr)) throw new Error("JSON must be an array");
    const cleaned = arr.filter(isProblemValid).map(p => ({
      id: String(p.id),
      title: String(p.title),
      level: String(p.level || "Easy"),
      statement: String(p.statement || ""),
      starter: String(p.starter || "n=int(input())\n# TODO\n"),
      examples: Array.isArray(p.examples) ? p.examples : [],
      tests: Array.isArray(p.tests) ? p.tests.map(t => ({
        input: String(t.input || ""),
        output: String(t.output || ""),
        hidden: !!t.hidden
      })) : [],
      hints: Array.isArray(p.hints) ? p.hints.map(String) : [],
    }));
    saveRemoteCache(u, cleaned);
    return cleaned;
  }catch(e){
    const cachedURL = localStorage.getItem(K_PROBLEMS_REMOTE_URL) || "";
    if(cachedURL === u){
      return loadRemoteCache();
    }
    return [];
  }
}

async function loadCodeFromURL(url){
  const u = String(url||"").trim();
  if(!u) return null;
  try{
    const res = await fetch(u, { cache: "no-store" });
    if(!res.ok) throw new Error("HTTP " + res.status);
    const payload = await res.json();

    // Accepted formats:
    // 1) { tabs:[{name,code}], currentTab, stdin, problem }
    // 2) { code:"print(...)" }  -> becomes one tab main.py
    // 3) [{name,code}, ...] -> tabs array
    let tabs = null;
    let currentTabRemote = 0;
    let stdin = "";
    let problem = "";

    if(Array.isArray(payload)){
      tabs = payload;
    }else if(payload && typeof payload === "object"){
      if(Array.isArray(payload.tabs)) tabs = payload.tabs;
      else if(typeof payload.code === "string") tabs = [{ name:"main.py", code: payload.code }];
      currentTabRemote = payload.currentTab ?? payload.current_tab ?? 0;
      stdin = payload.stdin ?? "";
      problem = payload.problem ?? "";
    }

    if(!Array.isArray(tabs) || !tabs.length) throw new Error("Invalid code JSON");
    tabs = tabs.map((t,i)=>({
      name: String(t?.name || (i===0?"main.py":("file"+(i+1)+".py"))),
      code: String(t?.code || "")
    }));

    return { tabs, currentTab: currentTabRemote, stdin: String(stdin||""), problem: String(problem||"") };
  }catch(e){
    return null;
  }
}

async function loadTextFileFromURL(url){
  const u = String(url||"").trim();
  if(!u) return null;
  try{
    const res = await fetch(u, { cache: "no-store" });
    if(!res.ok) throw new Error("HTTP " + res.status);
    const txt = await res.text();
    return String(txt ?? "");
  }catch(e){
    return null;
  }
}

  /* ----------------- DEFAULT PROBLEMS ----------------- */
  const DEFAULT_PROBLEMS = [
    {
      id: "sum_n",
      title: "Sum of first N numbers",
      level: "Easy",
      statement:
        "Input: N (integer)\nOutput: sum of 1..N\n\nExample:\nInput: 5\nOutput: 15",
      starter: "n=int(input())\nprint(n*(n+1)//2)\n",
      examples: [
        { input: "5\n", output: "15\n" },
        { input: "10\n", output: "55\n" }
      ],
      tests: [
        { input: "1\n", output: "1\n", hidden: false },
        { input: "5\n", output: "15\n", hidden: false },
        { input: "100\n", output: "5050\n", hidden: true }
      ],
      hints: ["Use formula n*(n+1)//2"]
    },
    {
      id: "reverse_num",
      title: "Reverse number",
      level: "Easy",
      statement:
        "Input: N (non-negative integer)\nOutput: digits reversed (no leading zeros)\n\nExample:\nInput: 1200\nOutput: 21",
      starter: "n=int(input())\nprint(str(n)[::-1].lstrip('0') or '0')\n",
      examples: [{ input: "1200\n", output: "21\n" }],
      tests: [
        { input: "123\n", output: "321\n", hidden: false },
        { input: "9070\n", output: "709\n", hidden: true },
        { input: "0\n", output: "0\n", hidden: true }
      ],
      hints: ["String reverse works; strip leading zeros"]
    }
  ];

let PROBLEMS = [];

  /* ----------------- UI REFS ----------------- */
  const ui = {
    app: $("ppApp"),
    teacherPanel: $("ppTeacherPanel"),
    tBadge: $("ppModeBadge"),
    studentBox: $("ppStudentBox"),
    studentName: $("ppStudentName"),
    studentRoll: $("ppStudentRoll"),
    tabs: $("ppTabs"),
    gutter: $("ppGutter"),
    code: $("ppCode"),
    stdin: $("ppStdin"),
    out: $("ppOut"),
    err: $("ppErr"),
    statusDot: $("ppDot"),
    statusTxt: $("ppStatusTxt"),
    progress: $("ppBar"),

    problemSel: $("ppProblemSel"),
    problemCard: $("ppProblemCard"),
    probTitle: $("ppProbTitle"),
    probStatement: $("ppProbStatement"),
    probHints: $("ppProbHints"),
    probExamples: $("ppProbExamples"),
    attemptBadge: $("ppAttemptBadge"),

    policyBlock: $("ppPolicyBlock"),
    toggleClassroom: $("ppToggleClassroom"),
    toggleImports: $("ppToggleImports"),
    toggleOpen: $("ppToggleOpen"),
    toggleEvalExec: $("ppToggleEvalExec"),
    allowPkgs: $("ppAllowPkgs"),
    pkgs: $("ppPkgs"),
  installedPkgs: $("ppInstalledPkgs"),

    xpTxt: $("ppXp"),
    streakTxt: $("ppStreak"),

    toast: $("ppToast")
  };

  const btn = {
    run: $("ppRun"),
    stop: $("ppStop"),
    clear: $("ppClear"),
    save: $("ppSave"),
    load: $("ppLoad"),
    share: $("ppShare"),

    runSamples: $("ppRunSamples"),
    runAll: $("ppRunAll"),
    install: $("ppInstall"),
    listPkgs: $("ppListPkgs")
  };

  /* ----------------- STATE ----------------- */
  const DEFAULT_TABS = [
    { name: "main.py", code: "print('Namaste from Programmer\\'s Picnic!')\\n" },
    { name: "notes.txt", code: "Write your notes here.\\n" }
  ];

  function freshState() {
    return {
      tabs: structuredClone(DEFAULT_TABS),
      currentTab: 0
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(K_STATE);
      if (!raw) return freshState();
      const st = JSON.parse(raw);
      if (!st?.tabs?.length) return freshState();
      return st;
    } catch {
      return freshState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(K_STATE, JSON.stringify(state));
    } catch {}
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function setStatus(txt, kind = "ok") {
    ui.statusTxt.textContent = txt;
    ui.statusDot.className = "pp-dot " + kind;
  }

  function setProgress(p) {
    ui.progress.style.width = clamp(p, 0, 100) + "%";
  }

  function toast(msg) {
    ui.toast.textContent = msg;
    ui.toast.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => ui.toast.classList.remove("show"), 1600);
  }

  /* ----------------- MODES ----------------- */
  function initModeUI() {
    ui.teacherPanel.style.display = IS_TEACHER ? "block" : "none";
    ui.tBadge.textContent = IS_TEACHER ? "Teacher Mode" : "Student Mode";
    ui.studentBox.style.display = IS_TEACHER ? "none" : "block";
  }

  /* ----------------- POLICY ----------------- */
  function defaultPolicy() {
    return {
      classroom: true,
      block_imports: true,
      allow_imports: ["math", "random"],
      disable_open: true,
      disable_eval_exec: false,
      allow_micropip: false
    };
  }

  function loadPolicy() {
    try {
      const raw = localStorage.getItem(K_POLICY);
      return raw ? JSON.parse(raw) : defaultPolicy();
    } catch {
      return defaultPolicy();
    }
  }

  function savePolicy(p) {
    try {
      localStorage.setItem(K_POLICY, JSON.stringify(p));
    } catch {}
  }

  function classPolicy() {
    if (!IS_TEACHER) return loadPolicy();
    return policy;
  }

  function renderPolicy() {
    ui.policyBlock.textContent = JSON.stringify(policy, null, 2);
    ui.toggleClassroom.checked = !!policy.classroom;
    ui.toggleImports.checked = !!policy.block_imports;
    ui.toggleOpen.checked = !!policy.disable_open;
    ui.toggleEvalExec.checked = !!policy.disable_eval_exec;
    ui.allowPkgs.checked = !!policy.allow_micropip;
  }

  /* ----------------- XP/STREAK ----------------- */
  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
  }

  function loadXP() {
    return parseInt(localStorage.getItem(K_XP) || "0", 10) || 0;
  }
  function saveXP(v) {
    localStorage.setItem(K_XP, String(v));
  }
  function loadStreakObj() {
    try { return JSON.parse(localStorage.getItem(K_STREAK) || "{}"); } catch { return {}; }
  }
  function saveStreakObj(o) {
    localStorage.setItem(K_STREAK, JSON.stringify(o));
  }
  function updateXPAndStreak(addXP) {
    let xp = loadXP();
    xp += addXP;
    saveXP(xp);

    const day = todayKey();
    const streakObj = loadStreakObj();
    const last = streakObj.lastDay || "";
    let streak = parseInt(streakObj.streak || "0", 10) || 0;

    if (last !== day) {
      const lastDate = last ? new Date(last) : null;
      const today = new Date(day);
      const diff = lastDate ? Math.round((today - lastDate) / 86400000) : 999;
      if (diff === 1) streak += 1;
      else streak = 1;
      streakObj.lastDay = day;
      streakObj.streak = streak;
      saveStreakObj(streakObj);
    }

    ui.xpTxt.textContent = String(xp);
    ui.streakTxt.textContent = String(streakObj.streak || 0);
  }

  function renderXPStreak() {
    ui.xpTxt.textContent = String(loadXP());
    const s = loadStreakObj();
    ui.streakTxt.textContent = String(s.streak || 0);
  }

  /* ----------------- ATTEMPTS ----------------- */
  function attemptsKey(pid) {
    return `${K_ATTEMPTS}:${pid}:${todayKey()}`;
  }
  function loadAttempts(pid) {
    return parseInt(localStorage.getItem(attemptsKey(pid)) || "0", 10) || 0;
  }
  function incAttempts(pid) {
    const k = attemptsKey(pid);
    const v = loadAttempts(pid) + 1;
    localStorage.setItem(k, String(v));
    return v;
  }

  /* ----------------- TABS/UI ----------------- */
  let state = loadState();
  let currentTab = clamp(parseInt(state.currentTab || 0, 10) || 0, 0, state.tabs.length-1);

  function renderTabs() {
    ui.tabs.innerHTML = "";
    state.tabs.forEach((t, i) => {
      const b = document.createElement("button");
      b.className = "pp-tab" + (i === currentTab ? " pp-active" : "");
      b.textContent = t.name;
      b.addEventListener("click", () => {
        state.tabs[currentTab].code = ui.code.value;
        currentTab = i;
        state.currentTab = currentTab;
        ui.code.value = state.tabs[currentTab].code || "";
        saveState();
        renderTabs();
        renderGutter();
      });
      ui.tabs.appendChild(b);
    });
    renderGutter();
  }

  function renderGutter() {
    const lines = (ui.code.value || "").split("\n").length;
    let g = "";
    for (let i = 1; i <= lines; i++) g += i + "\n";
    ui.gutter.textContent = g;
  }

  ui.code.addEventListener("input", () => {
    state.tabs[currentTab].code = ui.code.value;
    saveState();
    renderGutter();
  });

  /* ----------------- PROBLEMS ----------------- */
  let currentProblemId = PROBLEMS[0]?.id || "sum_n";

  function renderProblems() {
    ui.problemSel.innerHTML = "";
    PROBLEMS.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = `${p.title} (${p.level})`;
      ui.problemSel.appendChild(opt);
    });
    if (!PROBLEMS.find(p => p.id === currentProblemId)) {
      currentProblemId = PROBLEMS[0]?.id || "";
    }
    ui.problemSel.value = currentProblemId;
    showProblem(currentProblemId);
  }

  function showProblem(pid) {
    const p = PROBLEMS.find(x => x.id === pid);
    if (!p) return;
    currentProblemId = pid;

    ui.probTitle.textContent = p.title + " — " + p.level;
    ui.probStatement.textContent = p.statement;

    ui.probHints.innerHTML = (p.hints || []).map(h => `<li>${escapeHtml(h)}</li>`).join("") || "<li>—</li>";
    ui.probExamples.innerHTML = (p.examples || []).map(ex =>
      `<div class="pp-judge">
        <h3>Example</h3>
        <div class="pp-grid2">
          <div><div class="pp-small">Input</div><pre class="pp-out">${escapeHtml(ex.input)}</pre></div>
          <div><div class="pp-small">Output</div><pre class="pp-out">${escapeHtml(ex.output)}</pre></div>
        </div>
      </div>`
    ).join("") || "";

    const a = loadAttempts(pid);
    ui.attemptBadge.textContent = `Attempts today: ${a}`;

    if (!IS_TEACHER && p.starter) {
      state.tabs[0].code = p.starter;
      currentTab = 0;
      state.currentTab = 0;
      ui.code.value = state.tabs[0].code;
      saveState();
      renderTabs();
    }
  }

  ui.problemSel.addEventListener("change", () => showProblem(ui.problemSel.value));

  /* ----------------- WORKER (PYODIDE) ----------------- */
let worker=null, pendingResolve=null, pendingReject=null, runTimer=null;
let packagesInstalled=false;

function makeWorker(force=false){
  if(worker && !force && packagesInstalled){ return; }
  if(worker) worker.terminate();
  worker=new Worker("./judge-worker.js");
  worker.onmessage=(ev)=>{
    const msg = ev.data || {};
    if(msg.type==="READY"){
      setStatus("Ready", "ok");
      setProgress(0);
      return;
    }
    if(msg.type==="RUN_RESULT"){
      clearTimeout(runTimer);
      runTimer=null;
      setProgress(100);
      pendingResolve?.(msg.result);
      pendingResolve=pendingReject=null;
      return;
    }
    if(msg.type==="ERR"){
      clearTimeout(runTimer);
      runTimer=null;
      setStatus("Worker error", "bad");
      writeStderr(msg.message+"\n");
      pendingReject?.(new Error(msg.message));
      pendingResolve=pendingReject=null;
      return;
    }
    if(msg.type==="INSTALLED"){ packagesInstalled=true;
      const prev = new Set(loadInstalledPkgs());
      (msg.pkgs||[]).forEach(p=>prev.add(String(p)));
      saveInstalledPkgs(Array.from(prev).sort());
      renderInstalledPkgs();
      writeStdout("Installed: "+(msg.pkgs||[]).join(", ")+"\n", true); return; }
    if(msg.type==="PKG_LIST"){
      writeStdout("\n--- Available modules (first 4000) ---\n"+msg.text+"\n", true);
      return;
    }
  };
  worker.postMessage({ type:"INIT", policy: classPolicy() });
}

  function stopWorker() {
    if(worker) worker.terminate();
    worker=null;
    packagesInstalled=false;
    makeWorker(true);
  }

  function runOne(code, stdin, timeoutMs=3000) {
    return new Promise((resolve, reject) => {
      pendingResolve = resolve;
      pendingReject = reject;
      setStatus("Running...", "warn");
      setProgress(10);
      worker.postMessage({ type:"RUN_ONE", code, stdin, policy: classPolicy() });
      runTimer=setTimeout(()=>{
        setStatus("Timed out", "bad");
        writeStderr("\n[Timeout] Execution exceeded "+timeoutMs+"ms\n");
        try{ worker.terminate(); }catch{}
        worker=null;
        makeWorker(true);
        reject(new Error("timeout"));
      }, timeoutMs);
    });
  }

  /* ----------------- OUTPUT ----------------- */
  function writeStdout(s, append=false) {
    if(!append) ui.out.textContent = "";
    ui.out.textContent += s;
    ui.out.scrollTop = ui.out.scrollHeight;
  }
  function writeStderr(s, append=true) {
    if(!append) ui.err.textContent = "";
    ui.err.textContent += s;
    ui.err.scrollTop = ui.err.scrollHeight;
  }
  function clearOut() {
    ui.out.textContent = "";
    ui.err.textContent = "";
  }

  /* ----------------- SHARE (HASH STATE) ----------------- */
  function encodeStateToHash() {
    try{
      const payload = {
        tabs: state.tabs.map(t => ({ name: t.name, code: t.code })),
        currentTab,
        stdin: ui.stdin.value || "",
        problem: currentProblemId
      };
      const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
      return "#pp=" + b64;
    }catch{
      return "";
    }
  }

  function loadFromHash() {
    try{
      const h = location.hash || "";
      if(!h.startsWith("#pp=")) return;
      const b64 = h.slice(4);
      const txt = decodeURIComponent(escape(atob(b64)));
      const payload = JSON.parse(txt);
      if(payload?.tabs?.length){
        state.tabs = payload.tabs.map(t => ({ name: t.name || "main.py", code: t.code || "" }));
        currentTab = clamp(parseInt(payload.currentTab||0,10)||0, 0, state.tabs.length-1);
        state.currentTab = currentTab;
        ui.stdin.value = payload.stdin || "";
        localStorage.setItem(K_STDIN, ui.stdin.value);
        if(payload.problem) currentProblemId = payload.problem;
        saveState();
      }
    }catch{}
  }

  async function copyShareLink() {
    const hash = encodeStateToHash();
    const url = location.origin + location.pathname + location.search + hash;
    try{
      await navigator.clipboard.writeText(url);
      toast("Link copied");
    }catch{
      prompt("Copy link:", url);
    }
  }

  /* ----------------- TEACHER PANEL ----------------- */
  function wireTeacherPanel() {
    if(!IS_TEACHER) return;

    ui.toggleClassroom.addEventListener("change", () => {
      policy.classroom = ui.toggleClassroom.checked;
      savePolicy(policy);
      renderPolicy();
      stopWorker();
      makeWorker(true);
    });
    ui.toggleImports.addEventListener("change", () => {
      policy.block_imports = ui.toggleImports.checked;
      savePolicy(policy);
      renderPolicy();
      stopWorker();
      makeWorker(true);
    });
    ui.toggleOpen.addEventListener("change", () => {
      policy.disable_open = ui.toggleOpen.checked;
      savePolicy(policy);
      renderPolicy();
      stopWorker();
      makeWorker(true);
    });
    ui.toggleEvalExec.addEventListener("change", () => {
      policy.disable_eval_exec = ui.toggleEvalExec.checked;
      savePolicy(policy);
      renderPolicy();
      stopWorker();
      makeWorker(true);
    });
    ui.allowPkgs.addEventListener("change", () => {
      policy.allow_micropip = ui.allowPkgs.checked;
      savePolicy(policy);
      renderPolicy();
      stopWorker();
      makeWorker(true);
    });
    ui.pkgs.addEventListener("input", () => {
      localStorage.setItem(K_PKGS, ui.pkgs.value || "");
    });
  }

  /* ----------------- BUTTONS ----------------- */
  btn.run.addEventListener("click", async () => {
    clearOut();
    setProgress(0);
    const code = ui.code.value || "";
    const stdin = ui.stdin.value || "";
    try{
      const res = await runOne(code, stdin, 4000);
      if(res.stdout) writeStdout(res.stdout, true);
      if(res.stderr) writeStderr(res.stderr, true);
      if(res.ok) setStatus("Done", "ok");
      else setStatus("Error", "bad"), writeStderr(res.error+"\n", true);
    }catch(e){
      setStatus("Stopped", "bad");
    }
  });

  btn.stop.addEventListener("click", () => {
    stopWorker();
    setStatus("Stopped", "bad");
  });

  btn.clear.addEventListener("click", () => {
    clearOut();
    toast("Cleared");
  });

  btn.save.addEventListener("click", () => {
    state.tabs[currentTab].code = ui.code.value;
    saveState();
    toast("Saved");
  });

  btn.load.addEventListener("click", () => {
    state = loadState();
    currentTab = clamp(parseInt(state.currentTab||0,10)||0, 0, state.tabs.length-1);
    ui.code.value = state.tabs[currentTab].code || "";
    renderTabs();
    toast("Loaded");
  });

  btn.share.addEventListener("click", copyShareLink);

  btn.runSamples.addEventListener("click", async () => {
    const p = PROBLEMS.find(x => x.id === currentProblemId);
    if(!p) return;
    clearOut();
    let okAll = true;
    for(const ex of (p.examples || [])){
      writeStdout("=== Sample ===\nInput:\n"+ex.input+"\n", true);
      const res = await runOne(ui.code.value || "", ex.input || "", 4000);
      if(res.stdout) writeStdout("Your output:\n"+res.stdout+"\n", true);
      if(res.stderr) writeStderr(res.stderr+"\n", true);
      const got = (res.stdout || "").trim();
      const want = (ex.output || "").trim();
      if(got === want && res.ok){
        writeStdout("✅ Match\n\n", true);
      }else{
        writeStdout("❌ Mismatch\nExpected:\n"+ex.output+"\n\n", true);
        okAll = false;
      }
    }
    setStatus(okAll ? "Samples OK" : "Samples failed", okAll ? "ok" : "bad");
  });

  btn.runAll.addEventListener("click", async () => {
    const p = PROBLEMS.find(x => x.id === currentProblemId);
    if(!p) return;

    // student attempts
    if(!IS_TEACHER){
      const a = incAttempts(currentProblemId);
      ui.attemptBadge.textContent = `Attempts today: ${a}`;
      if(a > 5){
        toast("Attempt limit reached");
        setStatus("Attempt limit", "bad");
        return;
      }
    }

    clearOut();
    let pass = 0, total = 0;
    for(const t of (p.tests || [])){
      total++;
      const res = await runOne(ui.code.value || "", t.input || "", 4000);
      const got = (res.stdout || "").trim();
      const want = (t.output || "").trim();
      const ok = res.ok && got === want;
      if(ok) pass++;

      if(!t.hidden || IS_TEACHER){
        writeStdout(`Test #${total} ${t.hidden ? "(hidden)" : ""}\nInput:\n${t.input}\n`, true);
        writeStdout(`Expected:\n${t.output}\n`, true);
        writeStdout(`Got:\n${res.stdout || ""}\n`, true);
        writeStdout(ok ? "✅ PASS\n\n" : "❌ FAIL\n\n", true);
      }
      if(res.stderr) writeStderr(res.stderr+"\n", true);
    }

    const allOk = (pass === total);
    setStatus(allOk ? "All tests passed" : `${pass}/${total} passed`, allOk ? "ok" : "bad");

    if(allOk && !IS_TEACHER){
      updateXPAndStreak(10);
      toast("+10 XP");
    }
  });

  btn.install.addEventListener("click", () => {
    if(!IS_TEACHER && !policy.allow_micropip) return toast("Packages disabled");
    const list = (ui.pkgs.value || "").split(",").map(s=>s.trim()).filter(Boolean);
    if(!list.length) return toast("Enter packages first");
    worker.postMessage({ type:"INSTALL", pkgs:list, policy: classPolicy() });
    toast("Installing...");
  });

  btn.listPkgs.addEventListener("click", () => {
    worker.postMessage({ type:"LIST_PKGS" });
  });

  /* ----------------- INIT ----------------- */
  let policy = loadPolicy();

  async function init(){
    initModeUI();
    renderXPStreak();
    renderInstalledPkgs();
    renderTabs();

  // Load local + optional remote problems
  const custom = loadCustomProblems();
  const remoteURL = URLP.get("problems"); // index.html?problems=...
  const remote = remoteURL ? await loadProblemsFromURL(remoteURL) : loadRemoteCache();

  // Merge (defaults first, then custom, then remote). Dedupe by id (remote/custom can override).
  const byId = new Map();
  [...DEFAULT_PROBLEMS, ...custom, ...remote].forEach(p => { byId.set(p.id, p); });
  PROBLEMS = Array.from(byId.values());

  renderProblems();

  // Optional: load code/tests from URL params.
  // 1) ?codefile=abc.py (or full URL) loads raw .py text into editor (main.py)
  // 2) ?code=abc.json loads code state JSON (tabs/stdin/problem)
  // When neither is provided, normal share hash/local state is used.
  const codeFile = URLP.get("codefile"); // index.html?codefile=starter.py
  const codeURL  = URLP.get("code");     // index.html?code=https://.../code.json

  if(codeFile){
    const txt = await loadTextFileFromURL(codeFile);
    if(typeof txt === "string"){
      const fname = (String(codeFile).split("/").pop() || "main.py").replace(/\?.*$/,"") || "main.py";
      state.tabs = [{ name: fname.endsWith(".py") ? fname : "main.py", code: txt }];
      currentTab = 0;
      ui.code.value = state.tabs[0].code || "";
      saveState();
      toast("Loaded codefile");
    }else{
      toast("Codefile not reachable");
    }
  }else if(codeURL){
    const remoteCode = await loadCodeFromURL(codeURL);
    if(remoteCode?.tabs?.length){
      state.tabs = remoteCode.tabs;
      currentTab = clamp(parseInt(remoteCode.currentTab||0,10)||0, 0, state.tabs.length-1);
      ui.code.value = state.tabs[currentTab].code || "";
      ui.stdin.value = remoteCode.stdin || "";
      localStorage.setItem(K_STDIN, ui.stdin.value||"");
      if(remoteCode.problem) currentProblemId = remoteCode.problem;
      saveState();
      toast("Loaded code JSON");
    }else{
      toast("Code JSON invalid/unreachable");
    }
  }else{
    // restore hash state (share links) when no code params are provided
    loadFromHash();
  }

    if(!codeURL && !codeFile) ui.code.value = state.tabs[currentTab].code || "";
    ui.stdin.value = localStorage.getItem(K_STDIN) || "";

    if(IS_TEACHER){
      renderPolicy();
      wireTeacherPanel();
      ui.pkgs.value = localStorage.getItem(K_PKGS) || "";
    }

    makeWorker();
    setStatus("Ready", "ok");
    setProgress(0);

    // student info
    if(!IS_TEACHER){
      ui.studentName.value = localStorage.getItem(K_STU_NAME) || "";
      ui.studentRoll.value = localStorage.getItem(K_STU_ROLL) || "";
      ui.studentName.addEventListener("input", ()=>localStorage.setItem(K_STU_NAME, ui.studentName.value||""));
      ui.studentRoll.addEventListener("input", ()=>localStorage.setItem(K_STU_ROLL, ui.studentRoll.value||""));
    }
  }

  init();

})();