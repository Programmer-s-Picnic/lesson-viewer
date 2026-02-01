
(async function(){
  "use strict";
  const app = document.getElementById("app");
  const PAGE_ID = window.PAGE_ID || "home";
  const ASSET_BASE = window.ASSET_BASE || ".";
  const rel = (p)=> `${ASSET_BASE}/${p}`.replace(/\/\.\//g,"/");

  async function loadJSON(path){
    const res = await fetch(path, { cache: "no-store" });
    if(!res.ok) throw new Error(`Failed to load ${path} (${res.status})`);
    return await res.json();
  }

  function setMeta(page){
    if(page?.title) document.title = page.title;
    const d = document.querySelector('meta[name="description"]');
    if(d && page?.description) d.setAttribute("content", page.description);
    const ogt = document.querySelector('meta[property="og:title"]');
    if(ogt && page?.title) ogt.setAttribute("content", page.title);
    const ogd = document.querySelector('meta[property="og:description"]');
    if(ogd && page?.description) ogd.setAttribute("content", page.description);
    const canon = document.querySelector('link[rel="canonical"]');
    if(canon) canon.setAttribute("href", location.href);
  }

  try{
    const site = await loadJSON(rel("data/site.json"));
    window.__PP_SITE__ = site;
    const page = await loadJSON(rel(`data/pages/${PAGE_ID}.json`));
    const testimonials = await loadJSON(rel("data/testimonials.json"));
    const blogs = await loadJSON(rel("data/blogs.json"));
    const assessments = await loadJSON(rel("data/assessments.json"));

    setMeta(page);

    window.__PP_BLOGS__ = blogs;
    app.innerHTML = window.PP_RENDER.page({site,page,testimonials,pageId:PAGE_ID,assetBase:ASSET_BASE});

    window.PP_WA.wireAll(site);
    window.PP_FAQ && window.PP_FAQ.init();
    window.PP_NAV && window.PP_NAV.init();
    window.PP_ASSESS && window.PP_ASSESS.wire(site, assessments.tools || []);
    window.PP_BLOGS_UI && window.PP_BLOGS_UI.init();
    window.PP_GUIDED && window.PP_GUIDED.init();

    const y = document.getElementById("year");
    if(y) y.textContent = String(new Date().getFullYear());

    const schema = {
      "@context":"https://schema.org",
      "@type":"MedicalClinic",
      "name": site?.brand?.name || "Curesia",
      "description": page?.description || "",
      "email": site?.contact?.email || "",
      "telephone": "+91-" + (site?.contact?.whatsapp_display || ""),
      "address":{
        "@type":"PostalAddress",
        "streetAddress": site?.contact?.address || "",
        "addressLocality": site?.contact?.city || "Ranchi",
        "addressRegion": site?.contact?.region || "Jharkhand",
        "addressCountry": site?.contact?.country || "IN"
      }
    };
    const sTag = document.getElementById("ppSchema");
    if(sTag) sTag.textContent = JSON.stringify(schema, null, 2);

  }catch(err){
    console.error(err);
    app.innerHTML = `<div class="container" style="padding:60px 0">
      <div class="cardSoft">
        <div class="cardSoft__title">Site load error</div>
        <div class="cardSoft__text">Open with VS Code Live Server or host on GitHub Pages (fetch needs HTTP).</div>
        <hr class="hr" />
        <pre style="white-space:pre-wrap;margin:0;color:var(--muted)">${String(err)}</pre>
      </div></div>`;
  }
})();
