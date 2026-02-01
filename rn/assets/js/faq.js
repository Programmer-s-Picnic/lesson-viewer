
(function(){
  "use strict";
  function init(){
    document.querySelectorAll("[data-faq]").forEach((btn)=>{
      btn.addEventListener("click", ()=>{
        const expanded = btn.getAttribute("aria-expanded")==="true";
        btn.setAttribute("aria-expanded", String(!expanded));
        const ans = btn.parentElement.querySelector(".faq__a");
        if(ans) ans.hidden = expanded;
      });
    });
  }
  window.PP_FAQ = { init };
})();
