(function(){
  "use strict";
  const phone = document.documentElement.getAttribute("data-phone") || "";
  const msg = encodeURIComponent("YES — I want to join Programmer’s Picnic Python Basics (7 PM). Please share details.");
  const wa = document.getElementById("waBtn");
  if(wa && phone){
    wa.href = "https://wa.me/91"+phone+"?text="+msg;
  }
  // poster downloads
  document.querySelectorAll("[data-dl]").forEach(a=>{
    a.addEventListener("click", ()=>{
      // normal download attr will work
    });
  });
})();
