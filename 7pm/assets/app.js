/* Programmer’s Picnic — Lesson Pack JS (copy buttons + progress) */
(function(){
  "use strict";
  function byId(id){return document.getElementById(id);}
  function qs(sel,root=document){return root.querySelector(sel);}
  function qsa(sel,root=document){return [...root.querySelectorAll(sel)];}

  // Copy buttons
  qsa("[data-copy]").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const target = byId(btn.getAttribute("data-copy"));
      if(!target) return;
      const text = target.innerText;
      try{
        await navigator.clipboard.writeText(text);
        const old = btn.textContent;
        btn.textContent = "Copied ✅";
        setTimeout(()=>btn.textContent = old, 900);
      }catch(e){
        alert("Copy failed. Try selecting text manually.");
      }
    });
  });

  // Simple progress tracker per day
  const day = document.documentElement.getAttribute("data-day");
  if(day){
    const key = "pp_py28_progress_v1";
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    const done = !!state[day];
    const markBtn = qs("#markDone");
    const status = qs("#doneStatus");
    function render(){
      if(!markBtn || !status) return;
      status.textContent = state[day] ? "Marked as Done ✅" : "Not marked yet";
      markBtn.textContent = state[day] ? "Unmark" : "Mark Done";
    }
    if(markBtn){
      markBtn.addEventListener("click", ()=>{
        state[day] = !state[day];
        localStorage.setItem(key, JSON.stringify(state));
        render();
      });
      render();
    }
  }
})();
