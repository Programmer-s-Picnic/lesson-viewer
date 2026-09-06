(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const ui = {
    app: $("appShell"),
    codeCard: document.querySelector(".codeCard"),
    codeFullscreen: $("ppCodeFullscreen"),
    code: $("ppCode"),
    highlight: $("ppHighlight"),
    gutter: $("ppGutter"),
    stdin: $("ppStdin"),
    out: $("ppOut"),
    err: $("ppErr"),
    run: $("ppRun"),
    stop: $("ppStop"),
    clear: $("ppClear"),
    font: $("ppFontSize"),
    fullscreenButtons: Array.from(document.querySelectorAll(".jsFullscreen")),
    share: $("ppShare"),
    theme: $("ppTheme"),
    compiler: $("ppCompiler"),
    refreshCompiler: $("ppRefreshCompiler"),
    downloadCode: $("ppDownloadCode"),
    readOutput: $("ppReadOutput"),
    status: $("ppStatus"),
    toast: $("ppToast"),
    copyOut: $("ppCopyOut"),
    fileInput: $("ppFileInput"),
    uploadFiles: $("ppUploadFiles"),
    refreshFiles: $("ppRefreshFiles"),
    downloadAllFiles: $("ppDownloadAllFiles"),
    fileList: $("ppFileList")
  };

  const K_CODE = "pp_csharp_code_v2";
  const K_STDIN = "pp_csharp_stdin_v2";
  const K_FONT = "pp_csharp_font_v2";
  const K_THEME = "pp_csharp_theme_v2";
  const K_COMPILER = "pp_csharp_compiler_v2";
  const K_READ_OUTPUT = "pp_csharp_read_output_v2";
  const DB_NAME = "pp_csharp_editor_files_v1";
  const DB_STORE = "files";

  let controller = null;
  let running = false;
  let runTimer = null;
  let compilerRows = [];
  let judge0LanguageId = null;
  let projectFiles = [];
  let dbPromise = null;
  let highlightSyncFrame = 0;

  function toast(msg) {
    ui.toast.textContent = msg;
    ui.toast.classList.add("show");
    clearTimeout(toast.t);
    toast.t = setTimeout(() => ui.toast.classList.remove("show"), 1700);
  }

  function setStatus(msg, kind = "") {
    ui.status.textContent = msg;
    ui.status.className = "status " + kind;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replaceAll('"', "&quot;");
  }

  function save() {
    localStorage.setItem(K_CODE, ui.code.value);
    localStorage.setItem(K_STDIN, ui.stdin.value);
  }

  function formatFileSize(bytes) {
    const n = Number(bytes) || 0;
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  }

  // ---------- C# syntax highlighting ----------
  const csharpKeywords = new Set([
    "abstract","as","base","break","case","catch","checked","class","const","continue","default","delegate","do","else","enum","event","explicit","extern","false","finally","fixed","for","foreach","goto","if","implicit","in","interface","internal","is","lock","namespace","new","null","operator","out","override","params","private","protected","public","readonly","ref","return","sealed","sizeof","stackalloc","static","struct","switch","this","throw","true","try","typeof","unchecked","unsafe","using","virtual","void","volatile","while","add","alias","and","ascending","async","await","by","descending","dynamic","equals","from","get","global","group","init","into","join","let","managed","nameof","nint","not","notnull","nuint","on","or","orderby","partial","record","remove","required","scoped","select","set","unmanaged","value","var","when","where","with","yield"
  ]);
  const csharpTypes = new Set([
    "bool","byte","sbyte","char","decimal","double","float","int","uint","long","ulong","short","ushort","object","string","String","Console","Math","DateTime","TimeSpan","Guid","List","Dictionary","HashSet","Queue","Stack","IEnumerable","Task","Exception"
  ]);
  const linqWords = new Set(["Select","Where","OrderBy","OrderByDescending","ThenBy","GroupBy","Join","Any","All","Count","Sum","Average","Min","Max","First","FirstOrDefault","Single","SingleOrDefault","ToList","ToArray"]);

  function isIdentStart(ch) { return /[A-Za-z_]/.test(ch); }
  function isIdentPart(ch) { return /[A-Za-z0-9_]/.test(ch); }

  function highlightCSharp(code) {
    const lines = String(code ?? "").split("\n");
    let inBlockComment = false;

    return lines.map(line => {
      let i = 0;
      let out = "";

      if (!inBlockComment && /^\s*#/.test(line)) {
        return `<div class="codeLine"><span class="tok-pre">${escapeHtml(line)}</span></div>`;
      }

      while (i < line.length) {
        if (inBlockComment) {
          const end = line.indexOf("*/", i);
          if (end === -1) {
            out += `<span class="tok-comment">${escapeHtml(line.slice(i))}</span>`;
            i = line.length;
            break;
          }
          out += `<span class="tok-comment">${escapeHtml(line.slice(i, end + 2))}</span>`;
          i = end + 2;
          inBlockComment = false;
          continue;
        }

        if (line.startsWith("//", i)) {
          out += `<span class="tok-comment">${escapeHtml(line.slice(i))}</span>`;
          i = line.length;
          break;
        }

        if (line.startsWith("/*", i)) {
          const end = line.indexOf("*/", i + 2);
          if (end === -1) {
            out += `<span class="tok-comment">${escapeHtml(line.slice(i))}</span>`;
            inBlockComment = true;
            i = line.length;
            break;
          }
          out += `<span class="tok-comment">${escapeHtml(line.slice(i, end + 2))}</span>`;
          i = end + 2;
          continue;
        }

        // Attributes: [Serializable], [Obsolete(...)] etc.
        if (line[i] === "[" && /[A-Za-z_]/.test(line[i + 1] || "")) {
          const close = line.indexOf("]", i + 1);
          if (close !== -1) {
            out += `<span class="tok-attr">${escapeHtml(line.slice(i, close + 1))}</span>`;
            i = close + 1;
            continue;
          }
        }

        // Verbatim/interpolated/normal strings and chars.
        let prefixLen = 0;
        if (line.startsWith("$@\"", i) || line.startsWith("@$\"", i)) prefixLen = 2;
        else if (line.startsWith("@\"", i) || line.startsWith("$\"", i)) prefixLen = 1;

        if (prefixLen || line[i] === '"' || line[i] === "'") {
          const quoteIndex = i + prefixLen;
          const quote = line[quoteIndex];
          const verbatim = line.slice(i, quoteIndex).includes("@");
          let j = quoteIndex + 1;
          while (j < line.length) {
            if (quote === '"' && verbatim && line[j] === '"' && line[j + 1] === '"') { j += 2; continue; }
            if (!verbatim && line[j] === "\\") { j += 2; continue; }
            if (line[j] === quote) { j++; break; }
            j++;
          }
          out += `<span class="tok-string">${escapeHtml(line.slice(i, j))}</span>`;
          i = j;
          continue;
        }

        if (/\d/.test(line[i]) || (line[i] === "." && /\d/.test(line[i + 1] || ""))) {
          let j = i + 1;
          while (j < line.length && /[0-9A-Fa-f_xXbBeE.+\-mMdDfFuUlL]/.test(line[j])) j++;
          out += `<span class="tok-number">${escapeHtml(line.slice(i, j))}</span>`;
          i = j;
          continue;
        }

        if (isIdentStart(line[i])) {
          let j = i + 1;
          while (j < line.length && isIdentPart(line[j])) j++;
          const raw = line.slice(i, j);
          let cls = "";
          if (csharpKeywords.has(raw)) cls = "tok-keyword";
          else if (csharpTypes.has(raw) || /^[A-Z][A-Za-z0-9_]*$/.test(raw)) cls = "tok-type";
          if (linqWords.has(raw)) cls = "tok-linq";
          out += cls ? `<span class="${cls}">${escapeHtml(raw)}</span>` : escapeHtml(raw);
          i = j;
          continue;
        }

        if (/[+\-*\/%=<>!&|^~?:.,;(){}\[\]]/.test(line[i])) {
          out += `<span class="tok-operator">${escapeHtml(line[i])}</span>`;
          i++;
          continue;
        }

        out += escapeHtml(line[i]);
        i++;
      }

      return `<div class="codeLine">${out || "&nbsp;"}</div>`;
    }).join("");
  }

  function syncHighlightScroll() {
    if (!ui.highlight || !ui.code) return;
    const x = ui.code.scrollLeft || 0;
    const y = ui.code.scrollTop || 0;
    const inner = ui.highlight.querySelector(".codeHighlightInner");
    if (inner) inner.style.transform = `translate(${-x}px, ${-y}px)`;
    if (ui.gutter) ui.gutter.scrollTop = y;
  }

  function updateHighlight() {
    ui.highlight.innerHTML = `<div class="codeHighlightInner">${highlightCSharp(ui.code.value)}</div>`;
    syncHighlightScroll();
  }

  function updateGutter() {
    const n = ui.code.value.split("\n").length;
    ui.gutter.textContent = Array.from({ length: n }, (_, i) => i + 1).join("\n");
    updateHighlight();
  }

  function scheduleEditorSync() {
    cancelAnimationFrame(highlightSyncFrame);
    highlightSyncFrame = requestAnimationFrame(() => {
      updateHighlight();
      syncHighlightScroll();
    });
  }

  function installEditorLayoutWatchers() {
    const targets = [ui.code, ui.highlight, ui.gutter, document.querySelector(".editorWrap"), ui.codeCard].filter(Boolean);
    if ("ResizeObserver" in window) {
      const ro = new ResizeObserver(scheduleEditorSync);
      targets.forEach(el => ro.observe(el));
    }
    window.addEventListener("resize", scheduleEditorSync);
    window.addEventListener("orientationchange", scheduleEditorSync);
    window.addEventListener("pageshow", scheduleEditorSync);
    if (window.visualViewport) window.visualViewport.addEventListener("resize", scheduleEditorSync);
  }

  function applyFont(size) {
    const px = Number(size) || 16;
    const lineHeight = Math.round(px * 1.5) + "px";
    document.documentElement.style.setProperty("--editor-line-height", lineHeight);
    [ui.code, ui.gutter, ui.highlight].forEach(el => {
      if (!el) return;
      el.style.fontSize = px + "px";
      el.style.lineHeight = lineHeight;
    });
    ui.out.style.fontSize = Math.max(14, px - 1) + "px";
    ui.err.style.fontSize = Math.max(14, px - 1) + "px";
    localStorage.setItem(K_FONT, String(px));
    scheduleEditorSync();
  }

  // ---------- typing aids ----------
  function getLineBounds(value, start, end) {
    const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const next = value.indexOf("\n", end);
    const lineEnd = next === -1 ? value.length : next;
    return [lineStart, lineEnd];
  }

  function toggleComment() {
    const el = ui.code;
    const value = el.value;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const [lineStart, lineEnd] = getLineBounds(value, start, end);
    const block = value.slice(lineStart, lineEnd);
    const lines = block.split("\n");
    const useful = lines.filter(line => line.trim().length);
    const uncomment = useful.length && useful.every(line => /^\s*\/\/ ?/.test(line));
    const updated = lines.map(line => {
      if (!line.trim()) return line;
      return uncomment ? line.replace(/^(\s*)\/\/ ?/, "$1") : line.replace(/^(\s*)/, "$1// ");
    }).join("\n");
    el.value = value.slice(0, lineStart) + updated + value.slice(lineEnd);
    el.selectionStart = lineStart;
    el.selectionEnd = lineStart + updated.length;
    updateGutter(); save();
    toast(uncomment ? "Uncommented" : "Commented");
  }

  function indentSelection(outdent = false) {
    const el = ui.code;
    const value = el.value;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (start === end && !outdent) {
      el.setRangeText("    ", start, end, "end");
      updateGutter(); save();
      return;
    }
    const [lineStart, lineEnd] = getLineBounds(value, start, end);
    const block = value.slice(lineStart, lineEnd);
    const updated = block.split("\n").map(line => {
      if (!outdent) return "    " + line;
      if (line.startsWith("    ")) return line.slice(4);
      if (line.startsWith("\t")) return line.slice(1);
      return line.replace(/^ {1,3}/, "");
    }).join("\n");
    el.value = value.slice(0, lineStart) + updated + value.slice(lineEnd);
    el.selectionStart = lineStart;
    el.selectionEnd = lineStart + updated.length;
    updateGutter(); save();
  }

  function smartEnter(e) {
    const el = ui.code;
    const value = el.value;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const beforeLine = value.slice(lineStart, start);
    const nextNl = value.indexOf("\n", start);
    const afterCursor = value.slice(start, nextNl === -1 ? value.length : nextNl);
    const baseIndent = (beforeLine.match(/^\s*/) || [""])[0];
    let nextIndent = baseIndent;
    if (beforeLine.trimEnd().endsWith("{")) nextIndent += "    ";
    e.preventDefault();
    if (/^\s*}/.test(afterCursor) && nextIndent.length >= 4) {
      el.setRangeText("\n" + nextIndent + "\n" + baseIndent, start, end, "end");
      el.selectionStart = el.selectionEnd = start + 1 + nextIndent.length;
    } else {
      el.setRangeText("\n" + nextIndent, start, end, "end");
    }
    updateGutter(); save();
  }

  function wrapPair(open, close) {
    const el = ui.code;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = el.value.slice(start, end);
    el.setRangeText(open + selected + close, start, end, selected ? "select" : "end");
    if (!selected) el.selectionStart = el.selectionEnd = start + open.length;
    updateGutter(); save();
  }

  function insertClosingBraceWithOutdent(e) {
    if (e.key !== "}") return false;
    const el = ui.code;
    if (el.selectionStart !== el.selectionEnd) return false;
    const pos = el.selectionStart;
    const lineStart = el.value.lastIndexOf("\n", Math.max(0, pos - 1)) + 1;
    const before = el.value.slice(lineStart, pos);
    if (!/^\s+$/.test(before) || before.length < 4) return false;
    e.preventDefault();
    const shorter = before.slice(0, Math.max(0, before.length - 4));
    if (el.value[pos] === "}") {
      el.value = el.value.slice(0, lineStart) + shorter + el.value.slice(pos);
    } else {
      el.value = el.value.slice(0, lineStart) + shorter + "}" + el.value.slice(pos);
    }
    el.selectionStart = el.selectionEnd = lineStart + shorter.length + 1;
    updateGutter(); save();
    return true;
  }

  function handleTypingAid(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); runCode(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === "/") { e.preventDefault(); toggleComment(); return; }
    if (e.key === "Tab") { e.preventDefault(); indentSelection(e.shiftKey); return; }
    if (e.key === "Enter") { smartEnter(e); return; }
    if (insertClosingBraceWithOutdent(e)) return;

    const pairs = { "(": ")", "[": "]", "{": "}", '"': '"', "'": "'" };
    if (!e.ctrlKey && !e.metaKey && !e.altKey && pairs[e.key]) {
      // Avoid pairing apostrophes in common cases like comments/text pasted into code.
      e.preventDefault(); wrapPair(e.key, pairs[e.key]); return;
    }
    if ([")", "]", "}", '"', "'"].includes(e.key)) {
      const el = ui.code;
      if (el.selectionStart === el.selectionEnd && el.value[el.selectionStart] === e.key) {
        e.preventDefault();
        el.selectionStart = el.selectionEnd = el.selectionStart + 1;
      }
    }
  }

  // ---------- compiler execution ----------
  function stopReading() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  function readRunOutput(stdout, stderr) {
    if (!ui.readOutput.checked || !("speechSynthesis" in window)) return;
    const outText = String(stdout || "").trim();
    const errText = String(stderr || "").trim();
    const parts = [];
    if (outText) parts.push(`Standard output. ${outText}`);
    if (errText) parts.push(`Compiler or standard error. ${errText}`);
    if (!parts.length) parts.push("The program finished with no output.");
    stopReading();
    parts.forEach(text => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = document.documentElement.lang || "en";
      window.speechSynthesis.speak(utterance);
    });
  }

  function setBusy(busy) {
    running = busy;
    ui.run.disabled = busy;
    ui.stop.disabled = !busy;
    ui.compiler.disabled = busy;
    ui.refreshCompiler.disabled = busy;
  }

  function compilerScore(c) {
    const name = String(c.name || "").toLowerCase();
    const display = String(c.display_name || c.version || "").toLowerCase();
    let score = 0;
    if (name.includes("dotnet") || display.includes("dotnet")) score += 100;
    if (name.includes("mono") || display.includes("mono")) score += 80;
    if (name.includes("head") || display.includes("head")) score += 20;
    return score;
  }

  async function discoverCompilers(force = false) {
    if (force) compilerRows = [];
    setStatus("Finding C# compiler…");
    ui.compiler.innerHTML = '<option value="">Finding C# compiler…</option>';
    try {
      const res = await fetch("https://wandbox.org/api/list.json", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rows = await res.json();
      compilerRows = rows.filter(c => /c#|csharp|c sharp/i.test(String(c.language || "")));
      if (!compilerRows.length) throw new Error("No C# compiler advertised by Wandbox");
      compilerRows.sort((a, b) => compilerScore(b) - compilerScore(a));
      ui.compiler.innerHTML = compilerRows.map(c => {
        const label = c.display_name || `${c.name}${c.version ? " · " + c.version : ""}`;
        return `<option value="${escapeAttr(c.name)}">${escapeHtml(label)}</option>`;
      }).join("");
      const saved = localStorage.getItem(K_COMPILER);
      if (saved && compilerRows.some(c => c.name === saved)) ui.compiler.value = saved;
      else ui.compiler.value = compilerRows[0].name;
      localStorage.setItem(K_COMPILER, ui.compiler.value);
      setStatus("Ready", "ok");
    } catch (err) {
      ui.compiler.innerHTML = '<option value="">Auto fallback</option>';
      setStatus("Ready — fallback compiler", "ok");
    }
  }

  async function runWithWandbox(code, stdin, signal) {
    let compiler = ui.compiler.value;
    if (!compiler) {
      if (!compilerRows.length) await discoverCompilers();
      compiler = ui.compiler.value;
    }
    if (!compiler) throw new Error("No Wandbox C# compiler is available.");

    const res = await fetch("https://wandbox.org/api/compile.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        code,
        compiler,
        stdin,
        options: "",
        "compiler-option-raw": "",
        "runtime-option-raw": ""
      })
    });
    if (!res.ok) throw new Error(`Wandbox HTTP ${res.status}`);
    const data = await res.json();

    const stdout = [data.program_output, data.program_message].filter(Boolean).join("\n").trim();
    const stderr = [data.compiler_output, data.compiler_message].filter(Boolean).join("\n").trim();
    const status = String(data.status ?? "0");
    return { stdout, stderr, ok: !stderr && (status === "0" || status === "") };
  }

  async function discoverJudge0Language(signal) {
    if (judge0LanguageId) return judge0LanguageId;
    const res = await fetch("https://ce.judge0.com/languages/", { signal });
    if (!res.ok) throw new Error(`Judge0 languages HTTP ${res.status}`);
    const langs = await res.json();
    const chosen = langs.find(x => /^c#\s*\(/i.test(String(x.name || ""))) || langs.find(x => /c#|csharp|c sharp/i.test(String(x.name || "")));
    if (!chosen) throw new Error("Judge0 does not advertise a C# language.");
    judge0LanguageId = chosen.id;
    return judge0LanguageId;
  }

  async function pollJudge0(token, signal) {
    for (let i = 0; i < 20; i++) {
      const res = await fetch(`https://ce.judge0.com/submissions/${encodeURIComponent(token)}?base64_encoded=false&fields=stdout,stderr,compile_output,message,status`, { signal });
      if (!res.ok) throw new Error(`Judge0 polling HTTP ${res.status}`);
      const data = await res.json();
      const id = data.status && data.status.id;
      if (id !== 1 && id !== 2) return data;
      await new Promise(resolve => setTimeout(resolve, 450));
    }
    throw new Error("Judge0 timed out waiting for the result.");
  }

  async function runWithJudge0(code, stdin, signal) {
    const languageId = await discoverJudge0Language(signal);
    const res = await fetch("https://ce.judge0.com/submissions?base64_encoded=false&wait=true", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({ source_code: code, language_id: languageId, stdin })
    });
    if (!res.ok) throw new Error(`Judge0 HTTP ${res.status}`);
    let data = await res.json();
    if (data.token && (!data.status || data.status.id === 1 || data.status.id === 2)) data = await pollJudge0(data.token, signal);
    const stdout = String(data.stdout || "").trim();
    const stderr = [data.compile_output, data.stderr, data.message].filter(Boolean).join("\n").trim();
    return { stdout, stderr, ok: Boolean(data.status && data.status.id === 3) };
  }

  async function runCode() {
    if (running) return toast("Already running");
    save();
    stopReading();
    controller = new AbortController();
    setBusy(true);
    ui.out.textContent = "Running…";
    ui.err.textContent = "";
    setStatus("Running…");
    const started = performance.now();
    const failures = [];

    clearTimeout(runTimer);
    runTimer = setTimeout(() => {
      if (controller) controller.abort();
    }, 18000);

    try {
      let result;
      try {
        result = await runWithWandbox(ui.code.value, ui.stdin.value, controller.signal);
      } catch (err) {
        if (err.name === "AbortError") throw err;
        failures.push(`Wandbox: ${err.message}`);
        result = await runWithJudge0(ui.code.value, ui.stdin.value, controller.signal);
      }

      const elapsed = ((performance.now() - started) / 1000).toFixed(2);
      ui.out.textContent = result.stdout || "(no stdout)";
      ui.err.textContent = result.stderr || "(no compiler/runtime errors)";
      setStatus(result.ok ? `Ready · ${elapsed}s` : `Finished with errors · ${elapsed}s`, result.ok ? "ok" : "bad");
      readRunOutput(result.stdout, result.stderr);
    } catch (err) {
      if (err.name === "AbortError") {
        ui.out.textContent = "Execution stopped.";
        ui.err.textContent = "The run was cancelled or exceeded the 18 second browser timeout.";
        setStatus("Stopped", "bad");
      } else {
        ui.out.textContent = "(no stdout)";
        ui.err.textContent = [
          "Unable to reach a C# execution backend.",
          err.message,
          failures.join("\n")
        ].filter(Boolean).join("\n\n");
        setStatus("Compiler unavailable", "bad");
      }
    } finally {
      clearTimeout(runTimer);
      runTimer = null;
      controller = null;
      setBusy(false);
    }
  }

  function stopRun() {
    if (controller) controller.abort();
    stopReading();
  }

  // ---------- theme, fullscreen, panels, share ----------
  function applyTheme(theme) {
    const t = theme === "dark" ? "dark" : "light";
    document.body.dataset.theme = t;
    localStorage.setItem(K_THEME, t);
    ui.theme.textContent = t === "dark" ? "Light" : "Dark";
  }

  function syncFullscreenButtons() {
    const active = ui.app.classList.contains("fullscreen") || document.fullscreenElement === ui.app;
    ui.fullscreenButtons.forEach(btn => btn.textContent = active ? "Exit full screen" : "Full screen");
  }

  async function toggleFullscreen() {
    const active = ui.app.classList.contains("fullscreen") || document.fullscreenElement === ui.app;
    if (active) {
      ui.app.classList.remove("fullscreen");
      document.body.classList.remove("fullscreen");
      if (document.fullscreenElement) {
        try { await document.exitFullscreen(); } catch {}
      }
    } else {
      ui.app.classList.add("fullscreen");
      document.body.classList.add("fullscreen");
      try { if (ui.app.requestFullscreen) await ui.app.requestFullscreen(); } catch {}
    }
    syncFullscreenButtons();
    scheduleEditorSync();
  }

  function closeIoExpandedCards() {
    document.querySelectorAll(".ioToggleCard.ioExpanded").forEach(card => {
      card.classList.remove("ioExpanded");
      const btn = card.querySelector(".jsToggleBox");
      if (btn) btn.textContent = "Expand";
    });
    document.body.classList.remove("ioExpandedMode");
  }

  function toggleCodeFullscreen() {
    const willExpand = !ui.codeCard.classList.contains("codeExpanded");
    closeIoExpandedCards();
    ui.codeCard.classList.toggle("codeExpanded", willExpand);
    document.body.classList.toggle("ioExpandedMode", willExpand);
    ui.codeFullscreen.textContent = willExpand ? "Original size" : "Full screen";
    setTimeout(() => { ui.code.focus(); scheduleEditorSync(); }, 0);
  }

  function toggleIoBox(btn) {
    const card = btn.closest(".ioToggleCard");
    if (!card) return;
    const willExpand = !card.classList.contains("ioExpanded");
    closeIoExpandedCards();
    if (ui.codeCard.classList.contains("codeExpanded")) toggleCodeFullscreen();
    if (willExpand) {
      card.classList.add("ioExpanded");
      btn.textContent = "Original size";
      document.body.classList.add("ioExpandedMode");
    }
  }

  function encodeBase64Url(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  }

  function decodeBase64Url(text) {
    let b64 = text.replaceAll("-", "+").replaceAll("_", "/");
    while (b64.length % 4) b64 += "=";
    const binary = atob(b64);
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  async function shareProject() {
    save();
    const payload = JSON.stringify({ code: ui.code.value, stdin: ui.stdin.value, compiler: ui.compiler.value || "" });
    const hash = encodeBase64Url(payload);
    const url = location.origin + location.pathname + location.search + "#" + hash;
    try {
      if (navigator.share) await navigator.share({ title: document.title, url });
      else await navigator.clipboard.writeText(url);
      toast(navigator.share ? "Shared" : "Share link copied");
    } catch (err) {
      if (err && err.name === "AbortError") toast("Share cancelled");
      else toast("Could not share");
    }
  }

  function loadHash() {
    if (!location.hash) return false;
    try {
      const p = JSON.parse(decodeBase64Url(location.hash.slice(1)));
      if (typeof p.code === "string") ui.code.value = p.code;
      if (typeof p.stdin === "string") ui.stdin.value = p.stdin;
      if (typeof p.compiler === "string" && p.compiler) localStorage.setItem(K_COMPILER, p.compiler);
      return true;
    } catch { return false; }
  }

  function downloadBytes(name, data, type = "application/octet-stream") {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function downloadCode() {
    downloadBytes("Program.cs", ui.code.value, "text/plain;charset=utf-8");
  }

  // ---------- IndexedDB files ----------
  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE, { keyPath: "name" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error("IndexedDB could not be opened"));
    });
    return dbPromise;
  }

  async function dbPutFile(file) {
    const db = await openDb();
    const record = { name: file.name, type: file.type || "application/octet-stream", size: file.size, modified: file.lastModified || Date.now(), data: await file.arrayBuffer() };
    await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).put(record);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  async function dbListFiles() {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readonly");
      const req = tx.objectStore(DB_STORE).getAll();
      req.onsuccess = () => resolve((req.result || []).sort((a, b) => a.name.localeCompare(b.name)));
      req.onerror = () => reject(req.error);
    });
  }

  async function dbGetFile(name) {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readonly");
      const req = tx.objectStore(DB_STORE).get(name);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function dbDeleteFile(name) {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).delete(name);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  function renderFiles(files) {
    projectFiles = Array.isArray(files) ? files : [];
    ui.downloadAllFiles.disabled = projectFiles.length === 0;
    if (!projectFiles.length) {
      ui.fileList.innerHTML = '<p class="emptyFiles">No project files yet.</p>';
      return;
    }
    ui.fileList.innerHTML = projectFiles.map(file => `
      <div class="fileRow">
        <span class="fileName" title="${escapeAttr(file.name)}">${escapeHtml(file.name)}</span>
        <span class="fileSize">${formatFileSize(file.size)}</span>
        <span class="fileButtons">
          <button class="miniBtn" data-file-download="${escapeAttr(file.name)}" type="button">Download</button>
          <button class="miniBtn" data-file-delete="${escapeAttr(file.name)}" type="button">Delete</button>
        </span>
      </div>`).join("");
  }

  async function refreshFiles() {
    try { renderFiles(await dbListFiles()); }
    catch { ui.fileList.innerHTML = '<p class="emptyFiles">Browser file storage is unavailable.</p>'; }
  }

  async function uploadFiles() {
    const files = Array.from(ui.fileInput.files || []);
    if (!files.length) return;
    const maxFileSize = 20 * 1024 * 1024;
    if (files.some(f => f.size > maxFileSize)) {
      ui.fileInput.value = "";
      return toast("Each file must be 20 MB or smaller");
    }
    try {
      for (const file of files) await dbPutFile(file);
      ui.fileInput.value = "";
      await refreshFiles();
      toast(`${files.length} file${files.length === 1 ? "" : "s"} uploaded`);
    } catch {
      toast("Could not store files in this browser");
    }
  }

  async function downloadAllFiles() {
    if (!projectFiles.length) return;
    if (!window.JSZip) return toast("ZIP library is still loading");
    try {
      const zip = new JSZip();
      for (const item of projectFiles) {
        const record = await dbGetFile(item.name);
        if (record) zip.file(record.name, record.data);
      }
      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
      downloadBytes("csharp-project-files.zip", blob, "application/zip");
      toast("ZIP downloaded");
    } catch { toast("Could not build ZIP"); }
  }

  // ---------- event wiring ----------
  ui.code.addEventListener("input", () => { updateGutter(); save(); });
  ui.code.addEventListener("scroll", syncHighlightScroll);
  ui.code.addEventListener("keydown", handleTypingAid);
  ui.stdin.addEventListener("input", save);

  ui.run.addEventListener("click", runCode);
  ui.stop.addEventListener("click", stopRun);
  ui.clear.addEventListener("click", () => {
    stopReading();
    ui.out.textContent = "Output will appear here.";
    ui.err.textContent = "Errors will appear here.";
    setStatus("Ready", "ok");
  });

  ui.font.addEventListener("change", () => applyFont(ui.font.value));
  ui.theme.addEventListener("click", () => applyTheme((document.body.dataset.theme || "light") === "light" ? "dark" : "light"));
  ui.fullscreenButtons.forEach(btn => btn.addEventListener("click", toggleFullscreen));
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement) {
      ui.app.classList.remove("fullscreen");
      document.body.classList.remove("fullscreen");
    }
    syncFullscreenButtons();
    scheduleEditorSync();
  });

  ui.share.addEventListener("click", shareProject);
  ui.codeFullscreen.addEventListener("click", toggleCodeFullscreen);
  document.querySelectorAll(".jsToggleBox").forEach(btn => btn.addEventListener("click", () => toggleIoBox(btn)));

  ui.compiler.addEventListener("change", () => localStorage.setItem(K_COMPILER, ui.compiler.value));
  ui.refreshCompiler.addEventListener("click", () => discoverCompilers(true));
  ui.downloadCode.addEventListener("click", downloadCode);

  ui.readOutput.checked = localStorage.getItem(K_READ_OUTPUT) === "true";
  ui.readOutput.addEventListener("change", () => {
    localStorage.setItem(K_READ_OUTPUT, String(ui.readOutput.checked));
    if (!ui.readOutput.checked) stopReading();
  });

  ui.copyOut.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(ui.out.textContent); toast("stdout copied"); }
    catch { toast("Copy blocked"); }
  });

  ui.uploadFiles.addEventListener("click", () => ui.fileInput.click());
  ui.fileInput.addEventListener("change", uploadFiles);
  ui.refreshFiles.addEventListener("click", refreshFiles);
  ui.downloadAllFiles.addEventListener("click", downloadAllFiles);
  ui.fileList.addEventListener("click", async e => {
    const download = e.target.closest("[data-file-download]");
    const remove = e.target.closest("[data-file-delete]");
    if (download) {
      const record = await dbGetFile(download.dataset.fileDownload);
      if (record) downloadBytes(record.name, record.data, record.type);
    }
    if (remove && confirm(`Delete ${remove.dataset.fileDelete}?`)) {
      await dbDeleteFile(remove.dataset.fileDelete);
      await refreshFiles();
      toast("File deleted");
    }
  });

  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if (ui.codeCard.classList.contains("codeExpanded")) { toggleCodeFullscreen(); return; }
    if (document.querySelector(".ioToggleCard.ioExpanded")) closeIoExpandedCards();
  });

  // ---------- initial state ----------
  const fromShare = loadHash();
  if (!fromShare) {
    const savedCode = localStorage.getItem(K_CODE);
    const savedStdin = localStorage.getItem(K_STDIN);
    if (savedCode) ui.code.value = savedCode;
    if (savedStdin !== null) ui.stdin.value = savedStdin;
  }

  applyTheme(localStorage.getItem(K_THEME) || "light");
  const font = localStorage.getItem(K_FONT) || "16";
  ui.font.value = font;
  applyFont(font);
  updateGutter();
  installEditorLayoutWatchers();
  setBusy(false);
  discoverCompilers();
  refreshFiles();
})();
