
(function(){
  "use strict";
  const topBtn = document.createElement("button");
  topBtn.textContent = "↑ Top";
  topBtn.setAttribute("aria-label","Back to top");
  Object.assign(topBtn.style,{
    position:"fixed",right:"18px",bottom:"18px",zIndex:"99",
    border:"0",borderRadius:"999px",padding:"10px 14px",
    background:"#f97316",color:"white",fontWeight:"900",
    boxShadow:"0 12px 30px rgba(124,45,18,.22)",cursor:"pointer"
  });
  topBtn.addEventListener("click",()=>window.scrollTo({top:0,behavior:"smooth"}));
  document.addEventListener("DOMContentLoaded",()=>document.body.appendChild(topBtn));
})();
