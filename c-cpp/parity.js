(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const K = {
    font: 'lwc_cpp_ide_font_size',
    flags: 'lwc_cpp_ide_compiler_options',
    args: 'lwc_cpp_ide_command_args',
    read: 'lwc_cpp_ide_read_output'
  };
  const state = { files: [], aborters: new Set(), lastResult: null };
  const originalFetch = window.fetch.bind(window);

  const toast = msg => {
    const el = $('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => el.classList.remove('show'), 1800);
  };
  const codeEditor = () => window.ace ? ace.edit('editor') : null;
  const getCode = () => codeEditor()?.getValue() ?? $('fallbackEditor')?.value ?? '';
  const setCode = code => {
    const ed = codeEditor();
    if (ed) ed.setValue(String(code ?? ''), -1);
    else if ($('fallbackEditor')) $('fallbackEditor').value = String(code ?? '');
  };
  const fmtSize = n => n < 1024 ? `${n} B` : n < 1048576 ? `${(n/1024).toFixed(1)} KB` : `${(n/1048576).toFixed(1)} MB`;
  const dl = (name, blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  function injectUI() {
    const topbar = document.querySelector('.topbar');
    const workspace = document.querySelector('.workspace');
    if (!topbar || !workspace || $('parityToolbar')) return;

    const toolbar = document.createElement('section');
    toolbar.id = 'parityToolbar'; toolbar.className = 'parity-toolbar';
    toolbar.innerHTML = `
      <button class="btn ghost" id="parityStop" type="button">■ Stop</button>
      <button class="btn ghost" id="parityFullscreen" type="button">⛶ Full screen</button>
      <button class="btn ghost" id="parityShare" type="button">🔗 Share</button>
      <button class="btn ghost" id="parityCodeFullscreen" type="button">Code full screen</button>
      <button class="btn ghost" id="parityBuildToggle" type="button">⚙ Build options</button>
      <label>Font <select id="parityFont"><option value="14">Small</option><option value="16">Normal</option><option value="20">Large</option><option value="24">XL</option><option value="30">XXL</option></select></label>
      <label class="parity-speech"><input id="parityRead" type="checkbox"> Read stdout / stderr</label>
      <span id="parityMode" class="parity-mode-badge">Student</span>
      <span id="parityStatus" class="parity-status ok">Ready</span>`;
    topbar.insertAdjacentElement('afterend', toolbar);

    const build = document.createElement('section');
    build.id = 'parityBuild'; build.className = 'parity-build';
    build.innerHTML = `
      <label>Compiler options<input id="parityFlags" placeholder="-O2 -Wall -std=c++20"></label>
      <label>Command-line arguments<input id="parityArgs" placeholder="arg1 arg2"></label>
      <button class="mini-btn" id="parityDefaults" type="button">Recommended flags</button>
      <button class="mini-btn" id="parityLibraries" type="button">Common libraries</button>`;
    toolbar.insertAdjacentElement('afterend', build);

    const inputPanel = document.querySelector('.input-panel');
    const outputPanel = document.querySelector('.output-panel');
    if (inputPanel) addExpandButton(inputPanel, 'stdin');
    if (outputPanel) {
      const title = outputPanel.querySelector('h2'); if (title) title.textContent = 'stdout';
      addExpandButton(outputPanel, 'stdout');
      const head = outputPanel.querySelector('.panel-title-row');
      const b = document.createElement('button'); b.className='mini-btn'; b.id='parityCopyOut'; b.textContent='Copy'; b.type='button'; head?.appendChild(b);
    }

    const io = document.querySelector('.io-column');
    if (io) {
      const err = document.createElement('section'); err.className='panel parity-stderr'; err.id='parityErrPanel';
      err.innerHTML = `<div class="panel-title-row"><div><h2>stderr / errors</h2><p>Compiler and runtime errors</p></div><button class="mini-btn" id="parityExpandErr" type="button">Expand</button></div><pre id="parityErr">Errors will appear here.</pre>`;
      io.appendChild(err);
      $('parityExpandErr')?.addEventListener('click', () => toggleIO(err, $('parityExpandErr')));
    }

    const files = document.createElement('section'); files.className='parity-files'; files.id='parityFiles';
    files.innerHTML = `<div class="parity-files-head"><div><h2>Project files</h2><p>Upload headers/data files. They are sent with each run and kept in this browser.</p></div><div class="parity-files-actions"><input hidden id="parityFileInput" type="file" multiple><button class="mini-btn" id="parityUpload" type="button">Upload files</button><button class="mini-btn" id="parityRefresh" type="button">Refresh</button><button class="mini-btn" id="parityZip" type="button">Download all as ZIP</button></div></div><div id="parityFileList" class="parity-file-list"><p class="parity-empty">No project files yet.</p></div>`;
    workspace.insertAdjacentElement('afterend', files);
  }

  function addExpandButton(panel) {
    const head = panel.querySelector('.panel-title-row');
    if (!head) return;
    const b = document.createElement('button'); b.className='mini-btn'; b.type='button'; b.textContent='Expand';
    b.addEventListener('click', () => toggleIO(panel,b));
    head.appendChild(b);
  }
  function toggleIO(panel, btn) {
    const on = !panel.classList.contains('parity-io-fullscreen');
    document.querySelectorAll('.parity-io-fullscreen').forEach(p => p.classList.remove('parity-io-fullscreen'));
    document.querySelectorAll('.parity-code-fullscreen').forEach(p => p.classList.remove('parity-code-fullscreen'));
    document.body.classList.toggle('parity-lock', on);
    if (on) panel.classList.add('parity-io-fullscreen');
    btn.textContent = on ? 'Original size' : 'Expand';
  }
  function resizeAce(){ setTimeout(() => { try { codeEditor()?.resize(true); } catch {} }, 30); }

  function applyFont(size) {
    size = Number(size) || 16;
    localStorage.setItem(K.font,String(size));
    try { codeEditor()?.setFontSize(size); } catch {}
    if ($('fallbackEditor')) $('fallbackEditor').style.fontSize = `${size}px`;
    if ($('parityFont')) $('parityFont').value = String(size);
  }

  function stopReading(){ if ('speechSynthesis' in window) speechSynthesis.cancel(); }
  function speak(stdout, stderr) {
    if (!$('parityRead')?.checked || !('speechSynthesis' in window)) return;
    stopReading();
    const voices = speechSynthesis.getVoices();
    const preferred = voices.find(v => /^en-IN$/i.test(v.lang)) || voices.find(v => /^en/i.test(v.lang));
    const parts = [];
    if (String(stdout||'').trim()) parts.push(`Standard output. ${stdout}`);
    if (String(stderr||'').trim()) parts.push(`Standard error. ${stderr}`);
    if (!parts.length) parts.push('The program finished with no standard output or standard error.');
    for (const text of parts) { const u = new SpeechSynthesisUtterance(text); u.lang='en-IN'; if(preferred)u.voice=preferred; speechSynthesis.speak(u); }
  }

  async function shareProject() {
    const p = { code:getCode(), stdin:$('stdin')?.value||'', language:$('languageSelect')?.value||'cpp', flags:$('parityFlags')?.value||'', args:$('parityArgs')?.value||'' };
    const bytes = new TextEncoder().encode(JSON.stringify(p)); let bin=''; bytes.forEach(b=>bin+=String.fromCharCode(b));
    const hash=btoa(bin).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
    const url=location.origin+location.pathname+location.search+'#'+hash;
    try { if(navigator.share) await navigator.share({title:document.title,url}); else { await navigator.clipboard.writeText(url); toast('Share link copied'); } } catch { toast('Share cancelled'); }
  }
  function loadHash(){
    if(!location.hash) return false;
    try{ let s=location.hash.slice(1).replaceAll('-','+').replaceAll('_','/'); while(s.length%4)s+='='; const bin=atob(s); const bytes=Uint8Array.from(bin,c=>c.charCodeAt(0)); const p=JSON.parse(new TextDecoder().decode(bytes));
      if(typeof p.language==='string'){ $('languageSelect').value=p.language; $('languageSelect').dispatchEvent(new Event('change')); }
      if(typeof p.code==='string') setCode(p.code);
      if(typeof p.stdin==='string') $('stdin').value=p.stdin;
      if(typeof p.flags==='string') $('parityFlags').value=p.flags;
      if(typeof p.args==='string') $('parityArgs').value=p.args;
      return true;
    }catch{return false;}
  }

  async function loadRemoteCode(){
    if(location.hash) return;
    const q=new URLSearchParams(location.search); const codefile=q.get('codefile'); const code=q.get('code');
    try{
      if(codefile){ const r=await originalFetch(codefile); if(!r.ok)throw new Error('Code file not found'); setCode(await r.text()); toast('Code file loaded'); return; }
      if(code){ const r=await originalFetch(code); if(!r.ok)throw new Error('Code JSON not found'); const d=await r.json(); let item=d;
        if(Array.isArray(d)) item=d[0]||{}; else if(Array.isArray(d.tabs)) item=d.tabs[Number(d.currentTab)||0]||d.tabs[0]||{};
        if(typeof item.code==='string') setCode(item.code); else if(typeof d.code==='string') setCode(d.code);
        if(typeof d.stdin==='string') $('stdin').value=d.stdin;
        toast('Remote code loaded');
      }
    }catch(e){toast(e.message);}
  }

  function openDB(){ return new Promise((resolve,reject)=>{ const r=indexedDB.open('lwc_cpp_project_files',1); r.onupgradeneeded=()=>r.result.createObjectStore('files',{keyPath:'name'}); r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error); }); }
  async function getFiles(){ const db=await openDB(); return new Promise((resolve,reject)=>{ const tx=db.transaction('files','readonly'); const r=tx.objectStore('files').getAll(); r.onsuccess=()=>resolve(r.result||[]); r.onerror=()=>reject(r.error); }); }
  async function putFiles(files){ const db=await openDB(); await new Promise((resolve,reject)=>{ const tx=db.transaction('files','readwrite'); files.forEach(f=>tx.objectStore('files').put(f)); tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error); }); await refreshFiles(); }
  async function removeFile(name){ const db=await openDB(); await new Promise((resolve,reject)=>{ const tx=db.transaction('files','readwrite'); tx.objectStore('files').delete(name); tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error); }); await refreshFiles(); }
  async function refreshFiles(){ try{ state.files=await getFiles(); renderFiles(); }catch{ state.files=[]; renderFiles(); } }
  function renderFiles(){ const box=$('parityFileList'); if(!box)return; $('parityZip').disabled=!state.files.length; if(!state.files.length){box.innerHTML='<p class="parity-empty">No project files yet.</p>';return;} box.innerHTML=state.files.map(f=>`<div class="parity-file-row"><span class="parity-file-name" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</span><span class="parity-file-size">${fmtSize(f.data?.byteLength||0)}</span><span class="parity-file-buttons"><button class="mini-btn" data-get="${escapeHtml(f.name)}">Download</button><button class="mini-btn" data-del="${escapeHtml(f.name)}">Delete</button></span></div>`).join(''); }
  function escapeHtml(s){return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');}
  async function zipBase64(){ if(!state.files.length||!window.JSZip)return null; const z=new JSZip(); state.files.forEach(f=>z.file(f.name,f.data)); return z.generateAsync({type:'base64'}); }

  function bindUI(){
    $('parityStop')?.addEventListener('click',()=>{ state.aborters.forEach(c=>c.abort()); state.aborters.clear(); stopReading(); $('parityStatus').textContent='Stopped'; $('parityStatus').className='parity-status bad'; toast('Stopped'); });
    $('parityFullscreen')?.addEventListener('click',async()=>{ const on=!document.body.classList.contains('parity-app-fullscreen'); document.body.classList.toggle('parity-app-fullscreen',on); if(on){try{await document.documentElement.requestFullscreen?.();}catch{}}else if(document.fullscreenElement){try{await document.exitFullscreen();}catch{}} $('parityFullscreen').textContent=on?'⛶ Exit full screen':'⛶ Full screen'; resizeAce(); });
    $('parityShare')?.addEventListener('click',shareProject);
    $('parityCodeFullscreen')?.addEventListener('click',()=>{ const p=document.querySelector('.editor-panel'); const on=!p.classList.contains('parity-code-fullscreen'); p.classList.toggle('parity-code-fullscreen',on); document.body.classList.toggle('parity-lock',on); $('parityCodeFullscreen').textContent=on?'Original size':'Code full screen'; resizeAce(); });
    $('parityBuildToggle')?.addEventListener('click',()=> $('parityBuild').classList.toggle('show'));
    $('parityFont')?.addEventListener('change',e=>applyFont(e.target.value));
    $('parityRead').checked=localStorage.getItem(K.read)==='true'; $('parityRead')?.addEventListener('change',e=>{localStorage.setItem(K.read,String(e.target.checked));if(!e.target.checked)stopReading();});
    $('parityFlags').value=localStorage.getItem(K.flags)||''; $('parityArgs').value=localStorage.getItem(K.args)||'';
    $('parityFlags')?.addEventListener('input',e=>localStorage.setItem(K.flags,e.target.value)); $('parityArgs')?.addEventListener('input',e=>localStorage.setItem(K.args,e.target.value));
    $('parityDefaults')?.addEventListener('click',()=>{ $('parityFlags').value=$('languageSelect').value==='cpp'?'-Wall -Wextra -std=c++20':'-Wall -Wextra -std=c17'; localStorage.setItem(K.flags,$('parityFlags').value); });
    $('parityLibraries')?.addEventListener('click',()=>{ $('output').textContent='Common built-in libraries\nC: stdio.h, stdlib.h, string.h, math.h, time.h\nC++: iostream, vector, string, algorithm, map, set, queue, stack, numeric, filesystem\n\nFor your own headers/data files, use Project files below. Linker/compiler flags can be entered in Build options.'; });
    $('parityCopyOut')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('output').textContent);toast('stdout copied');}catch{toast('Copy blocked');}});
    $('clearOutputBtn')?.addEventListener('click',()=>{ if($('parityErr'))$('parityErr').textContent='Errors will appear here.'; });
    $('parityUpload')?.addEventListener('click',()=> $('parityFileInput').click());
    $('parityFileInput')?.addEventListener('change',async e=>{ const selected=Array.from(e.target.files||[]); if(selected.some(f=>f.size>20*1024*1024)){toast('Each file must be 20 MB or smaller');e.target.value='';return;} const rows=[]; for(const f of selected)rows.push({name:f.name,type:f.type,data:await f.arrayBuffer()}); await putFiles(rows); e.target.value=''; toast('Files added'); });
    $('parityRefresh')?.addEventListener('click',refreshFiles);
    $('parityZip')?.addEventListener('click',async()=>{ if(!state.files.length)return; const z=new JSZip(); state.files.forEach(f=>z.file(f.name,f.data)); dl('c-cpp-project-files.zip',await z.generateAsync({type:'blob'})); });
    $('parityFileList')?.addEventListener('click',async e=>{ const g=e.target.closest('[data-get]'),d=e.target.closest('[data-del]'); if(g){const f=state.files.find(x=>x.name===g.dataset.get);if(f)dl(f.name,new Blob([f.data],{type:f.type||'application/octet-stream'}));} if(d&&confirm(`Delete ${d.dataset.del}?`))await removeFile(d.dataset.del); });
    document.addEventListener('keydown',e=>{ if(e.key==='Escape'){document.querySelectorAll('.parity-io-fullscreen').forEach(p=>p.classList.remove('parity-io-fullscreen'));document.querySelector('.editor-panel')?.classList.remove('parity-code-fullscreen');document.body.classList.remove('parity-lock');resizeAce();} });
  }

  window.fetch = async function(input, init={}) {
    const url=typeof input==='string'?input:input.url;
    const controller=new AbortController();
    const external=init.signal;
    if(external) external.addEventListener('abort',()=>controller.abort(),{once:true});
    const opts={...init,signal:controller.signal};
    const judge=/\/submissions(?:\/|\?|$)/.test(url);
    if(judge) state.aborters.add(controller);
    try{
      if(judge && (opts.method||'GET').toUpperCase()==='POST' && typeof opts.body==='string'){
        try{ const p=JSON.parse(opts.body); const flags=$('parityFlags')?.value?.trim(); const args=$('parityArgs')?.value?.trim(); if(flags)p.compiler_options=flags;if(args)p.command_line_arguments=args; const z=await zipBase64(); if(z)p.additional_files=z; opts.body=JSON.stringify(p); $('parityStatus').textContent='Running…'; $('parityStatus').className='parity-status'; }catch{}
      }
      const response=await originalFetch(input,opts);
      if(judge && (opts.method||'GET').toUpperCase()==='GET' && /\/submissions\//.test(url)){
        try{ const data=await response.clone().json(); const id=data.status?.id; if(id!==1&&id!==2){ state.lastResult=data; const stdout=data.stdout||''; const stderr=[data.compile_output,data.stderr,data.message].filter(Boolean).join('\n'); setTimeout(()=>{ if($('output')){$('output').textContent=stdout||'(no stdout)';$('output').classList.remove('error');$('output').classList.add('success');} if($('parityErr'))$('parityErr').textContent=stderr||'(no stderr)'; $('parityStatus').textContent=data.status?.description||'Complete'; $('parityStatus').className='parity-status '+(stderr?'bad':'ok'); speak(stdout,stderr); },0); } }catch{}
      }
      return response;
    } finally { if(judge) state.aborters.delete(controller); }
  };

  async function boot(){
    injectUI(); bindUI(); applyFont(localStorage.getItem(K.font)||16); await refreshFiles();
    const q=new URLSearchParams(location.search); const teacher=q.get('tmode')==='1'; $('parityMode').textContent=teacher?'Teacher':'Student'; if(teacher)$('parityShare').hidden=true;
    if(!loadHash()) await loadRemoteCode();
    resizeAce();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
