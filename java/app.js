(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const S = {
    code: 'lwc_java_code_v1', stdin: 'lwc_java_stdin_v1', theme: 'lwc_java_theme_v1',
    font: 'lwc_java_font_v1', api: 'lwc_java_api_v1', read: 'lwc_java_read_v1',
    compiler: 'lwc_java_compiler_v1', args: 'lwc_java_args_v1'
  };
  const DEFAULT_API = 'https://ce.judge0.com';
  const DEFAULT_LANGUAGE_ID = 62;
  const DB_NAME = 'lwc_java_project_files';
  const DB_STORE = 'files';

  const samples = {
    hello: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from Learn With Champak!");\n    }\n}\n`,
    input: `import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String name = sc.nextLine();\n        int age = sc.nextInt();\n        System.out.println("Hello " + name + ", age " + age);\n    }\n}\n`,
    loop: `public class Main {\n    public static void main(String[] args) {\n        for (int i = 1; i <= 10; i++) {\n            System.out.print(i + " ");\n        }\n        System.out.println();\n    }\n}\n`,
    array: `import java.util.Arrays;\n\npublic class Main {\n    public static void main(String[] args) {\n        int[] numbers = {10, 20, 30, 40, 50};\n        System.out.println(Arrays.toString(numbers));\n\n        int sum = 0;\n        for (int n : numbers) sum += n;\n        System.out.println("Sum = " + sum);\n    }\n}\n`,
    method: `public class Main {\n    static int add(int a, int b) {\n        return a + b;\n    }\n\n    public static void main(String[] args) {\n        System.out.println(add(7, 5));\n    }\n}\n`,
    object: `class Student {\n    private final String name;\n\n    Student(String name) {\n        this.name = name;\n    }\n\n    void greet() {\n        System.out.println("Hello, " + name + "!");\n    }\n}\n\npublic class Main {\n    public static void main(String[] args) {\n        Student student = new Student("Champak");\n        student.greet();\n    }\n}\n`
  };

  const ui = {
    app: $('appShell'), editorEl: $('editor'), fallback: $('fallbackEditor'), stdin: $('stdin'),
    stdout: $('stdout'), stderr: $('stderr'), run: $('runBtn'), stop: $('stopBtn'), clear: $('clearBtn'),
    theme: $('themeBtn'), share: $('shareBtn'), font: $('fontSelect'), read: $('readOutput'), status: $('status'),
    sample: $('sampleSelect'), newBtn: $('newBtn'), copyCode: $('copyCodeBtn'), download: $('downloadBtn'),
    copyOut: $('copyOutBtn'), codeCard: $('codeCard'), codeFullscreen: $('codeFullscreenBtn'), runMeta: $('runMeta'),
    buildBtn: $('buildBtn'), buildOptions: $('buildOptions'), compilerOptions: $('compilerOptions'), commandArgs: $('commandArgs'),
    settingsBtn: $('settingsBtn'), settingsDialog: $('settingsDialog'), apiUrl: $('apiUrl'), resetApi: $('resetApiBtn'), saveApi: $('saveApiBtn'),
    modeBadge: $('modeBadge'), fileInput: $('fileInput'), upload: $('uploadBtn'), downloadAll: $('downloadAllBtn'), fileList: $('fileList'), toast: $('toast')
  };

  let editor = null;
  let running = false;
  let abortController = null;
  let currentToken = null;
  let saveTimer = null;
  let projectFiles = [];

  function toast(text) {
    ui.toast.textContent = text;
    ui.toast.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => ui.toast.classList.remove('show'), 1700);
  }
  function setStatus(text, kind = '') { ui.status.textContent = text; ui.status.className = `status ${kind}`; }
  function setCode(text) { if (editor) editor.setValue(text, -1); else ui.fallback.value = text; }
  function getCode() { return editor ? editor.getValue() : ui.fallback.value; }
  function getApi() { return (localStorage.getItem(S.api) || DEFAULT_API).replace(/\/+$/, ''); }
  function save() {
    localStorage.setItem(S.code, getCode());
    localStorage.setItem(S.stdin, ui.stdin.value);
    localStorage.setItem(S.compiler, ui.compilerOptions.value);
    localStorage.setItem(S.args, ui.commandArgs.value);
  }
  function queueSave() { clearTimeout(saveTimer); saveTimer = setTimeout(save, 300); }

  function applyTheme(theme) {
    const value = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = value;
    localStorage.setItem(S.theme, value);
    ui.theme.textContent = value === 'dark' ? '☀️ Light' : '🌙 Dark';
    if (editor) editor.setTheme(value === 'dark' ? 'ace/theme/one_dark' : 'ace/theme/textmate');
  }
  function applyFont(size) {
    const n = Number(size) || 16;
    localStorage.setItem(S.font, String(n));
    if (editor) editor.setFontSize(n);
    ui.fallback.style.fontSize = `${n}px`;
    ui.stdout.style.fontSize = `${Math.max(13, n - 2)}px`;
    ui.stderr.style.fontSize = `${Math.max(13, n - 2)}px`;
  }

  function initEditor() {
    const font = localStorage.getItem(S.font) || '16';
    ui.font.value = font;
    if (window.ace) {
      ace.config.set('basePath', 'https://cdn.jsdelivr.net/npm/ace-builds@1.44.0/src-min-noconflict/');
      editor = ace.edit('editor');
      editor.session.setMode('ace/mode/java');
      editor.setOptions({
        fontSize: `${font}px`, showPrintMargin: false, wrap: false, tabSize: 4, useSoftTabs: true,
        highlightActiveLine: true, enableBasicAutocompletion: true, enableLiveAutocompletion: false,
        enableSnippets: true, behavioursEnabled: true, wrapBehavioursEnabled: true
      });
      editor.commands.addCommand({name:'runJava',bindKey:{win:'Ctrl-Enter',mac:'Command-Enter'},exec:runCode});
      editor.session.on('change', queueSave);
    } else {
      ui.editorEl.style.display = 'none';
      ui.fallback.style.display = 'block';
      ui.fallback.addEventListener('input', queueSave);
      ui.fallback.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runCode(); }
        if (e.key === 'Tab') {
          e.preventDefault();
          const a = ui.fallback.selectionStart, b = ui.fallback.selectionEnd;
          ui.fallback.setRangeText('    ', a, b, 'end'); queueSave();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === '/') { e.preventDefault(); toggleFallbackComment(); }
      });
      toast('Ace did not load — basic editor mode active');
    }
    applyTheme(localStorage.getItem(S.theme) || 'light');
    applyFont(font);
  }

  function toggleFallbackComment() {
    const el = ui.fallback, start = el.selectionStart, end = el.selectionEnd, value = el.value;
    const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
    const endAt = value.indexOf('\n', end); const lineEnd = endAt < 0 ? value.length : endAt;
    const block = value.slice(lineStart, lineEnd); const lines = block.split('\n');
    const uncomment = lines.filter(x => x.trim()).every(x => /^\s*\/\//.test(x));
    const changed = lines.map(x => !x.trim() ? x : uncomment ? x.replace(/^(\s*)\/\/ ?/, '$1') : x.replace(/^(\s*)/, '$1// ')).join('\n');
    el.value = value.slice(0, lineStart) + changed + value.slice(lineEnd);
    el.selectionStart = lineStart; el.selectionEnd = lineStart + changed.length; queueSave();
  }

  function stopSpeech() { if ('speechSynthesis' in window) speechSynthesis.cancel(); }
  function pickIndianVoice() {
    if (!('speechSynthesis' in window)) return null;
    const voices = speechSynthesis.getVoices();
    return voices.find(v => /^en[-_]IN$/i.test(v.lang)) || voices.find(v => /India|Indian/i.test(v.name)) || voices.find(v => /^en/i.test(v.lang)) || null;
  }
  function speakResults(out, err) {
    if (!ui.read.checked || !('speechSynthesis' in window)) return;
    stopSpeech();
    const text = [out ? `Standard output. ${out}` : '', err ? `Errors. ${err}` : ''].filter(Boolean).join('. ') || 'The program finished with no output.';
    const utter = new SpeechSynthesisUtterance(text.slice(0, 8000));
    utter.lang = 'en-IN'; const voice = pickIndianVoice(); if (voice) utter.voice = voice;
    speechSynthesis.speak(utter);
  }

  function utf8ToB64Url(text) {
    const bytes = new TextEncoder().encode(text); let binary = '';
    for (const b of bytes) binary += String.fromCharCode(b);
    return btoa(binary).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
  }
  function b64UrlToUtf8(b64) {
    let s = b64.replaceAll('-','+').replaceAll('_','/'); while (s.length % 4) s += '=';
    const binary = atob(s); const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  async function shareProject() {
    save();
    const payload = {code:getCode(),stdin:ui.stdin.value,compiler:ui.compilerOptions.value,args:ui.commandArgs.value};
    const url = `${location.origin}${location.pathname}${location.search}#${utf8ToB64Url(JSON.stringify(payload))}`;
    try {
      if (navigator.share) await navigator.share({title:'Java Browser IDE | Learn With Champak', url});
      else { await navigator.clipboard.writeText(url); toast('Share link copied'); }
    } catch { toast('Share cancelled'); }
  }
  function loadHash() {
    if (!location.hash) return false;
    try {
      const p = JSON.parse(b64UrlToUtf8(location.hash.slice(1)));
      if (typeof p.code === 'string') setCode(p.code);
      if (typeof p.stdin === 'string') ui.stdin.value = p.stdin;
      if (typeof p.compiler === 'string') ui.compilerOptions.value = p.compiler;
      if (typeof p.args === 'string') ui.commandArgs.value = p.args;
      return true;
    } catch { return false; }
  }

  async function loadRemoteCode() {
    const q = new URLSearchParams(location.search);
    const rawUrl = q.get('codefile'); const jsonUrl = q.get('code');
    try {
      if (rawUrl) {
        const r = await fetch(new URL(rawUrl, location.href)); if (!r.ok) throw new Error(`HTTP ${r.status}`);
        setCode(await r.text()); save(); toast('Remote Java file loaded'); return true;
      }
      if (jsonUrl) {
        const r = await fetch(new URL(jsonUrl, location.href)); if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const p = await r.json();
        let code = null;
        if (typeof p.code === 'string') code = p.code;
        else if (Array.isArray(p.tabs) && p.tabs.length) {
          const idx = Number.isInteger(p.currentTab) ? p.currentTab : 0;
          const tab = p.tabs[idx] || p.tabs.find(t => /\.java$/i.test(t.name || '')) || p.tabs[0];
          code = tab && tab.code;
        } else if (Array.isArray(p)) {
          const tab = p.find(t => /\.java$/i.test(t.name || '')) || p[0]; code = tab && tab.code;
        }
        if (typeof code === 'string') setCode(code);
        if (typeof p.stdin === 'string') ui.stdin.value = p.stdin;
        save(); toast('Remote project loaded'); return true;
      }
    } catch (e) { ui.stderr.textContent = `Could not load remote code: ${e.message}`; setStatus('Remote load failed','bad'); }
    return false;
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(DB_STORE)) req.result.createObjectStore(DB_STORE, {keyPath:'name'}); };
      req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
    });
  }
  async function dbAll() {
    const db = await openDb(); return new Promise((resolve,reject) => {
      const req = db.transaction(DB_STORE,'readonly').objectStore(DB_STORE).getAll();
      req.onsuccess = () => resolve(req.result || []); req.onerror = () => reject(req.error);
    });
  }
  async function dbPut(file) {
    const db = await openDb(); return new Promise((resolve,reject) => {
      const req = db.transaction(DB_STORE,'readwrite').objectStore(DB_STORE).put(file); req.onsuccess=()=>resolve(); req.onerror=()=>reject(req.error);
    });
  }
  async function dbDelete(name) {
    const db = await openDb(); return new Promise((resolve,reject) => {
      const req = db.transaction(DB_STORE,'readwrite').objectStore(DB_STORE).delete(name); req.onsuccess=()=>resolve(); req.onerror=()=>reject(req.error);
    });
  }
  function formatSize(n) { return n < 1024 ? `${n} B` : n < 1048576 ? `${(n/1024).toFixed(1)} KB` : `${(n/1048576).toFixed(1)} MB`; }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  async function refreshFiles() {
    try { projectFiles = await dbAll(); projectFiles.sort((a,b)=>a.name.localeCompare(b.name)); } catch { projectFiles = []; }
    ui.downloadAll.disabled = projectFiles.length === 0;
    if (!projectFiles.length) { ui.fileList.innerHTML = '<p class="emptyFiles">No project files yet.</p>'; return; }
    ui.fileList.innerHTML = projectFiles.map(f => `<div class="fileRow"><span class="fileName" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</span><span class="fileSize">${formatSize(f.size || 0)}</span><span class="fileButtons"><button class="miniBtn" data-download="${escapeHtml(f.name)}" type="button">Download</button><button class="miniBtn" data-delete="${escapeHtml(f.name)}" type="button">Delete</button></span></div>`).join('');
  }
  function downloadBlob(name, data, type='application/octet-stream') {
    const blob = data instanceof Blob ? data : new Blob([data],{type}); const url=URL.createObjectURL(blob); const a=document.createElement('a');
    a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function makeAdditionalFiles() {
    if (!projectFiles.length || !window.JSZip) return null;
    const zip = new JSZip(); projectFiles.forEach(f => zip.file(f.name, f.data));
    return zip.generateAsync({type:'base64',compression:'DEFLATE'});
  }
  async function uploadFiles(files) {
    for (const file of files) {
      if (file.size > 20 * 1024 * 1024) { toast(`${file.name} exceeds 20 MB`); continue; }
      await dbPut({name:file.name,size:file.size,type:file.type || 'application/octet-stream',data:await file.arrayBuffer()});
    }
    await refreshFiles(); toast('Project files saved');
  }
  async function downloadAllFiles() {
    if (!window.JSZip || !projectFiles.length) return;
    const zip = new JSZip(); projectFiles.forEach(f => zip.file(f.name,f.data));
    downloadBlob('java-project-files.zip', await zip.generateAsync({type:'blob'}), 'application/zip');
  }

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function apiFetch(url, options={}) {
    if (!abortController) abortController = new AbortController();
    return fetch(url, {...options, signal:abortController.signal});
  }
  async function createSubmission(payload) {
    const r = await apiFetch(`${getApi()}/submissions?base64_encoded=false&wait=false`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if (!r.ok) throw new Error(`Submission failed (${r.status}): ${(await r.text()).slice(0,250)}`);
    return r.json();
  }
  async function poll(token) {
    const fields='stdout,stderr,compile_output,message,status,time,memory';
    for (let i=0;i<40;i++) {
      const r=await apiFetch(`${getApi()}/submissions/${encodeURIComponent(token)}?base64_encoded=false&fields=${fields}`);
      if(!r.ok) throw new Error(`Could not read result (${r.status})`);
      const result=await r.json(); const id=result.status?.id;
      if(id!==1 && id!==2) return result;
      await sleep(i<5?450:700);
    }
    throw new Error('Execution is taking too long.');
  }
  async function resolveLanguageId() {
    try {
      const r=await apiFetch(`${getApi()}/languages`); if(!r.ok) return DEFAULT_LANGUAGE_ID;
      const langs=await r.json();
      const exact=langs.find(x=>Number(x.id)===DEFAULT_LANGUAGE_ID && /java/i.test(x.name||''));
      const java=exact || langs.find(x=>/^Java\b/i.test(x.name||'')) || langs.find(x=>/Java/i.test(x.name||''));
      return java ? Number(java.id) : DEFAULT_LANGUAGE_ID;
    } catch(e) { if(e.name==='AbortError') throw e; return DEFAULT_LANGUAGE_ID; }
  }
  function renderResult(r) {
    const out=r.stdout||''; const compile=r.compile_output||''; const runtime=r.stderr||''; const message=r.message||'';
    const errors=[compile.trim(),runtime.trim(),(!compile&&!runtime&&message)?String(message).trim():''].filter(Boolean).join('\n\n');
    ui.stdout.textContent=out || '(no stdout)'; ui.stderr.textContent=errors || '(no errors)';
    const desc=r.status?.description||'Finished'; const meta=[desc,r.time?`${r.time}s`:'',r.memory?`${Math.round(r.memory/1024)} MB`:''].filter(Boolean).join(' • ');
    ui.runMeta.textContent=meta; const ok=Number(r.status?.id)===3 && !errors; setStatus(ok?'Run complete':desc,ok?'ok':'bad'); speakResults(out,errors);
  }
  async function runCode() {
    if (running) return toast('Already running');
    const code=getCode().trim(); if(!code) return toast('Write Java code first');
    if(!/\bclass\s+Main\b/.test(code)) toast('Tip: Judge0 expects class Main');
    save(); stopSpeech(); running=true; abortController=new AbortController(); currentToken=null;
    ui.run.disabled=true; ui.stdout.textContent='Compiling and running…'; ui.stderr.textContent=''; ui.runMeta.textContent='Compiling…'; setStatus('Running…');
    try {
      const additional=await makeAdditionalFiles();
      const payload={language_id:await resolveLanguageId(),source_code:getCode(),stdin:ui.stdin.value,cpu_time_limit:5,wall_time_limit:12};
      const compiler=ui.compilerOptions.value.trim(), args=ui.commandArgs.value.trim();
      if(compiler) payload.compiler_options=compiler; if(args) payload.command_line_arguments=args; if(additional) payload.additional_files=additional;
      const created=await createSubmission(payload); if(!created.token) throw new Error(created.error||'No submission token returned');
      currentToken=created.token; renderResult(await poll(currentToken));
    } catch(e) {
      if(e.name==='AbortError') { ui.stderr.textContent='Stopped by user.'; setStatus('Stopped','bad'); }
      else { ui.stderr.textContent=`Could not run Java.\n\n${e.message}\n\nCheck the compiler endpoint and your internet connection.`; setStatus('Run failed','bad'); speakResults('',ui.stderr.textContent); }
    } finally { running=false; currentToken=null; abortController=null; ui.run.disabled=false; }
  }
  function stopRun() {
    if(!running) return toast('Nothing is running');
    if(abortController) abortController.abort(); running=false; currentToken=null; ui.run.disabled=false; setStatus('Stopped','bad'); stopSpeech();
  }

  async function copyText(text,label) { try{await navigator.clipboard.writeText(text);toast(`${label} copied`);}catch{toast('Copy blocked');} }
  function downloadSource() { downloadBlob('Main.java',getCode(),'text/x-java-source;charset=utf-8'); }
  function clearOutputs() { stopSpeech(); ui.stdout.textContent='Output will appear here.'; ui.stderr.textContent='Errors will appear here.'; ui.runMeta.textContent='Ready'; setStatus('Ready'); }

  async function toggleAppFullscreen() {
    const active=document.body.classList.contains('appFullscreen')||document.fullscreenElement;
    if(active){document.body.classList.remove('appFullscreen');try{if(document.fullscreenElement)await document.exitFullscreen();}catch{}}
    else{document.body.classList.add('appFullscreen');try{if(ui.app.requestFullscreen)await ui.app.requestFullscreen();}catch{}}
    syncFullscreenText();
  }
  function syncFullscreenText(){const active=document.body.classList.contains('appFullscreen')||document.fullscreenElement;document.querySelectorAll('.fullscreenBtn').forEach(b=>b.textContent=active?'⛶ Exit full screen':'⛶ Full screen');}
  function toggleCodeFullscreen(){const active=ui.codeCard.classList.toggle('codeExpanded');document.body.classList.toggle('lock',active);ui.codeFullscreen.textContent=active?'Original size':'Full screen';if(editor)setTimeout(()=>editor.resize(),30);}
  function closeIoExpanded(){document.querySelectorAll('.ioCard.ioExpanded').forEach(c=>{c.classList.remove('ioExpanded');const b=c.querySelector('.expandBtn');if(b)b.textContent='Expand';});if(!ui.codeCard.classList.contains('codeExpanded'))document.body.classList.remove('lock');}
  function toggleIo(card){const opening=!card.classList.contains('ioExpanded');closeIoExpanded();if(opening){if(ui.codeCard.classList.contains('codeExpanded'))toggleCodeFullscreen();card.classList.add('ioExpanded');card.querySelector('.expandBtn').textContent='Original size';document.body.classList.add('lock');}}

  async function saveApi() { const value=ui.apiUrl.value.trim().replace(/\/+$/,''); if(!/^https?:\/\//i.test(value))return toast('Enter a valid API URL'); localStorage.setItem(S.api,value);ui.settingsDialog.close();toast('Compiler endpoint saved'); }

  function bind() {
    ui.run.addEventListener('click',runCode); ui.stop.addEventListener('click',stopRun); ui.clear.addEventListener('click',clearOutputs);
    ui.theme.addEventListener('click',()=>applyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark'));
    ui.share.addEventListener('click',shareProject); ui.font.addEventListener('change',()=>applyFont(ui.font.value));
    ui.read.checked=localStorage.getItem(S.read)==='true'; ui.read.addEventListener('change',()=>{localStorage.setItem(S.read,String(ui.read.checked));if(!ui.read.checked)stopSpeech();});
    ui.sample.addEventListener('change',()=>{setCode(samples[ui.sample.value]);save();});
    ui.newBtn.addEventListener('click',()=>{setCode(samples.hello);ui.stdin.value='';clearOutputs();save();});
    ui.copyCode.addEventListener('click',()=>copyText(getCode(),'Code')); ui.download.addEventListener('click',downloadSource); ui.copyOut.addEventListener('click',()=>copyText(ui.stdout.textContent,'stdout'));
    ui.stdin.addEventListener('input',queueSave); ui.compilerOptions.addEventListener('input',queueSave); ui.commandArgs.addEventListener('input',queueSave);
    ui.buildBtn.addEventListener('click',()=>ui.buildOptions.classList.toggle('show'));
    document.querySelectorAll('.fullscreenBtn').forEach(b=>b.addEventListener('click',toggleAppFullscreen));
    document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement)document.body.classList.remove('appFullscreen');syncFullscreenText();});
    ui.codeFullscreen.addEventListener('click',toggleCodeFullscreen); document.querySelectorAll('.expandBtn').forEach(b=>b.addEventListener('click',()=>toggleIo(b.closest('.ioCard'))));
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&ui.codeCard.classList.contains('codeExpanded'))toggleCodeFullscreen();else if(e.key==='Escape'&&document.querySelector('.ioCard.ioExpanded'))closeIoExpanded();});
    ui.settingsBtn.addEventListener('click',()=>{ui.apiUrl.value=getApi();ui.settingsDialog.showModal();}); ui.resetApi.addEventListener('click',()=>ui.apiUrl.value=DEFAULT_API); ui.saveApi.addEventListener('click',saveApi);
    ui.upload.addEventListener('click',()=>ui.fileInput.click()); ui.fileInput.addEventListener('change',async()=>{await uploadFiles(Array.from(ui.fileInput.files||[]));ui.fileInput.value='';}); ui.downloadAll.addEventListener('click',downloadAllFiles);
    ui.fileList.addEventListener('click',async e=>{const d=e.target.closest('[data-download]'),x=e.target.closest('[data-delete]');if(d){const f=projectFiles.find(v=>v.name===d.dataset.download);if(f)downloadBlob(f.name,f.data,f.type);}if(x&&confirm(`Delete ${x.dataset.delete}?`)){await dbDelete(x.dataset.delete);await refreshFiles();}});
    window.addEventListener('beforeunload',save);
  }

  async function boot() {
    const q=new URLSearchParams(location.search); ui.modeBadge.textContent=q.get('tmode')==='1'?'Teacher':'Student';
    ui.stdin.value=localStorage.getItem(S.stdin)||''; ui.compilerOptions.value=localStorage.getItem(S.compiler)||''; ui.commandArgs.value=localStorage.getItem(S.args)||''; ui.apiUrl.value=getApi();
    initEditor();
    const hashLoaded=loadHash();
    if(!hashLoaded){setCode(localStorage.getItem(S.code)||samples.hello);await loadRemoteCode();}
    bind(); await refreshFiles();
  }
  boot();
})();