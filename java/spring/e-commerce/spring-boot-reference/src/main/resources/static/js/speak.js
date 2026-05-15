
(function(){
  "use strict";
  function speakText(text){
    if(!("speechSynthesis" in window)){
      alert("Speech synthesis is not supported in this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    u.pitch = 1;
    u.volume = 1;
    window.speechSynthesis.speak(u);
  }

  document.addEventListener("DOMContentLoaded",function(){
    document.querySelectorAll(".speak-block").forEach((block, index)=>{
      const btn = document.createElement("button");
      btn.className = "btn";
      btn.type = "button";
      btn.textContent = "Speak this section";
      btn.style.marginTop = "10px";
      btn.addEventListener("click",()=>speakText(block.innerText));
      block.appendChild(btn);
    });

    const stop = document.createElement("button");
    stop.type = "button";
    stop.textContent = "Stop Speaking";
    stop.className = "btn";
    stop.style.position = "fixed";
    stop.style.left = "18px";
    stop.style.bottom = "18px";
    stop.style.zIndex = "99";
    stop.addEventListener("click",()=>window.speechSynthesis && window.speechSynthesis.cancel());
    document.body.appendChild(stop);
  });
})();
