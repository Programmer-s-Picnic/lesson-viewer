(function(){
  "use strict";

  const esc = (s)=>String(s??"")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");

  function fmtDate(d){
    try{
      const dt = new Date(d);
      if(String(dt) === "Invalid Date") return String(d||"");
      return dt.toLocaleDateString(undefined, { year:"numeric", month:"short", day:"numeric" });
    }catch(e){ return String(d||""); }
  }

  function parseQuery(){
    const sp = new URLSearchParams(location.search);
    return { q:(sp.get("q")||"").trim(), tag:(sp.get("tag")||"").trim() };
  }

  function buildCard(b, assetBase){
    const base = (assetBase === "..") ? "../" : "./";
    const href = base + (b.href || "pages/blogs.html");
    const tags = (b.tags||[]).slice(0,4).map(t =>
      `<span class="badge" style="background:rgba(217,119,6,.10);border-color:rgba(217,119,6,.18)">${esc(t)}</span>`
    ).join(" ");
    return `
      <a class="cardChoice" href="${href}" style="min-height:auto">
        <div class="cardChoice__icon" aria-hidden="true">📝</div>
        <div class="cardChoice__title">${esc(b.title||"")}</div>
        <div class="muted small">${esc(fmtDate(b.date))}</div>
        <div class="cardChoice__text">${esc(b.excerpt||"")}</div>
        <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">${tags}</div>
        <div class="cardChoice__more">Read →</div>
      </a>
    `;
  }

  function sortByDateDesc(items){
    return [...items].sort((a,b)=>{
      const da = Date.parse(a.date||"") || 0;
      const db = Date.parse(b.date||"") || 0;
      return db - da;
    });
  }

  function relatedPosts(all, currentPageId){
    const cur = all.find(x => x.page_id === currentPageId);
    if(!cur) return sortByDateDesc(all).filter(x=>x.page_id!==currentPageId);
    const curTags = new Set(cur.tags || []);
    const scored = all
      .filter(x => x.page_id !== currentPageId)
      .map(x=>{
        let s=0;
        (x.tags||[]).forEach(t=>{ if(curTags.has(t)) s++; });
        return {x, s, d: Date.parse(x.date||"") || 0};
      })
      .sort((a,b)=> (b.s - a.s) || (b.d - a.d))
      .map(o=>o.x);
    return scored;
  }

  function uniqueTags(items){
    const set = new Set();
    items.forEach(b => (b.tags||[]).forEach(t => set.add(String(t))));
    return Array.from(set).sort((a,b)=>a.localeCompare(b));
  }

  function initOne(root){
    const mode = root.getAttribute("data-mode") || "latest"; // latest | all | related
    const limit = Number(root.getAttribute("data-limit") || "6");
    const assetBase = root.getAttribute("data-asset-base") || ".";
    const current = root.getAttribute("data-current") || "";

    const blogs = (window.__PP_BLOGS__?.items || []).filter(Boolean);
    const allSorted = sortByDateDesc(blogs);

    const tagsBox = root.querySelector("[data-blogs-tags]");
    const qInput = root.querySelector("[data-blogs-q]");
    const list = root.querySelector("[data-blogs-list]");

    let state = { q:"", tag:"" };

    const hasControls = !!(tagsBox || qInput);
    if(hasControls && mode === "all"){
      const q = parseQuery();
      state.q = q.q;
      state.tag = q.tag;
      if(qInput) qInput.value = state.q;
    }

    function applyFilter(items){
      let out = items;
      if(state.tag){
        out = out.filter(b => (b.tags||[]).includes(state.tag));
      }
      if(state.q){
        const qq = state.q.toLowerCase();
        out = out.filter(b =>
          String(b.title||"").toLowerCase().includes(qq) ||
          String(b.excerpt||"").toLowerCase().includes(qq) ||
          (b.tags||[]).some(t => String(t).toLowerCase().includes(qq))
        );
      }
      return out;
    }

    function setActiveTagUI(){
      if(!tagsBox) return;
      tagsBox.querySelectorAll("[data-tag]").forEach(btn=>{
        const t = btn.getAttribute("data-tag") || "";
        btn.classList.toggle("is-on", t === state.tag);
      });
    }

    function render(){
      let items = allSorted;
      if(mode === "related"){
        items = relatedPosts(allSorted, current);
      } else if(mode === "latest"){
        items = allSorted;
      } else {
        items = applyFilter(allSorted);
      }

      const finalItems = items.slice(0, limit);
      list.innerHTML = finalItems.map(b => buildCard(b, assetBase)).join("");
      if(finalItems.length === 0){
        list.innerHTML = `<div class="cardSoft"><div class="cardSoft__title">No matching blogs</div><div class="cardSoft__text">Try removing filters or searching a different keyword.</div></div>`;
      }
      setActiveTagUI();
    }

    if(tagsBox && mode === "all"){
      const tags = uniqueTags(allSorted);
      tagsBox.innerHTML = [
        `<button type="button" class="choiceBtn ${state.tag===""?"is-on":""}" data-tag="">All</button>`,
        ...tags.map(t => `<button type="button" class="choiceBtn" data-tag="${esc(t)}">${esc(t)}</button>`)
      ].join("");
      tagsBox.querySelectorAll("[data-tag]").forEach(btn=>{
        btn.addEventListener("click", ()=>{
          state.tag = btn.getAttribute("data-tag") || "";
          render();
        });
      });
    }

    if(qInput && mode === "all"){
      qInput.addEventListener("input", ()=>{
        state.q = qInput.value.trim();
        render();
      });
    }

    render();
  }

  function init(){
    document.querySelectorAll("[data-blogs-root]").forEach(initOne);
  }

  window.PP_BLOGS_UI = { init };
})();