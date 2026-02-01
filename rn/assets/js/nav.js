
(function(){
  "use strict";
  function init(){
    const toggle = document.getElementById("navToggle");
    const menu = document.getElementById("navMenu");
    if(!toggle || !menu) return;
    toggle.addEventListener("click", ()=>{
      const open = menu.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("click", (e)=>{
      if(!menu.classList.contains("is-open")) return;
      const within = menu.contains(e.target) || toggle.contains(e.target);
      if(!within){
        menu.classList.remove("is-open");
        toggle.setAttribute("aria-expanded","false");
      }
    });
  }
  window.PP_NAV = { init };
})();
