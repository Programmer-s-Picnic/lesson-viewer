(function(){
  "use strict";

  const LS_KEY = "mindora_guided_start_v1";
  const $ = (id)=>document.getElementById(id);

  function loadJSON(url){
    return fetch(url, { cache: "no-store" }).then(r=>{
      if(!r.ok) throw new Error("Failed to load " + url);
      return r.json();
    });
  }

  function saveLast(payload){
    try{
      localStorage.setItem(LS_KEY, JSON.stringify(payload));
    }catch(e){}
  }
  function loadLast(){
    try{
      return JSON.parse(localStorage.getItem(LS_KEY)||"null");
    }catch(e){ return null; }
  }

  function toast(msg){
    const t = $("ppToast");
    if(!t) return;
    t.textContent = msg;
    t.classList.add("is-on");
    clearTimeout(toast._t);
    toast._t = setTimeout(()=>t.classList.remove("is-on"), 1800);
  }

  function openBackdrop(){
    const bd = $("ppGuidedBackdrop");
    if(!bd) return;
    bd.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }
  function closeBackdrop(){
    const bd = $("ppGuidedBackdrop");
    if(!bd) return;
    bd.classList.remove("is-open");
    document.body.style.overflow = "";
  }

  function buildWA(site, selections, recText){
    const labelBy = (stepId, optId)=>{
      const s = selections._labels?.[stepId]?.[optId];
      return s || optId;
    };
    const lines = [
      "Hi,",
      "",
      "I used the Guided Start and selected:",
      "",
      `• Concern: ${labelBy("concern", selections.concern)}`,
      `• Intensity: ${labelBy("intensity", selections.intensity)}`,
      `• Preference: ${labelBy("preference", selections.preference)}`,
      "",
      `Recommendation: ${recText}`,
      "",
      "Preferred mode: (Online/In-clinic).",
      "Thank you."
    ].join("\n");
    const msg = window.PP_WA.buildMessage(site, "Guided Start", lines);
    return window.PP_WA.link(site, msg);
  }

  function initUI(site, cfg, assetBase){
    const bd = $("ppGuidedBackdrop");
    const title = $("ppGuidedTitle");
    const body = $("ppGuidedBody");
    const closeBtn = $("ppGuidedClose");
    const backBtn = $("ppGuidedBack");
    const nextBtn = $("ppGuidedNext");
    const shareBtn = $("ppGuidedShare");
    const saveBtn = $("ppGuidedSave");
    const resetBtn = $("ppGuidedReset");
    const prog = $("ppGuidedProg");

    if(!bd || !title || !body) return;

    const steps = cfg.steps || [];
    const recMap = cfg.recommendations || {};
    const selections = { concern:null, intensity:null, preference:null, _labels:{} };
    steps.forEach(st=>{
      selections._labels[st.id] = {};
      (st.options||[]).forEach(o=> selections._labels[st.id][o.id] = o.label);
    });

    let idx = 0;

    function getRecText(){
      const pref = selections.preference || "talk";
      const inten = selections.intensity || "medium";
      return (recMap[pref] && recMap[pref][inten]) ? recMap[pref][inten] : "Starting with a gentle conversation can help.";
    }

    function canNext(){
      const st = steps[idx];
      return !!selections[st.id];
    }

    function renderProg(){
      prog.innerHTML = `Step ${idx+1} / ${steps.length}`;
      backBtn.disabled = idx === 0;
      nextBtn.disabled = !canNext() && idx < steps.length-1;
      nextBtn.textContent = (idx === steps.length-1) ? "See result" : "Next →";
    }

    function renderStep(){
      const st = steps[idx];
      title.textContent = cfg.title || "Guided Start";
      renderProg();

      const chips = steps.map((s, i)=>{
        const on = (i===idx) ? " is-on" : "";
        const done = selections[s.id] ? " is-on" : "";
        return `<div class="gsChip${on||done}">${i+1}. ${s.id}</div>`;
      }).join("");

      const opts = (st.options||[]).map(o=>{
        const on = selections[st.id]===o.id ? " is-on" : "";
        return `<button class="gsOpt${on}" type="button" data-opt="${o.id}">
          <div class="gsIcon" aria-hidden="true">${o.icon||"•"}</div>
          <div><div class="gsLabel">${o.label||""}</div><div class="gsSmall">Tap to select</div></div>
        </button>`;
      }).join("");

      body.innerHTML = `
        <div class="gsHead">
          <div>
            <div class="gsKicker">🧭 Guided Start</div>
            <div class="muted small" style="margin-top:6px">${cfg.subtitle||""}</div>
          </div>
          <div class="muted small" style="max-width:320px">${cfg.disclaimer||""}</div>
        </div>
        <div class="gsSteps">${chips}</div>
        <hr class="hr"/>
        <div class="h3" style="margin:0 0 8px">${st.title||""}</div>
        <div class="gsGrid">${opts}</div>
      `;

      body.querySelectorAll("[data-opt]").forEach(btn=>{
        btn.addEventListener("click", ()=>{
          selections[st.id] = btn.getAttribute("data-opt");
          body.querySelectorAll("[data-opt]").forEach(x=>x.classList.remove("is-on"));
          btn.classList.add("is-on");
          renderProg();
          if(idx < steps.length-1) nextBtn.disabled = false;
        });
      });

      // hide result controls
      shareBtn.style.display = "none";
      saveBtn.style.display = "none";
      resetBtn.style.display = "none";
    }

    function renderResult(){
      const recText = getRecText();
      const label = (sid)=> selections._labels?.[sid]?.[selections[sid]] || selections[sid] || "-";

      body.innerHTML = `
        <div class="gsHead">
          <div>
            <div class="gsKicker">✅ Your next step</div>
            <div class="muted small" style="margin-top:6px">No scores. No judgement. Just a gentle direction.</div>
          </div>
          <div class="muted small" style="max-width:320px">${cfg.disclaimer||""}</div>
        </div>
        <div class="gsResult" style="margin-top:12px">
          <div class="gsResultTitle">Recommendation</div>
          <div class="gsResultText">${recText}</div>
        </div>
        <div class="cardSoft" style="margin-top:12px;background:rgba(255,255,255,.94)">
          <div class="cardSoft__title">Your selections</div>
          <div class="cardSoft__text">
            • Concern: <b>${label("concern")}</b><br/>
            • Intensity: <b>${label("intensity")}</b><br/>
            • Preference: <b>${label("preference")}</b>
          </div>
          <div class="muted small" style="margin-top:10px">Tip: You can edit your choices with Back.</div>
        </div>
      `;

      shareBtn.style.display = "";
      saveBtn.style.display = "";
      resetBtn.style.display = "";
      nextBtn.disabled = true;
      nextBtn.textContent = "Done";

      shareBtn.onclick = ()=>{
        const url = buildWA(site, selections, recText);
        window.open(url, "_blank", "noopener");
      };

      saveBtn.onclick = ()=>{
        const payload = {
          at: new Date().toISOString(),
          selections: { concern: selections.concern, intensity: selections.intensity, preference: selections.preference },
          recommendation: recText
        };
        saveLast(payload);
        toast("Saved ✔");
      };

      resetBtn.onclick = ()=>{
        selections.concern = selections.intensity = selections.preference = null;
        idx = 0;
        renderStep();
        toast("Reset ✔");
      };
    }

    backBtn.onclick = ()=>{
      if(idx === steps.length) { idx = steps.length-1; renderStep(); return; }
      if(idx>0){ idx--; renderStep(); }
    };
    nextBtn.onclick = ()=>{
      if(idx < steps.length-1){
        if(!canNext()) return;
        idx++;
        renderStep();
      }else{
        // last step -> result
        if(!canNext()) return;
        idx = steps.length; // special
        renderResult();
      }
    };

    closeBtn.onclick = closeBackdrop;
    bd.addEventListener("click", (e)=>{ if(e.target===bd) closeBackdrop(); });

    // open triggers
    document.querySelectorAll("[data-guided-open]").forEach(el=>{
      el.addEventListener("click", (e)=>{
        e.preventDefault();
        // preload last
        const last = loadLast();
        if(last?.selections){
          selections.concern = last.selections.concern || null;
          selections.intensity = last.selections.intensity || null;
          selections.preference = last.selections.preference || null;
        }
        idx = 0;
        renderStep();
        openBackdrop();
      });
    });

    // initial render so buttons are wired
    renderStep();
  }

  async function init(){
    try{
      const assetBase = window.ASSET_BASE || ".";
      const rel = (p)=> `${assetBase}/${p}`.replace(/\/\.\//g,"/");
      const site = window.__PP_SITE__ || null;
      const cfg = await loadJSON(rel("data/guided-start.json"));
      if(!site){
        // site may not be ready yet; wait a tick
        setTimeout(()=>initUI(window.__PP_SITE__||{}, cfg, assetBase), 0);
      }else{
        initUI(site, cfg, assetBase);
      }
    }catch(err){
      console.warn("Guided Start init failed:", err);
    }
  }

  window.PP_GUIDED = { init };
})();
