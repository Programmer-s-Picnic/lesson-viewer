/* Hiring Process Simulator — Candidate + Recruiter (A + C)
   Works on static hosting (GitHub Pages / Live Server).
   Data stored in localStorage.
*/

const HS = (() => {
  const LS_KEY = 'hiringSim.v1';

  const nowISO = () => new Date().toISOString();
  const uid = () => Math.random().toString(16).slice(2) + '-' + Date.now().toString(16);

  function loadState(){
    try{
      const raw = localStorage.getItem(LS_KEY);
      if(!raw) return { candidates:{}, attempts:[], pipelines:{} };
      const obj = JSON.parse(raw);
      return {
        candidates: obj.candidates || {},
        attempts: obj.attempts || [],
        pipelines: obj.pipelines || {}
      };
    }catch(e){
      return { candidates:{}, attempts:[], pipelines:{} };
    }
  }

  function saveState(state){
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  }

  function upsertCandidate(profile){
    const st = loadState();
    const id = profile.id || uid();
    const prev = st.candidates[id] || {};
    st.candidates[id] = {
      id,
      name: profile.name?.trim() || prev.name || 'Unnamed Candidate',
      email: profile.email?.trim() || prev.email || '',
      phone: profile.phone?.trim() || prev.phone || '',
      goalRole: profile.goalRole || prev.goalRole || 'Software Intern',
      skills: profile.skills || prev.skills || [],
      projects: profile.projects || prev.projects || [],
      createdAt: prev.createdAt || nowISO(),
      updatedAt: nowISO()
    };
    saveState(st);
    return st.candidates[id];
  }

  function listCandidates(){
    const st = loadState();
    return Object.values(st.candidates).sort((a,b)=> (b.updatedAt||'').localeCompare(a.updatedAt||''));
  }

  function recordAttempt(attempt){
    const st = loadState();
    st.attempts.unshift({
      id: attempt.id || uid(),
      candidateId: attempt.candidateId,
      stage: attempt.stage,
      score: attempt.score,
      maxScore: attempt.maxScore,
      details: attempt.details || {},
      startedAt: attempt.startedAt || nowISO(),
      finishedAt: attempt.finishedAt || nowISO()
    });
    saveState(st);
    return st.attempts[0];
  }

  function getAttemptsByCandidate(candidateId){
    const st = loadState();
    return st.attempts.filter(a=>a.candidateId===candidateId);
  }

  function getLatestScore(candidateId, stage){
    const at = getAttemptsByCandidate(candidateId).find(a=>a.stage===stage);
    return at ? {score:at.score, max:at.maxScore, finishedAt:at.finishedAt, details:at.details} : null;
  }

  function getOrCreatePipeline(pipelineId='default'){
    const st = loadState();
    if(!st.pipelines[pipelineId]){
      st.pipelines[pipelineId] = {
        id: pipelineId,
        updatedAt: nowISO(),
        stages: {
          Applied: [],
          Aptitude: [],
          Tech: [],
          HR: [],
          Offer: [],
          Rejected: []
        }
      };
      saveState(st);
    }
    return st.pipelines[pipelineId];
  }

  function pipelineMove(candidateId, fromStage, toStage, pipelineId='default'){
    const st = loadState();
    const p = st.pipelines[pipelineId] || getOrCreatePipeline(pipelineId);
    const stages = p.stages;
    // remove from all stages (safe)
    for(const k of Object.keys(stages)) stages[k] = stages[k].filter(x=>x!==candidateId);
    // add to destination
    if(!stages[toStage]) stages[toStage] = [];
    stages[toStage].unshift(candidateId);
    p.updatedAt = nowISO();
    st.pipelines[pipelineId] = p;
    saveState(st);
    return p;
  }

  function ensureCandidateInPipeline(candidateId, pipelineId='default'){
    const p = getOrCreatePipeline(pipelineId);
    const st = loadState();
    const stages = p.stages;
    const exists = Object.values(stages).some(arr=>arr.includes(candidateId));
    if(!exists){
      stages.Applied.unshift(candidateId);
      p.updatedAt = nowISO();
      st.pipelines[pipelineId]=p;
      saveState(st);
    }
    return getOrCreatePipeline(pipelineId);
  }

  function resetAll(){
    localStorage.removeItem(LS_KEY);
  }

  // ---------- Scoring helpers ----------

  function clamp(n,min,max){
    return Math.max(min, Math.min(max,n));
  }

  function scoreResume(text){
    const t = (text||'').trim();
    if(!t) return { score:0, max:100, notes:["No resume text provided."], tags:[] };

    const lower = t.toLowerCase();
    const tags = [];
    const notes = [];

    const sections = [
      {k:'education', w:12},
      {k:'project', w:18},
      {k:'experience', w:14},
      {k:'skills', w:14},
      {k:'intern', w:8},
      {k:'github', w:8},
      {k:'linkedin', w:6},
      {k:'cert', w:6},
      {k:'achiev', w:6}
    ];

    let score = 20; // baseline
    for(const s of sections){
      if(lower.includes(s.k)) { score += s.w; tags.push(s.k); }
    }

    // keyword boost
    const kw = ['python','javascript','sql','git','api','flask','django','pandas','numpy','ml','nlp','data','react','html','css'];
    const found = kw.filter(k=>lower.includes(k));
    score += clamp(found.length*2,0,22);
    if(found.length>=6) notes.push('Nice: good spread of technical keywords.');
    else notes.push('Tip: add a clear Skills section + mention tools (Git, SQL, projects).');

    // length / clarity
    const words = t.split(/\s+/).filter(Boolean).length;
    if(words < 120){ score -= 10; notes.push('Resume feels too short. Add 2–3 strong project bullets with impact.'); }
    if(words > 900){ score -= 8; notes.push('Resume feels too long. Keep it crisp (1 page for freshers).'); }

    // basic hygiene
    if(!/\b\+?\d[\d\s-]{8,}\b/.test(t)) notes.push('Add a phone number.');
    if(!/\b\S+@\S+\.\S+\b/.test(t)) notes.push('Add a professional email.');

    // bullet points
    if((t.match(/\n\s*[-•*]/g)||[]).length >= 5){ score += 5; notes.push('Good: bullet points improve scan-ability.'); }
    else notes.push('Tip: use bullet points for projects/experience.');

    score = clamp(Math.round(score), 0, 100);
    return { score, max:100, notes, tags: Array.from(new Set(tags)) };
  }

  function scoreHRAnswer(questionId, answer){
    const a = (answer||'').trim();
    const lower = a.toLowerCase();
    let score = 0;
    const tips = [];

    const len = a.split(/\s+/).filter(Boolean).length;
    if(len >= 40) score += 8; else tips.push('Too short — give context + outcome.');
    if(len >= 80) score += 6;

    // STAR signals
    const starWords = ['situation','task','action','result','learned','impact'];
    const starHit = starWords.filter(w=>lower.includes(w)).length;
    score += clamp(starHit*2,0,10);

    // positives
    const pos = ['team','ownership','deadline','debug','improve','optimize','learn','feedback','customer','users','challenge'];
    score += clamp(pos.filter(w=>lower.includes(w)).length,0,10);

    // negatives
    const neg = ['because i was lazy','no idea','don\'t know','whatever'];
    if(neg.some(w=>lower.includes(w))) { score -= 8; tips.push('Avoid casual/negative phrasing.'); }

    // question-specific nudges
    if(questionId==='intro' && !(lower.includes('project')||lower.includes('projects'))){ tips.push('Mention 1–2 projects quickly.'); }
    if(questionId==='whyhire' && !(lower.includes('value')||lower.includes('impact')||lower.includes('deliver'))){ tips.push('Explain value you deliver (impact).'); }
    if(questionId==='weakness' && !(lower.includes('improv')||lower.includes('working')||lower.includes('plan'))){ tips.push('Show improvement plan for weakness.'); }

    score = clamp(Math.round(score), 0, 30);
    return { score, max:30, tips };
  }

  async function fetchJSON(path){
    const res = await fetch(path, {cache:'no-store'});
    if(!res.ok) throw new Error('Failed to load ' + path);
    return await res.json();
  }

  // ---------- UI helpers ----------

  function qs(sel, root=document){ return root.querySelector(sel); }
  function qsa(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }
  function fmtPct(score, max){
    if(!max) return '0%';
    return Math.round((score/max)*100) + '%';
  }

  function toast(msg, kind='ok'){
    const el = document.createElement('div');
    el.className = 'toast ' + kind;
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(()=> el.classList.add('show'));
    setTimeout(()=>{
      el.classList.remove('show');
      setTimeout(()=>el.remove(), 250);
    }, 2200);
  }

  return {
    loadState, saveState, upsertCandidate, listCandidates,
    recordAttempt, getAttemptsByCandidate, getLatestScore,
    getOrCreatePipeline, pipelineMove, ensureCandidateInPipeline,
    resetAll,
    scoreResume, scoreHRAnswer,
    fetchJSON,
    qs, qsa, fmtPct, toast
  };
})();

// ---------------- Page Controllers ----------------

document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.getAttribute('data-page');
  if(page==='home') initHome();
  if(page==='candidate') initCandidate();
  if(page==='recruiter') initRecruiter();
  if(page==='dashboard') initDashboard();
  if(page==='help') initHelp();
});

function initHome(){
  const st = HS.loadState();
  const count = Object.keys(st.candidates||{}).length;
  const attempts = (st.attempts||[]).length;
  HS.qs('#stats').textContent = `${count} candidates • ${attempts} attempts recorded`;

  HS.qs('#resetBtn').addEventListener('click', () => {
    if(confirm('Reset all local data? This will delete candidates, attempts, and pipeline.')){
      HS.resetAll();
      location.reload();
    }
  });

  // Quick create candidate
  HS.qs('#quickCreate').addEventListener('submit', (e)=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const c = HS.upsertCandidate({
      name: fd.get('name'),
      email: fd.get('email'),
      phone: fd.get('phone'),
      goalRole: fd.get('role')
    });
    HS.ensureCandidateInPipeline(c.id);
    HS.toast('Candidate created.');
    setTimeout(()=> location.href = `candidate.html?id=${encodeURIComponent(c.id)}`, 350);
  });

  // Recent candidates
  const list = HS.listCandidates().slice(0,6);
  const wrap = HS.qs('#recentCandidates');
  wrap.innerHTML = '';
  if(!list.length){
    wrap.innerHTML = `<div class="muted">No candidates yet. Create one above to start.</div>`;
    return;
  }
  for(const c of list){
    const card = document.createElement('a');
    card.className = 'mini-card';
    card.href = `candidate.html?id=${encodeURIComponent(c.id)}`;
    const ap = HS.getLatestScore(c.id,'aptitude');
    const te = HS.getLatestScore(c.id,'tech');
    const hr = HS.getLatestScore(c.id,'hr');
    const rs = HS.getLatestScore(c.id,'resume');
    card.innerHTML = `
      <div class="mini-top">
        <div>
          <div class="mini-title">${escapeHTML(c.name)}</div>
          <div class="mini-sub">${escapeHTML(c.goalRole || '')}</div>
        </div>
        <span class="pill">${escapeHTML(c.id.slice(0,6))}</span>
      </div>
      <div class="mini-grid">
        ${scoreChip('Resume', rs)}
        ${scoreChip('Aptitude', ap)}
        ${scoreChip('Tech', te)}
        ${scoreChip('HR', hr)}
      </div>
    `;
    wrap.appendChild(card);
  }
}

function scoreChip(label, s){
  if(!s) return `<div class="chip"><span>${label}</span><b class="muted">—</b></div>`;
  const pct = Math.round((s.score/s.max)*100);
  const cls = pct>=70 ? 'good' : pct>=45 ? 'mid' : 'bad';
  return `<div class="chip ${cls}"><span>${label}</span><b>${pct}%</b></div>`;
}

function getParam(name){
  const u = new URL(location.href);
  return u.searchParams.get(name);
}

function initCandidate(){
  const id = getParam('id');
  if(!id){
    HS.toast('Missing candidate id','bad');
    setTimeout(()=> location.href='index.html', 500);
    return;
  }
  const st = HS.loadState();
  const c = st.candidates[id];
  if(!c){
    HS.toast('Candidate not found','bad');
    setTimeout(()=> location.href='index.html', 700);
    return;
  }
  HS.ensureCandidateInPipeline(id);

  // header
  HS.qs('#candName').textContent = c.name;
  HS.qs('#candMeta').textContent = `${c.goalRole} • ${c.email || 'no email'} • ${c.phone || 'no phone'}`;

  // profile form
  const form = HS.qs('#profileForm');
  form.name.value = c.name || '';
  form.email.value = c.email || '';
  form.phone.value = c.phone || '';
  form.role.value = c.goalRole || '';
  form.skills.value = (c.skills||[]).join(', ');
  form.projects.value = (c.projects||[]).join('\n');

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const fd = new FormData(form);
    const skills = String(fd.get('skills')||'').split(',').map(s=>s.trim()).filter(Boolean);
    const projects = String(fd.get('projects')||'').split(/\n+/).map(s=>s.trim()).filter(Boolean);
    HS.upsertCandidate({
      id,
      name: fd.get('name'),
      email: fd.get('email'),
      phone: fd.get('phone'),
      goalRole: fd.get('role'),
      skills,
      projects
    });
    HS.toast('Profile saved');
    refreshCandidateScorecards(id);
  });

  // resume scoring
  const resumeText = HS.qs('#resumeText');
  const prevResume = HS.getLatestScore(id,'resume');
  if(prevResume?.details?.resumeText) resumeText.value = prevResume.details.resumeText;

  HS.qs('#scoreResumeBtn').addEventListener('click', ()=>{
    const text = resumeText.value;
    const r = HS.scoreResume(text);
    HS.recordAttempt({
      candidateId:id,
      stage:'resume',
      score:r.score,
      maxScore:r.max,
      details:{ notes:r.notes, tags:r.tags, resumeText:text }
    });
    HS.toast(`Resume scored: ${r.score}/100`);
    renderResumeFeedback(r);
    refreshCandidateScorecards(id);
  });

  // load initial feedback if exists
  if(prevResume){
    renderResumeFeedback({
      score: prevResume.score,
      max: prevResume.max,
      notes: prevResume.details?.notes || [],
      tags: prevResume.details?.tags || []
    });
  }

  // Aptitude round
  HS.qs('#startAptitude').addEventListener('click', ()=> runAptitude(id));

  // Tech round
  HS.qs('#startTech').addEventListener('click', ()=> runTech(id));

  // HR round
  HS.qs('#startHR').addEventListener('click', ()=> runHR(id));

  // improvement plan
  HS.qs('#generatePlan').addEventListener('click', ()=> generatePlan(id));

  refreshCandidateScorecards(id);
}

function refreshCandidateScorecards(id){
  const rs = HS.getLatestScore(id,'resume');
  const ap = HS.getLatestScore(id,'aptitude');
  const te = HS.getLatestScore(id,'tech');
  const hr = HS.getLatestScore(id,'hr');

  renderStageCard('resumeCard', rs, 'Score your resume to unlock tips.');
  renderStageCard('aptitudeCard', ap, 'Attempt aptitude test (timed MCQs).');
  renderStageCard('techCard', te, 'Attempt coding test (JS function tasks).');
  renderStageCard('hrCard', hr, 'Attempt HR interview chat simulation.');

  // overall readiness
  const parts = [rs,ap,te,hr].filter(Boolean);
  let overall = 0;
  let max = 0;
  for(const p of parts){ overall += p.score; max += p.max; }
  const pct = max ? Math.round((overall/max)*100) : 0;
  HS.qs('#overallPct').textContent = pct + '%';
  HS.qs('#overallBar').style.width = pct + '%';
  HS.qs('#overallHint').textContent = pct>=75 ? 'Ready to apply confidently.' : pct>=50 ? 'Good progress — strengthen weak rounds.' : 'Start small — daily practice will move this fast.';
}

function renderStageCard(id, scoreObj, emptyText){
  const box = HS.qs('#'+id);
  if(!box) return;
  const pctEl = box.querySelector('[data-pct]');
  const barEl = box.querySelector('[data-bar]');
  const metaEl = box.querySelector('[data-meta]');

  if(!scoreObj){
    pctEl.textContent = '—';
    barEl.style.width = '0%';
    metaEl.textContent = emptyText;
    return;
  }
  const pct = Math.round((scoreObj.score/scoreObj.max)*100);
  pctEl.textContent = pct + '%';
  barEl.style.width = pct + '%';
  metaEl.textContent = `Latest: ${scoreObj.score}/${scoreObj.max} • ${new Date(scoreObj.finishedAt).toLocaleString()}`;
}

function renderResumeFeedback(r){
  HS.qs('#resumeScoreBig').textContent = `${r.score}/100`;
  HS.qs('#resumeBar').style.width = Math.round((r.score/r.max)*100) + '%';
  const tags = (r.tags||[]).map(t=>`<span class="tag">${escapeHTML(t)}</span>`).join('');
  HS.qs('#resumeTags').innerHTML = tags || '<span class="muted">No section tags detected yet.</span>';
  HS.qs('#resumeNotes').innerHTML = (r.notes||[]).map(n=>`<li>${escapeHTML(n)}</li>`).join('') || '<li class="muted">No notes.</li>';
}

async function runAptitude(candidateId){
  const panel = HS.qs('#aptitudePanel');
  panel.classList.add('open');
  panel.scrollIntoView({behavior:'smooth', block:'start'});

  const data = await HS.fetchJSON('data/aptitude.json');
  const questions = shuffle([...data.questions]).slice(0, data.settings.count);
  let idx = 0;
  let score = 0;
  const answers = [];

  const totalSec = data.settings.time_seconds;
  let left = totalSec;
  const tEl = HS.qs('#aptTime');
  const qEl = HS.qs('#aptQ');
  const optEl = HS.qs('#aptOptions');
  const prog = HS.qs('#aptProg');

  function render(){
    const q = questions[idx];
    prog.textContent = `Q${idx+1}/${questions.length}`;
    qEl.textContent = q.q;
    optEl.innerHTML = '';
    q.options.forEach((o,i)=>{
      const b = document.createElement('button');
      b.className = 'option';
      b.innerHTML = `<span class="optKey">${String.fromCharCode(65+i)}</span><span>${escapeHTML(o)}</span>`;
      b.addEventListener('click', ()=> choose(i));
      optEl.appendChild(b);
    });
  }

  function choose(choice){
    const q = questions[idx];
    const correct = q.answer;
    const isRight = choice===correct;
    if(isRight) score += (q.points||1);
    answers.push({ id:q.id, choice, correct, isRight, points:q.points||1 });
    idx++;
    if(idx >= questions.length){
      finish();
    }else{
      render();
    }
  }

  function finish(){
    clearInterval(timer);
    const maxScore = questions.reduce((a,q)=>a+(q.points||1),0);
    HS.recordAttempt({
      candidateId,
      stage:'aptitude',
      score,
      maxScore,
      details:{
        answers,
        questionsUsed: questions.map(q=>q.id),
        time_seconds: totalSec-left
      }
    });
    HS.toast(`Aptitude submitted: ${score}/${maxScore}`);
    renderAptitudeSummary(questions, answers, score, maxScore);
    refreshCandidateScorecards(candidateId);
    HS.ensureCandidateInPipeline(candidateId);
  }

  const timer = setInterval(()=>{
    left--;
    tEl.textContent = fmtTime(left);
    if(left<=0){
      finish();
    }
  }, 1000);

  tEl.textContent = fmtTime(left);
  render();
}

function renderAptitudeSummary(questions, answers, score, maxScore){
  const pct = Math.round((score/maxScore)*100);
  HS.qs('#aptSummary').innerHTML = `
    <div class="summaryRow">
      <div><b>Score</b><div class="muted">${score}/${maxScore} (${pct}%)</div></div>
      <div><b>Accuracy</b><div class="muted">${answers.filter(a=>a.isRight).length}/${answers.length}</div></div>
      <div><b>Hint</b><div class="muted">${pct>=70?'Good speed + accuracy.':'Practice 15 MCQs daily to improve.'}</div></div>
    </div>
  `;

  const review = HS.qs('#aptReview');
  review.innerHTML = '';
  answers.slice(0,8).forEach((a, i)=>{
    const q = questions.find(x=>x.id===a.id);
    const div = document.createElement('div');
    div.className = 'reviewItem ' + (a.isRight?'good':'bad');
    div.innerHTML = `
      <div class="reviewQ">${escapeHTML(q.q)}</div>
      <div class="reviewA">
        Your: <b>${String.fromCharCode(65+a.choice)}</b> • Correct: <b>${String.fromCharCode(65+a.correct)}</b>
      </div>
    `;
    review.appendChild(div);
  });
}

async function runTech(candidateId){
  const panel = HS.qs('#techPanel');
  panel.classList.add('open');
  panel.scrollIntoView({behavior:'smooth', block:'start'});

  const data = await HS.fetchJSON('data/coding.json');
  const task = pickOne(shuffle([...data.tasks]));

  HS.qs('#techTitle').textContent = task.title;
  HS.qs('#techPrompt').innerHTML = task.prompt.map(p=>`<p>${escapeHTML(p)}</p>`).join('');
  HS.qs('#techSig').textContent = task.signature;
  HS.qs('#techStarter').textContent = task.starter;

  const editor = HS.qs('#techCode');
  editor.value = task.starter;
  const out = HS.qs('#techOut');

  function runTests(){
    out.textContent = '';
    const code = editor.value;
    const result = runFunctionTests(code, task);
    out.textContent = result.report;
    out.className = 'codeout ' + (result.passedAll ? 'ok' : 'bad');
    return result;
  }

  HS.qs('#runTechTests').onclick = () => { runTests(); HS.toast('Tests executed'); };

  HS.qs('#submitTech').onclick = () => {
    const r = runTests();
    const maxScore = task.testcases.length;
    const score = r.passed;

    HS.recordAttempt({
      candidateId,
      stage:'tech',
      score,
      maxScore,
      details:{
        taskId: task.id,
        code: editor.value,
        passed: r.passed,
        failed: r.failed,
        report: r.report
      }
    });
    HS.toast(`Tech submitted: ${score}/${maxScore}`);
    refreshCandidateScorecards(candidateId);
  };
}

async function runHR(candidateId){
  const panel = HS.qs('#hrPanel');
  panel.classList.add('open');
  panel.scrollIntoView({behavior:'smooth', block:'start'});

  const data = await HS.fetchJSON('data/hr.json');
  const questions = shuffle([...data.questions]).slice(0, data.settings.count);

  const chat = HS.qs('#hrChat');
  const input = HS.qs('#hrInput');
  const send = HS.qs('#hrSend');
  const done = HS.qs('#hrSubmit');

  chat.innerHTML = '';
  let idx = 0;
  const answers = [];
  let total = 0;
  let maxTotal = 0;

  function botSay(text){
    const m = document.createElement('div');
    m.className = 'msg bot';
    m.innerHTML = `<div class="bubble">${escapeHTML(text)}</div>`;
    chat.appendChild(m);
    chat.scrollTop = chat.scrollHeight;
  }
  function userSay(text){
    const m = document.createElement('div');
    m.className = 'msg user';
    m.innerHTML = `<div class="bubble">${escapeHTML(text)}</div>`;
    chat.appendChild(m);
    chat.scrollTop = chat.scrollHeight;
  }

  function ask(){
    const q = questions[idx];
    botSay(q.q);
  }

  function onSend(){
    const text = input.value.trim();
    if(!text) return;
    userSay(text);
    const q = questions[idx];
    const s = HS.scoreHRAnswer(q.id, text);
    answers.push({
      id:q.id,
      question:q.q,
      answer:text,
      score:s.score,
      max:s.max,
      tips:s.tips
    });
    total += s.score;
    maxTotal += s.max;

    if(s.tips.length){
      botSay('Quick tip: ' + s.tips[0]);
    }else{
      botSay('Nice.');
    }

    input.value = '';
    idx++;
    if(idx >= questions.length){
      botSay('HR round completed. Click “Submit HR Round” to generate your scorecard.');
      send.disabled = true;
      input.disabled = true;
      done.disabled = false;
    }else{
      setTimeout(ask, 450);
    }
  }

  send.disabled = false;
  input.disabled = false;
  done.disabled = true;

  send.onclick = onSend;
  input.onkeydown = (e)=>{ if(e.key==='Enter'){ e.preventDefault(); onSend(); } };

  done.onclick = () => {
    const pct = maxTotal ? Math.round((total/maxTotal)*100) : 0;
    HS.recordAttempt({
      candidateId,
      stage:'hr',
      score: total,
      maxScore: maxTotal,
      details: { answers }
    });
    HS.toast(`HR submitted: ${total}/${maxTotal}`);
    renderHRSummary(answers, total, maxTotal);
    refreshCandidateScorecards(candidateId);
  };

  botSay('Welcome to HR Chat Simulator. Answer naturally (use STAR style).');
  ask();
}

function renderHRSummary(answers, total, maxTotal){
  const pct = Math.round((total/maxTotal)*100);
  HS.qs('#hrSummary').innerHTML = `
    <div class="summaryRow">
      <div><b>Total</b><div class="muted">${total}/${maxTotal} (${pct}%)</div></div>
      <div><b>Tip</b><div class="muted">${pct>=75?'Strong communication. Keep it crisp + impact-driven.':'Use STAR: Situation → Task → Action → Result.'}</div></div>
    </div>
  `;
  const list = HS.qs('#hrReview');
  list.innerHTML = '';
  answers.slice(0,6).forEach(a=>{
    const li = document.createElement('div');
    li.className = 'reviewItem ' + (a.score>=20?'good':a.score>=12?'mid':'bad');
    li.innerHTML = `
      <div class="reviewQ">${escapeHTML(a.question)}</div>
      <div class="reviewA muted">Score: <b>${a.score}/${a.max}</b></div>
      <div class="reviewA">${escapeHTML(a.answer.slice(0,160))}${a.answer.length>160?'…':''}</div>
    `;
    list.appendChild(li);
  });
}

function generatePlan(candidateId){
  const rs = HS.getLatestScore(candidateId,'resume');
  const ap = HS.getLatestScore(candidateId,'aptitude');
  const te = HS.getLatestScore(candidateId,'tech');
  const hr = HS.getLatestScore(candidateId,'hr');

  const items = [];

  const add = (title, why, steps) => items.push({title, why, steps});

  if(!rs || (rs.score/rs.max)<0.65){
    add('Fix Resume (30 min/day)',
        'Your resume is the entry ticket. Improve scan-ability + project impact.',
        [
          'Add a clear Skills section: Python, Git, SQL, Projects',
          'Write 2 projects with: problem → approach → result',
          'Keep bullets. Avoid paragraphs.'
        ]);
  } else {
    add('Resume polish (10 min/day)', 'Small tweaks keep it sharp.', ['Add metrics: time saved, accuracy, users, features', 'Ensure contact + links are correct.']);
  }

  if(!ap || (ap.score/ap.max)<0.7){
    add('Aptitude Daily Sprint (20 min)',
        'Speed + accuracy are decisive in mass hiring.',
        ['15 MCQs (timed 12 minutes)', 'Review 3 wrong questions and note the trick', 'Weekly: attempt one full mock.']);
  } else {
    add('Aptitude maintenance (10 min)', 'Keep momentum.', ['10 MCQs daily', 'One mock every Sunday.']);
  }

  if(!te || (te.score/te.max)<0.7){
    add('Coding drill (30 min)',
        'Technical rounds reward problem solving + clean code.',
        ['Practice arrays/strings daily', 'Write functions + test with 5 cases', 'Refactor: rename variables + edge cases.']);
  } else {
    add('Coding refinement (20 min)', 'Level up to interview-style problems.', ['Do 1 medium problem daily', 'Explain your approach aloud in 60 seconds.']);
  }

  if(!hr || (hr.score/hr.max)<0.7){
    add('HR answers with STAR (15 min)',
        'Good candidates fail HR due to unclear stories.',
        ['Prepare 5 stories: teamwork, conflict, failure, leadership, learning', 'For each: Situation-Task-Action-Result (4 lines)', 'Practice aloud with timer (90 seconds).']);
  } else {
    add('HR polish (10 min)', 'Keep answers impact-focused.', ['Short intro: who you are + 2 projects', 'Always end with learning + impact.']);
  }

  // Render
  const box = HS.qs('#planBox');
  box.innerHTML = items.map((it, i)=>`
    <div class="planItem">
      <div class="planTop">
        <div class="planIdx">Day ${i+1}</div>
        <div class="planTitle">${escapeHTML(it.title)}</div>
      </div>
      <div class="muted">${escapeHTML(it.why)}</div>
      <ul>${it.steps.map(s=>`<li>${escapeHTML(s)}</li>`).join('')}</ul>
    </div>
  `).join('');
  HS.toast('Improvement plan generated');
}

function initRecruiter(){
  const pipelineId = 'default';
  const p = HS.getOrCreatePipeline(pipelineId);

  // Render candidates list
  const all = HS.listCandidates();
  const sel = HS.qs('#candidateSelect');
  sel.innerHTML = '<option value="">Add candidate to pipeline…</option>' + all.map(c=>`<option value="${escapeHTML(c.id)}">${escapeHTML(c.name)} (${escapeHTML(c.goalRole||'')})</option>`).join('');

  sel.addEventListener('change', ()=>{
    const id = sel.value;
    if(!id) return;
    HS.ensureCandidateInPipeline(id, pipelineId);
    renderPipeline();
    sel.value = '';
    HS.toast('Added to pipeline');
  });

  HS.qs('#resetPipeline').addEventListener('click', ()=>{
    if(confirm('Reset pipeline columns only? (Attempts and candidates remain)')){
      const st = HS.loadState();
      st.pipelines[pipelineId] = {
        id:pipelineId,
        updatedAt:new Date().toISOString(),
        stages:{Applied:[], Aptitude:[], Tech:[], HR:[], Offer:[], Rejected:[]}
      };
      HS.saveState(st);
      renderPipeline();
      HS.toast('Pipeline reset');
    }
  });

  HS.qs('#exportJSON').addEventListener('click', ()=>{
    const st = HS.loadState();
    const blob = new Blob([JSON.stringify(st,null,2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'hiring-sim-export.json';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 500);
  });

  renderPipeline();
  renderRecruiterAnalytics();

  function renderPipeline(){
    const pipeline = HS.getOrCreatePipeline(pipelineId);
    const stages = Object.keys(pipeline.stages);
    const board = HS.qs('#pipelineBoard');
    board.innerHTML = '';

    for(const stage of stages){
      const col = document.createElement('div');
      col.className = 'col';
      col.dataset.stage = stage;
      col.innerHTML = `
        <div class="colHead">
          <div class="colTitle">${escapeHTML(stage)}</div>
          <div class="colCount">${pipeline.stages[stage].length}</div>
        </div>
        <div class="colBody" data-drop="${escapeHTML(stage)}"></div>
      `;
      board.appendChild(col);

      const body = col.querySelector('.colBody');
      body.addEventListener('dragover', (e)=>{ e.preventDefault(); body.classList.add('dragOver'); });
      body.addEventListener('dragleave', ()=> body.classList.remove('dragOver'));
      body.addEventListener('drop', (e)=>{
        e.preventDefault();
        body.classList.remove('dragOver');
        const cid = e.dataTransfer.getData('text/candidateId');
        const from = e.dataTransfer.getData('text/fromStage');
        if(!cid) return;
        HS.pipelineMove(cid, from, stage, pipelineId);
        renderPipeline();
        renderRecruiterAnalytics();
      });

      const ids = pipeline.stages[stage];
      for(const cid of ids){
        const c = HS.loadState().candidates[cid];
        if(!c) continue;
        const card = document.createElement('div');
        card.className = 'candCard';
        card.draggable = true;
        card.addEventListener('dragstart', (e)=>{
          e.dataTransfer.setData('text/candidateId', cid);
          e.dataTransfer.setData('text/fromStage', stage);
        });

        const rs = HS.getLatestScore(cid,'resume');
        const ap = HS.getLatestScore(cid,'aptitude');
        const te = HS.getLatestScore(cid,'tech');
        const hr = HS.getLatestScore(cid,'hr');

        card.innerHTML = `
          <div class="candTop">
            <div>
              <div class="candName">${escapeHTML(c.name)}</div>
              <div class="candSub">${escapeHTML(c.goalRole||'')}</div>
            </div>
            <a class="link" href="candidate.html?id=${encodeURIComponent(cid)}" title="Open Candidate">Open</a>
          </div>
          <div class="candScores">
            ${tinyScore('R', rs)}
            ${tinyScore('A', ap)}
            ${tinyScore('T', te)}
            ${tinyScore('H', hr)}
          </div>
          <div class="candActions">
            <button class="btn sm" data-act="select">Selected msg</button>
            <button class="btn sm ghost" data-act="reject">Rejected msg</button>
          </div>
        `;

        card.querySelectorAll('button').forEach(btn=>{
          btn.addEventListener('click', ()=>{
            const act = btn.dataset.act;
            const msg = act==='select' ? templateSelected(c) : templateRejected(c);
            navigator.clipboard?.writeText(msg);
            HS.toast('Message copied');
          });
        });

        body.appendChild(card);
      }
    }
  }
}

function tinyScore(label, s){
  if(!s) return `<span class="tiny muted">${label}:—</span>`;
  const pct = Math.round((s.score/s.max)*100);
  const cls = pct>=70?'good':pct>=45?'mid':'bad';
  return `<span class="tiny ${cls}">${label}:${pct}%</span>`;
}

function renderRecruiterAnalytics(){
  const st = HS.loadState();
  const attempts = st.attempts || [];
  const total = attempts.length;
  const byStage = attempts.reduce((acc,a)=>{ acc[a.stage]=(acc[a.stage]||0)+1; return acc; },{});

  HS.qs('#aTotal').textContent = total;
  HS.qs('#aResume').textContent = byStage.resume || 0;
  HS.qs('#aApt').textContent = byStage.aptitude || 0;
  HS.qs('#aTech').textContent = byStage.tech || 0;
  HS.qs('#aHR').textContent = byStage.hr || 0;

  // pass rates (simple thresholds)
  const pass = {
    resume: passRate(attempts.filter(a=>a.stage==='resume'), 65),
    aptitude: passRate(attempts.filter(a=>a.stage==='aptitude'), 70),
    tech: passRate(attempts.filter(a=>a.stage==='tech'), 70),
    hr: passRate(attempts.filter(a=>a.stage==='hr'), 70)
  };

  HS.qs('#pResume').textContent = pass.resume;
  HS.qs('#pApt').textContent = pass.aptitude;
  HS.qs('#pTech').textContent = pass.tech;
  HS.qs('#pHR').textContent = pass.hr;
}

function passRate(attempts, thresholdPct){
  if(!attempts.length) return '—';
  const passed = attempts.filter(a=> (a.maxScore? (a.score/a.maxScore*100):0) >= thresholdPct).length;
  return Math.round((passed/attempts.length)*100) + '%';
}

function templateSelected(c){
  const name = c.name || 'Candidate';
  return `Hi ${name},\n\nCongratulations! You have been shortlisted for the next round.\n\nNext steps:\n1) Confirm your availability\n2) Carry your ID proof\n3) Be ready to discuss your projects\n\nRegards,\nHiring Team`;
}

function templateRejected(c){
  const name = c.name || 'Candidate';
  return `Hi ${name},\n\nThank you for taking the time to interview with us. After careful review, we will not be moving forward at this time.\n\nPlease keep learning and applying — we wish you the best.\n\nRegards,\nHiring Team`;
}

function runFunctionTests(code, task){
  const fnName = task.fnName;
  const report = [];
  let passed = 0;
  let failed = 0;

  // Very small sandbox: user defines a function; we execute it in an isolated Function.
  // Note: static apps cannot fully sandbox JS execution. For classes, run locally.
  let userFn;
  try{
    const factory = new Function(`"use strict";\n${code}\nreturn (typeof ${fnName}==='function') ? ${fnName} : null;`);
    userFn = factory();
  }catch(e){
    return { passedAll:false, passed:0, failed:task.testcases.length, report:`Compile error: ${e.message}` };
  }
  if(typeof userFn !== 'function'){
    return { passedAll:false, passed:0, failed:task.testcases.length, report:`Could not find function '${fnName}'. Make sure you kept the function name.` };
  }

  for(let i=0;i<task.testcases.length;i++){
    const tc = task.testcases[i];
    try{
      const got = userFn(...tc.input);
      const ok = deepEqual(got, tc.expected);
      if(ok){
        passed++;
        report.push(`✓ Test ${i+1}: OK`);
      }else{
        failed++;
        report.push(`✗ Test ${i+1}: expected ${JSON.stringify(tc.expected)} but got ${JSON.stringify(got)}`);
      }
    }catch(e){
      failed++;
      report.push(`✗ Test ${i+1}: runtime error: ${e.message}`);
    }
  }

  return { passedAll: failed===0, passed, failed, report: report.join('\n') };
}

function deepEqual(a,b){
  return JSON.stringify(a)===JSON.stringify(b);
}

function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}

function pickOne(arr){
  return arr[Math.floor(Math.random()*arr.length)];
}

function fmtTime(sec){
  sec = Math.max(0, sec|0);
  const m = Math.floor(sec/60);
  const s = sec%60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function escapeHTML(str){
  return String(str||'')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}

// ---------------- Dashboard + Help ----------------

function initDashboard(){
  const st = HS.loadState();
  const candidates = Object.values(st.candidates||{});
  const attempts = st.attempts||[];

  // ---------------- Settings (Cutoffs) ----------------
  const SETTINGS_KEY = 'hiringSim.settings.v1';
  const defaultSettings = {
    cutoffResume: 55,
    cutoffAptitude: 60,
    cutoffTech: 60,
    cutoffHR: 55,
    negativeMarking: 0.25
  };

  function loadSettings(){
    try{
      const raw = localStorage.getItem(SETTINGS_KEY);
      if(!raw) return {...defaultSettings};
      const obj = JSON.parse(raw);
      return {...defaultSettings, ...obj};
    }catch(e){
      return {...defaultSettings};
    }
  }

  function saveSettings(obj){
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(obj));
  }

  let settings = loadSettings();

  // ---------------- KPI cards ----------------
  const dashKpis = HS.qs('#dashKpis');
  if(dashKpis){
    const stageCount = (attempts||[]).reduce((m,a)=>{ m[a.stage]=(m[a.stage]||0)+1; return m; }, {});
    dashKpis.innerHTML = '';
    const kpis = [
      { label:'Candidates', value:String(candidates.length), hint:'Profiles saved in this browser' },
      { label:'Attempts', value:String(attempts.length), hint:'Total round attempts recorded' },
      { label:'Most Attempted Round', value:(Object.entries(stageCount).sort((a,b)=>b[1]-a[1])[0]?.[0]||'—').toUpperCase(), hint:'Based on attempt counts' }
    ];
    for(const k of kpis){
      const box = document.createElement('div');
      box.className = 'kpi';
      box.innerHTML = `
        <div class="kpiLabel">${escapeHTML(k.label)}</div>
        <div class="kpiValue">${escapeHTML(k.value)}</div>
        <div class="kpiHint">${escapeHTML(k.hint)}</div>
      `;
      dashKpis.appendChild(box);
    }
  }

  // ---------------- Attempts table ----------------
  const tbody = HS.qs('#tblAttempts tbody');
  if(tbody){
    tbody.innerHTML = '';

    // One row per candidate (latest scores)
    const rows = candidates.map(c=>{
      const rs = HS.getLatestScore(c.id,'resume') || {score:0,max:100};
      const ap = HS.getLatestScore(c.id,'aptitude') || {score:0,max:100};
      const te = HS.getLatestScore(c.id,'tech') || {score:0,max:100};
      const hr = HS.getLatestScore(c.id,'hr') || {score:0,max:100};

      const passResume = rs.score >= settings.cutoffResume;
      const passApt = ap.score >= settings.cutoffAptitude;
      const passTech = te.score >= settings.cutoffTech;
      const passHR = hr.score >= settings.cutoffHR;

      const status = (passResume && passApt && passTech && passHR) ? 'Offer Ready' :
                     (passResume && (passApt || passTech || passHR)) ? 'In Progress' :
                     'Needs Work';

      const last = [rs,ap,te,hr].map(x=>x.when||'').filter(Boolean).sort().pop() || c.updatedAt || '';

      return { c, rs, ap, te, hr, status, last };
    }).sort((a,b)=> (b.last||'').localeCompare(a.last||''));

    for(const r of rows){
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="muted">${escapeHTML((r.last||'').slice(0,16).replace('T',' ')) || '—'}</td>
        <td>
          <div class="cellTitle">${escapeHTML(r.c.name)}</div>
          <div class="muted">${escapeHTML(r.c.goalRole||'')}</div>
        </td>
        <td>${scoreBadge(r.rs.score, settings.cutoffResume)}</td>
        <td>${scoreBadge(r.ap.score, settings.cutoffAptitude)}</td>
        <td>${scoreBadge(r.te.score, settings.cutoffTech)}</td>
        <td>${statusBadge(r.status)}</td>
      `;
      tbody.appendChild(tr);
    }
  }

  // ---------------- Pass rate cards ----------------
  const passRate = HS.qs('#passRate');
  if(passRate){
    const total = Math.max(1, candidates.length);
    const passed = {
      resume: candidates.filter(c => (HS.getLatestScore(c.id,'resume')?.score||0) >= settings.cutoffResume).length,
      aptitude: candidates.filter(c => (HS.getLatestScore(c.id,'aptitude')?.score||0) >= settings.cutoffAptitude).length,
      tech: candidates.filter(c => (HS.getLatestScore(c.id,'tech')?.score||0) >= settings.cutoffTech).length,
      hr: candidates.filter(c => (HS.getLatestScore(c.id,'hr')?.score||0) >= settings.cutoffHR).length,
    };
    passRate.innerHTML = '';
    const cards = [
      { label:'Resume', n:passed.resume, cutoff:settings.cutoffResume },
      { label:'Aptitude', n:passed.aptitude, cutoff:settings.cutoffAptitude },
      { label:'Tech', n:passed.tech, cutoff:settings.cutoffTech },
      { label:'HR', n:passed.hr, cutoff:settings.cutoffHR }
    ];
    for(const c of cards){
      const pct = Math.round((c.n/total)*100);
      const box = document.createElement('div');
      box.className = 'kpi';
      box.innerHTML = `
        <div class="kpiLabel">${escapeHTML(c.label)} (cutoff ${c.cutoff})</div>
        <div class="kpiValue">${pct}%</div>
        <div class="kpiHint">${c.n} of ${total} candidates pass</div>
      `;
      passRate.appendChild(box);
    }
  }

  // ---------------- Weak areas ----------------
  const weakAreas = HS.qs('#weakAreas');
  if(weakAreas){
    const avg = (stage) => {
      const vals = candidates.map(c=> HS.getLatestScore(c.id,stage)?.score).filter(v=>typeof v==='number');
      if(!vals.length) return 0;
      return Math.round(vals.reduce((a,b)=>a+b,0)/vals.length);
    };
    const aR = avg('resume');
    const aA = avg('aptitude');
    const aT = avg('tech');
    const aH = avg('hr');

    const tips = [];
    if(aR < settings.cutoffResume) tips.append ? None : None
    tips.push(...(
      (aR < settings.cutoffResume) ? [
        { title:'Resume clarity is low', body:'Ask students to add measurable outcomes (numbers) and 2–3 strong projects. Encourage keyword alignment with the target role.' }
      ] : []
    ));
    tips.push(...(
      (aA < settings.cutoffAptitude) ? [
        { title:'Aptitude accuracy needs work', body:'Do 15-minute daily timed practice. Teach elimination, and focus on quant basics (ratios, averages, time-work) + logic patterns.' }
      ] : []
    ));
    tips.push(...(
      (aT < settings.cutoffTech) ? [
        { title:'Coding tests failing', body:'Start with 3 patterns: loops, arrays, strings. Make students write functions + run against 5 testcases each. Add edge cases.' }
      ] : []
    ));
    tips.push(...(
      (aH < settings.cutoffHR) ? [
        { title:'HR answers are weak', body:'Train STAR format. Ask for one real example per answer. Practice concise 6–8 line responses with one learning point.' }
      ] : []
    ));

    if(tips.length===0){
      tips.push({ title:'Nice!', body:'Your current data shows candidates are meeting cutoffs. Increase cutoffs to simulate tougher companies.' });
    }

    weakAreas.innerHTML = '';
    for(const t of tips.slice(0,6)){
      const box = document.createElement('div');
      box.className = 'note';
      box.innerHTML = `<div class="noteTitle">${escapeHTML(t.title)}</div><div class="muted">${escapeHTML(t.body)}</div>`;
      weakAreas.appendChild(box);
    }
  }

  // ---------------- Settings form UI ----------------
  const form = HS.qs('#settingsForm');
  if(form){
    form.innerHTML = `
      <label class="field">
        <span>Resume cutoff (0–100)</span>
        <input type="number" min="0" max="100" step="1" name="cutoffResume" value="${settings.cutoffResume}">
      </label>
      <label class="field">
        <span>Aptitude cutoff (0–100)</span>
        <input type="number" min="0" max="100" step="1" name="cutoffAptitude" value="${settings.cutoffAptitude}">
      </label>
      <label class="field">
        <span>Tech cutoff (0–100)</span>
        <input type="number" min="0" max="100" step="1" name="cutoffTech" value="${settings.cutoffTech}">
      </label>
      <label class="field">
        <span>HR cutoff (0–100)</span>
        <input type="number" min="0" max="100" step="1" name="cutoffHR" value="${settings.cutoffHR}">
      </label>
      <label class="field">
        <span>Negative marking (0–1)</span>
        <input type="number" min="0" max="1" step="0.05" name="negativeMarking" value="${settings.negativeMarking}">
      </label>
    `;

    HS.qs('#btnSaveSettings')?.addEventListener('click', () => {
      const fd = new FormData(form);
      const next = {
        cutoffResume: clampNum(fd.get('cutoffResume'), 0, 100, settings.cutoffResume),
        cutoffAptitude: clampNum(fd.get('cutoffAptitude'), 0, 100, settings.cutoffAptitude),
        cutoffTech: clampNum(fd.get('cutoffTech'), 0, 100, settings.cutoffTech),
        cutoffHR: clampNum(fd.get('cutoffHR'), 0, 100, settings.cutoffHR),
        negativeMarking: clampNum(fd.get('negativeMarking'), 0, 1, settings.negativeMarking)
      };
      saveSettings(next);
      settings = next;
      const saved = HS.qs('#settingsSaved');
      if(saved) saved.textContent = 'Saved! Refreshing dashboard...';
      setTimeout(()=> location.reload(), 450);
    });
  }

  // ---------------- Export + Reset ----------------
  HS.qs('#btnExport')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(st, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `hiring-sim-export-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    setTimeout(()=> URL.revokeObjectURL(a.href), 1000);
  });

  HS.qs('#btnWipe')?.addEventListener('click', () => {
    if(confirm('This will clear all saved progress for this simulator in your browser. Continue?')){
      HS.resetAll();
      location.href = 'index.html';
    }
  });
}

function clampNum(val, min, max, fallback){
  const n = Number(val);
  if(Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function scoreBadge(score, cutoff){
  const ok = score >= cutoff;
  return `<span class="pill ${ok ? 'ok' : 'warn'}">${score}</span>`;
}

function statusBadge(status){
  const cls = status === 'Offer Ready' ? 'ok' : status === 'In Progress' ? 'brand' : 'warn';
  return `<span class="pill ${cls}">${escapeHTML(status)}</span>`;
}


function initHelp(){
function initHelp(){
  // Add copy buttons for snippets
  HS.qsa('[data-copy]').forEach(btn=>{
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-copy');
      const el = document.getElementById(id);
      if(!el) return;
      const text = el.textContent;
      try{
        await navigator.clipboard.writeText(text);
        HS.toast('Copied!', 'ok');
      }catch{
        HS.toast('Copy failed (browser blocked).', 'danger');
      }
    });
  });
}
