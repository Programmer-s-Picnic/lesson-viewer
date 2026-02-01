
(function(){
  "use strict";
  const LS_KEY = "curesia_assessments_v1";
  function loadStore(){ try{ return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); }catch(e){ return {}; } }
  function saveStore(obj){ localStorage.setItem(LS_KEY, JSON.stringify(obj)); }
  function toast(msg){
    const t = document.getElementById("ppToast");
    if(!t) return;
    t.textContent = msg;
    t.classList.add("is-on");
    clearTimeout(toast._t);
    toast._t = setTimeout(()=>t.classList.remove("is-on"), 1800);
  }
  function openModal(tool, site){
    const bd = document.getElementById("ppModalBackdrop");
    const title = document.getElementById("ppModalTitle");
    const body = document.getElementById("ppModalBody");
    const scoreBox = document.getElementById("ppScoreBox");
    const saveBtn = document.getElementById("ppSaveBtn");
    const shareBtn = document.getElementById("ppShareBtn");
    if(!bd || !title || !body) return;

    const answers = new Array(tool.questions.length).fill(null);
    const scale = tool.scale || [{"label":"0","value":0},{"label":"1","value":1},{"label":"2","value":2},{"label":"3","value":3},{"label":"4","value":4}];

    function calc(){
      let s=0,c=0;
      answers.forEach(v=>{ if(typeof v==="number"){ s+=v; c++; }});
      return {score:s, answered:c, total:tool.questions.length};
    }
    function renderScore(){
      const {score, answered, total} = calc();
      scoreBox.textContent = `Score: ${score} (answered ${answered}/${total})`;
      shareBtn.disabled = answered === 0;
      saveBtn.disabled = answered === 0;
      return score;
    }

    title.textContent = tool.title;
    body.innerHTML = tool.questions.map((q, qi)=>{
      const choices = scale.map(opt=>`<button class="choiceBtn" type="button" data-q="${qi}" data-v="${opt.value}">${opt.label}</button>`).join("");
      return `<div class="qRow"><div class="qTitle">${qi+1}. ${q}</div><div class="choiceGrid">${choices}</div><div class="muted small">${tool.scale_hint || "0 = not at all, 4 = very often"}</div></div>`;
    }).join("");

    body.querySelectorAll(".choiceBtn").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const qi = Number(btn.getAttribute("data-q"));
        const v = Number(btn.getAttribute("data-v"));
        answers[qi] = v;
        btn.parentElement.querySelectorAll(".choiceBtn").forEach(b=>b.classList.remove("is-on"));
        btn.classList.add("is-on");
        renderScore();
      });
    });

    function close(){
      bd.classList.remove("is-open");
      document.body.style.overflow = "";
    }
    document.getElementById("ppModalClose").onclick = close;
    bd.onclick = (e)=>{ if(e.target===bd) close(); };

    saveBtn.onclick = ()=>{
      const store = loadStore();
      const now = new Date().toISOString();
      const score = renderScore();
      store[tool.id] = { toolId: tool.id, title: tool.title, score, answers, at: now };
      saveStore(store);
      toast("Saved ✔");
    };

    shareBtn.onclick = ()=>{
      const score = renderScore();
      const extra = `Self-assessment: ${tool.title}\nScore: ${score}\nNote: This is a screening tool, not a diagnosis.`;
      const msg = window.PP_WA.buildMessage(site, `Assessment: ${tool.title}`, extra);
      window.open(window.PP_WA.link(site, msg), "_blank", "noopener");
    };

    renderScore();
    bd.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function wire(site, tools){
    document.querySelectorAll("[data-assess-open]").forEach(btn=>{
      const id = btn.getAttribute("data-assess-open");
      const tool = tools.find(t=>t.id===id);
      if(!tool) return;
      btn.addEventListener("click", ()=>openModal(tool, site));
    });
  }

  window.PP_ASSESS = { wire };
})();
