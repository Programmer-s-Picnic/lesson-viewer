
(function(){
  "use strict";
  const enc = (s)=>encodeURIComponent(String(s||"").trim());
  function buildMessage(site, context, extra){
    const ctx = context ? `Context: ${context}\n` : "";
    const page = document.title || "Curesia";
    const url = location.href;
    const base = site?.cta?.default_message || "Hi, I want to book a session.";
    const plus = extra ? `\n\n${extra}` : "";
    return `${ctx}Page: ${page}\nURL: ${url}\n\n${base}${plus}`;
  }
  function link(site, msg){
    const n = site?.contact?.whatsapp_e164 || "";
    return `https://wa.me/${n}?text=${enc(msg)}`;
  }
  function wireAll(site){
    document.querySelectorAll("[data-wa]").forEach((a)=>{
      const ctx = a.getAttribute("data-wa-context") || "";
      const extra = a.getAttribute("data-wa-extra") || "";
      const msg = buildMessage(site, ctx, extra);
      a.setAttribute("href", link(site, msg));
      a.setAttribute("target","_blank");
      a.setAttribute("rel","noopener");
    });
  }
  window.PP_WA = { wireAll, buildMessage, link };
})();
