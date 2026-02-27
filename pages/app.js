/* global SpeechRecognition, webkitSpeechRecognition */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const CFG_KEY = "pp_lwc_feed_cfg_v3";
  const CACHE_KEY = "pp_lwc_feed_cache_v3";
  const FEAT_CACHE_KEY = "pp_lwc_featured_cache_v1";

  const DEFAULT_CFG = {
    base: "https://www.learnwithchampak.live",
    mode: "default", // default or summary
    maxResults: 50, // 1..150
    autoCrawl: true,
    maxTotalItems: 800,
    maxAutoPages: 40,
    crawlDelayMs: 450,

    featuredLabels: ["featured", "pp-featured", "star", "recommended"],
    featuredLimit: 9,
  };

  const state = {
    cfg: loadCfg(),
    startIndex: 1,
    items: [],
    featuredItems: [], // ✅ dedicated Featured list (fixes mobile)
    labels: new Map(),
    q: "",
    sort: "new",
    activeLabels: new Set(),
    suggest: { items: [], idx: -1, t: null },
    crawl: { running: false, stop: false, pages: 0 },
    loading: false,
  };

  $("#y").textContent = new Date().getFullYear();

  // WhatsApp CTA
  const WA_NUMBER = "919335874326";
  const WA_TEXT = encodeURIComponent(
    "Hi Champak Roy! I found you via Programmer’s Picnic. I need help with coaching/projects/interviews."
  );
  const WA_LINK = `https://wa.me/${WA_NUMBER}?text=${WA_TEXT}`;
  $("#btnWhatsApp").href = WA_LINK;
  $("#btnWhatsApp2").href = WA_LINK;

  // ------------------------- JSONP loader -------------------------
  function jsonp(url, cbName) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = url;
      s.async = true;

      const timer = setTimeout(() => {
        cleanup();
        reject(new Error("JSONP timeout"));
      }, 12000);

      function cleanup() {
        clearTimeout(timer);
        s.remove();
        try {
          delete window[cbName];
        } catch {}
      }

      window[cbName] = (data) => {
        cleanup();
        resolve(data);
      };

      s.onerror = () => {
        cleanup();
        reject(new Error("JSONP load failed"));
      };

      document.head.appendChild(s);
    });
  }

  function buildFeedUrl({ startIndex }) {
    const cfg = state.cfg;
    const base = cfg.base.replace(/\/$/, "");
    const kind = cfg.mode === "summary" ? "summary" : "default";
    const endpoint = `${base}/feeds/posts/${kind}`;
    const max = clampInt(cfg.maxResults, 1, 150);
    const alt = "json-in-script";
    const cb = "pp_cb_" + Math.random().toString(16).slice(2);

    const url = new URL(endpoint);
    url.searchParams.set("alt", alt);
    url.searchParams.set("callback", cb);
    url.searchParams.set("max-results", String(max));
    url.searchParams.set("start-index", String(startIndex));
    return { url: url.toString(), cb };
  }

  // ✅ label feed url (for Featured direct fetch)
  function buildLabelFeedUrl({ label, startIndex }) {
    const cfg = state.cfg;
    const base = cfg.base.replace(/\/$/, "");
    const kind = cfg.mode === "summary" ? "summary" : "default";
    const endpoint = `${base}/feeds/posts/${kind}/-/${encodeURIComponent(label)}`;

    const max = clampInt(cfg.maxResults, 1, 150);
    const alt = "json-in-script";
    const cb = "pp_cb_" + Math.random().toString(16).slice(2);

    const url = new URL(endpoint);
    url.searchParams.set("alt", alt);
    url.searchParams.set("callback", cb);
    url.searchParams.set("max-results", String(Math.min(30, max)));
    url.searchParams.set("start-index", String(startIndex || 1));
    return { url: url.toString(), cb };
  }

  // ------------------------- Feed parsing -------------------------
  function parseFeed(json) {
    const entries = json?.feed?.entry || [];
    const out = [];

    for (const e of entries) {
      const title = e?.title?.$t || "(untitled)";
      const id = e?.id?.$t || title;

      const links = e?.link || [];
      const alt = links.find((x) => x.rel === "alternate")?.href || "";

      const published = e?.published?.$t || "";
      const updated = e?.updated?.$t || "";
      const author = e?.author?.[0]?.name?.$t || "";

      const labels = (e?.category || []).map((c) => c.term).filter(Boolean);

      const contentHtml = e?.content?.$t || e?.summary?.$t || "";
      const text = contentHtml;
      const snippet = smartSnippet(text, 240);

      out.push({
        id,
        title,
        url: alt,
        published,
        updated,
        author,
        labels,
        snippet,
        text,
      });
    }
    return out;
  }

  function smartSnippet(text, n) {
    const t = (text || "").trim();
    if (t.length <= n) return t;
    return t.slice(0, n).replace(/\s+\S*$/, "") + "…";
  }

  function addToIndex(items) {
    let added = 0;
    const seen = new Set(state.items.map((p) => p.id));

    for (const p of items) {
      if (seen.has(p.id)) continue;
      state.items.push(p);
      seen.add(p.id);
      added++;

      for (const lab of p.labels || []) {
        state.labels.set(lab, (state.labels.get(lab) || 0) + 1);
      }
    }
    updateStats();
    return added;
  }

  function rebuildLabels() {
    state.labels = new Map();
    for (const p of state.items) {
      for (const lab of p.labels || []) {
        state.labels.set(lab, (state.labels.get(lab) || 0) + 1);
      }
    }
  }

  // ------------------------- Tokens -------------------------
  function tokens(str) {
    return String(str || "")
      .toLowerCase()
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // ------------------------- UI: chips -------------------------
  function renderChips() {
    const chips = $("#chips");
    chips.innerHTML = "";

    const labs = Array.from(state.labels.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 30);

    for (const [lab, count] of labs) {
      const b = document.createElement("button");
      b.className = "chip";
      b.type = "button";
      const on = state.activeLabels.has(lab);
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.textContent = `${lab} (${count})`;
      b.addEventListener("click", () => {
        if (state.activeLabels.has(lab)) state.activeLabels.delete(lab);
        else state.activeLabels.add(lab);
        renderChips();
        render();
      });
      chips.appendChild(b);
    }
    $("#stLabels").textContent = String(state.labels.size);
  }

  // ------------------------- UI: label directory -------------------------
  function renderLabelDirectory() {
    const box = $("#labDir");
    box.innerHTML = "";

    const labs = Array.from(state.labels.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 20);

    if (!labs.length) {
      box.innerHTML = `<div class="hint">No labels yet. Load more to index more items.</div>`;
      return;
    }

    for (const [lab, count] of labs) {
      const row = document.createElement("div");
      row.className = "labRow";
      row.innerHTML = `<b>${escapeHtml(lab)}</b><span>${count}</span>`;
      row.addEventListener("click", () => openLabelDirectory(lab));
      box.appendChild(row);
    }
  }

  function openLabelDirectory(label) {
    const list = state.items
      .filter((p) => (p.labels || []).includes(label))
      .sort((a, b) => (b.published || "").localeCompare(a.published || ""));

    const q = state.q.trim();
    const html = `
      <div class="mini" style="margin-bottom:12px;">
        <h3 style="margin:0 0 6px; font-size:14px;">Label: ${escapeHtml(label)}</h3>
        <p class="hint" style="margin:0;">${list.length} results</p>
      </div>
      <div class="mini">
        ${list
          .slice(0, 80)
          .map(
            (p) => `
          <div style="padding:10px; border:1px solid rgba(31,35,40,.10); border-radius:16px; background:rgba(255,255,255,.78); margin-bottom:10px;">
            <b style="display:block; font-size:13px;">${highlight(p.title, q)}</b>
            <span class="hint" style="display:block; margin-top:4px;">🗓 ${escapeHtml(niceDate(p.published || p.updated) || "")}</span>
            <div style="margin-top:6px; color:var(--muted); font-size:12px; line-height:1.4;">${highlight(p.snippet || "", q)}</div>
            <div style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap;">
              <button class="btn" style="padding:8px 10px; border-radius:12px; font-size:12px; box-shadow:none;"
                data-act="preview" data-id="${escapeAttr(p.id)}">👀 Preview</button>
              <a class="btn primary" style="padding:8px 10px; border-radius:12px; font-size:12px; box-shadow:none;"
                href="${escapeAttr(p.url)}" target="_blank" rel="noopener">🔗 Open</a>
            </div>
          </div>
        `
          )
          .join("")}
        ${list.length > 80 ? `<div class="hint">Showing 80 only. Use search to narrow down.</div>` : ``}
      </div>
    `;

    openModal("Labels: ", `All results under “${label}”`, html, {
      kvs: [
        ["Label", label],
        ["Count", String(list.length)],
        ["Tip", "Use search to highlight matches"],
      ],
      openHref: null,
      copyText: `Label: ${label}\nCount: ${list.length}`,
    });

    bindModalDelegatesOnce();
  }

  // ------------------------- Featured -------------------------
  function isFeaturedPost(p) {
    const labs = (p.labels || []).map((x) => String(x || "").trim()).filter(Boolean);
    if (!labs.length) return false;

    const wanted = (state.cfg.featuredLabels || DEFAULT_CFG.featuredLabels || [])
      .map((x) => String(x || "").trim().toLowerCase())
      .filter(Boolean);

    return labs.some((l) => {
      const lc = l.toLowerCase();
      if (lc === "featured") return true;
      return wanted.includes(lc);
    });
  }

  function renderFeatured() {
    const box = $("#featuredBox");
    const grid = $("#featuredGrid");
    const hint = $("#featuredHint");
    if (!box || !grid || !hint) return;

    const q = state.q.trim();

    // ✅ Prefer dedicated featuredItems (direct label fetch),
    // fallback to scanning the loaded index
    let list =
      (state.featuredItems && state.featuredItems.length)
        ? state.featuredItems.slice()
        : state.items.filter(isFeaturedPost);

    // Respect active label filters
    if (state.activeLabels.size) {
      list = list.filter((p) =>
        (p.labels || []).some((l) => state.activeLabels.has(l))
      );
    }

    list.sort((a, b) => (b.published || "").localeCompare(a.published || ""));

    const limit = clampInt(state.cfg.featuredLimit || 9, 1, 30);
    const show = list.slice(0, limit);

    if (!show.length) {
      box.hidden = true;
      grid.innerHTML = "";
      return;
    }

    box.hidden = false;
    hint.textContent = `${show.length} featured post${show.length === 1 ? "" : "s"} (labelled in Blogger)`;

    grid.innerHTML = show
      .map((p) => {
        const date = niceDate(p.published || p.updated) || "";
        const labs = (p.labels || []).slice(0, 2);
        return `
          <div class="fCard" role="button" tabindex="0" data-id="${escapeAttr(p.id)}">
            <p class="fTitle">${highlight(p.title, q)}</p>
            <div class="fMeta">
              ${date ? `<span class="tag">🗓 ${escapeHtml(date)}</span>` : ""}
              ${labs.map((l) => `<span class="tag">${highlight(l, q)}</span>`).join("")}
            </div>
            <p class="fDesc">${highlight(p.snippet || "", q)}</p>
          </div>
        `;
      })
      .join("");

    grid.querySelectorAll(".fCard").forEach((card) => {
      const id = card.getAttribute("data-id");
      const openIt = () => {
        const p =
          state.items.find((x) => x.id === id) ||
          state.featuredItems.find((x) => x.id === id);
        if (p) openPreview(p);
      };
      card.addEventListener("click", openIt);
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openIt();
        }
      });
    });
  }

  // ✅ Fetch Featured directly (fixes mobile)
  async function fetchFeaturedDirect() {
    // quick cache to help mobile
    const cached = loadFeatCache();
    if (cached?.items?.length) {
      state.featuredItems = cached.items;
      renderFeatured();
    }

    const labels = Array.from(
      new Set(["Featured"].concat(state.cfg.featuredLabels || DEFAULT_CFG.featuredLabels || []))
    );

    const limit = clampInt(state.cfg.featuredLimit || 9, 1, 30);
    const found = [];
    const seen = new Set();

    for (const lab of labels) {
      if (found.length >= limit) break;
      try {
        const { url, cb } = buildLabelFeedUrl({ label: lab, startIndex: 1 });
        const json = await jsonp(url, cb);
        const items = parseFeed(json);

        for (const p of items) {
          if (found.length >= limit) break;
          if (!p || !p.id) continue;
          if (seen.has(p.id)) continue;
          seen.add(p.id);
          found.push(p);
        }
      } catch {
        // ignore this label
      }
    }

    state.featuredItems = found.slice(0, limit);
    saveFeatCache();
    renderFeatured();
  }

  // ------------------------- UI: results -------------------------
  function getFiltered() {
    const qRaw = state.q.trim();
    const tks = tokens(qRaw);
    const labs = state.activeLabels;

    let list = state.items.filter((p) => {
      if (labs.size) {
        const ok = (p.labels || []).some((l) => labs.has(l));
        if (!ok) return false;
      }
      if (tks.length) {
        const hay = [p.title, p.snippet, ...(p.labels || [])].join(" ").toLowerCase();
        const ok = tks.every((t) => hay.includes(t));
        if (!ok) return false;
      }
      return true;
    });

    if (state.sort === "new") list.sort((a, b) => (b.published || "").localeCompare(a.published || ""));
    else if (state.sort === "old") list.sort((a, b) => (a.published || "").localeCompare(b.published || ""));
    else if (state.sort === "alpha") list.sort((a, b) => (a.title || "").localeCompare(b.title || ""));

    return list;
  }

  function render() {
    const list = getFiltered();
    $("#count").textContent = `Results (${list.length})`;

    renderFeatured();

    const grid = $("#grid");
    grid.innerHTML = "";
    list.slice(0, 40).forEach((p) => grid.appendChild(itemCard(p)));

    const more = Math.max(0, list.length - 40);
    $("#loaded").textContent = more ? `Showing 40 • +${more} more match` : "Showing all matches";

    renderLabelDirectory();
  }

  function itemCard(p) {
    const el = document.createElement("article");
    el.className = "item";
    el.tabIndex = 0;
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", `Open preview for ${p.title}`);

    const date = niceDate(p.published || p.updated);
    const labs = (p.labels || []).slice(0, 3);
    const q = state.q.trim();

    el.innerHTML = `
      <div class="thumb">
        <img class="thumb" alt="" src="https://blogger.googleusercontent.com/img/a/AVvXsEhlfwIqq3YYxj6LMFr4E7IKN2bYIor-bFpbUXBT3Jthp8PKmRdWozV3hEk2xcj3kPrJ9WBIkXCr4lw5MTAz0AE5b0lPhQ2ReNbCmMOumP4zLTEOb7GY6s4YWcgcCfzltJVmQcgCObeQNRvn_SWPa_2c6cROZUOBHhRJB20PaV-peuA3GTSafM8JxgaYu5M=s257"/>
      </div>
      <div class="pBody">
        <h3 class="pTitle">${highlight(p.title, q)}</h3>
        <div class="meta">
          <span class="tag">🗓 ${escapeHtml(date || "")}</span>
          ${labs.map((l) => `<span class="tag">${highlight(l, q)}</span>`).join("")}
        </div>
        <p class="pDesc">${highlight(p.snippet || "", q)}</p>
        <div class="pBtns">
          <button class="btn" style="padding:9px 10px; border-radius:12px; font-size:12px; box-shadow:none;" data-act="preview">👀 Preview</button>
          <a class="btn primary" style="padding:9px 10px; border-radius:12px; font-size:12px; box-shadow:none;"
             href="${escapeAttr(p.url)}" target="_blank" rel="noopener" data-act="open">🔗 Open</a>
        </div>
      </div>
    `;

    el.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (btn?.dataset.act === "preview") {
        e.stopPropagation();
        openPreview(p);
        return;
      }
      if (!e.target.closest("a")) openPreview(p);
    });

    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openPreview(p);
      }
    });

    return el;
  }

  // ------------------------- Modal -------------------------
  const backdrop = $("#backdrop");
  let lastFocusEl = null;
  let modalDelegateBound = false;

  function openModal(title, subtitle, mainHtml, opts = {}) {
    $("#mTitle").textContent = title;

    const main = $("#mMain");
    main.innerHTML = `
      ${subtitle ? `<div class="hint" style="margin-bottom:10px;">${escapeHtml(subtitle)}</div>` : ``}
      ${mainHtml}
    `;

    const kvs = $("#mKvs");
    kvs.innerHTML = "";
    (opts.kvs || []).forEach(([k, v]) => kvs.appendChild(kv(k, v)));

    const mOpen = $("#mOpen");
    if (opts.openHref) {
      mOpen.style.display = "";
      mOpen.href = opts.openHref;
    } else {
      mOpen.style.display = "none";
      mOpen.removeAttribute("href");
    }

    $("#mCopy").textContent = opts.copyLabel || "📋 Copy";
    $("#mCopy").onclick = async () => {
      const txt = opts.copyText || title;
      await copyText(txt);
      toast("Copied");
    };

    lastFocusEl = document.activeElement;

    backdrop.classList.add("open");
    backdrop.setAttribute("aria-hidden", "false");
    document.addEventListener("keydown", onEsc);
    document.addEventListener("keydown", trapTab);
    setTimeout(focusFirstInModal, 0);
  }

  function openPreview(p) {
    const q = state.q.trim();

    openModal(
      p.title,
      "",
      `
        <div class="mini" style="margin-bottom:12px;">
          <h3 style="margin:0 0 6px; font-size:14px;">Summary</h3>
          <p style="margin:0; color:var(--muted); font-size:13px; line-height:1.55;">${highlight(p.snippet || "", q)}</p>
        </div>
        <div class="mini">
          <h3 style="margin:0 0 6px; font-size:14px;">Text</h3>
          <p style="margin:0; color:var(--muted); font-size:13px; line-height:1.55; white-space:pre-wrap;">
            ${highlight(smartSnippet(p.text || "", 1400), q)}
          </p>
        </div>
      `,
      {
        kvs: [
          ["Published", niceDate(p.published) || "—"],
          ["Updated", niceDate(p.updated) || "—"],
          ["Author", p.author || "—"],
          ["Labels", (p.labels || []).join(", ") || "—"],
        ],
        openHref: p.url,
        copyText: `${p.title}\n${p.snippet}\n${p.url}`,
      }
    );

    bindModalDelegatesOnce();
  }

  function closeModal() {
    backdrop.classList.remove("open");
    backdrop.setAttribute("aria-hidden", "true");
    document.removeEventListener("keydown", onEsc);
    document.removeEventListener("keydown", trapTab);
    if (lastFocusEl && lastFocusEl.focus) lastFocusEl.focus();
    lastFocusEl = null;
  }

  function onEsc(e) {
    if (e.key === "Escape") closeModal();
  }

  $("#mClose").addEventListener("click", closeModal);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) closeModal();
  });

  function kv(k, v) {
    const el = document.createElement("div");
    el.className = "kv";
    el.innerHTML = `<b>${escapeHtml(k)}</b><span>${escapeHtml(v)}</span>`;
    return el;
  }

  function focusFirstInModal() {
    const focusables = $$(".modal a, .modal button, .modal input, .modal select, .modal textarea", backdrop)
      .filter((el) => !el.disabled && el.offsetParent !== null);
    (focusables[0] || $("#mClose")).focus();
  }

  function trapTab(e) {
    if (!backdrop.classList.contains("open")) return;
    if (e.key !== "Tab") return;

    const focusables = $$(".modal a, .modal button, .modal input, .modal select, .modal textarea", backdrop)
      .filter((el) => !el.disabled && el.offsetParent !== null);

    if (!focusables.length) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function bindModalDelegatesOnce() {
    if (modalDelegateBound) return;
    modalDelegateBound = true;

    $("#mMain").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-act]");
      if (!b) return;

      if (b.dataset.act === "preview") {
        const id = b.dataset.id;
        const p = state.items.find((x) => x.id === id) || state.featuredItems.find((x) => x.id === id);
        if (p) openPreview(p);
      }
    });
  }

  // ------------------------- Global search typeahead -------------------------
  const gq = $("#gq");
  const gqWrap = $("#gqWrap");
  const gqSuggest = $("#gqSuggest");

  function closeSuggest() {
    gqSuggest.hidden = true;
    gqSuggest.innerHTML = "";
    state.suggest.items = [];
    state.suggest.idx = -1;
  }

  function scheduleSuggest() {
    if (state.suggest.t) clearTimeout(state.suggest.t);
    state.suggest.t = setTimeout(() => renderSuggest(gq.value), 90);
  }

  function renderSuggest(query) {
    const q = query.trim();
    if (!q || q.length < 2) {
      closeSuggest();
      return;
    }

    const list = getFilteredSuggest(q).slice(0, 10);
    if (!list.length) {
      gqSuggest.innerHTML = `<div class="sItem" style="cursor:default;"><div class="sMain"><b>No results</b><span>Try a different keyword.</span></div></div>`;
      gqSuggest.hidden = false;
      state.suggest.items = [];
      state.suggest.idx = -1;
      return;
    }

    gqSuggest.innerHTML =
      `
        <div class="sFoot">
          <div class="sHint">Enter: open results • Click: preview</div>
          <div class="sHint"><span class="kbd">↑</span> <span class="kbd">↓</span> <span class="kbd">Enter</span> <span class="kbd">Esc</span></div>
        </div>
      ` +
      list
        .map(
          (p, i) => `
        <div class="sItem" role="option" aria-selected="false" data-i="${i}">
          <div class="sType">item</div>
          <div class="sMain">
            <b>${highlight(p.title, q)}</b>
            <span>${highlight(p.snippet || "", q)}</span>
          </div>
        </div>
      `
        )
        .join("");

    gqSuggest.hidden = false;
    state.suggest.items = list;
    state.suggest.idx = -1;
  }

  function setActiveSuggest(newIdx) {
    const opts = $$(".sItem[role='option']", gqSuggest);
    opts.forEach((o) => o.setAttribute("aria-selected", "false"));
    if (newIdx >= 0 && newIdx < opts.length) {
      opts[newIdx].setAttribute("aria-selected", "true");
      opts[newIdx].scrollIntoView({ block: "nearest" });
      state.suggest.idx = newIdx;
    } else {
      state.suggest.idx = -1;
    }
  }

  function getFilteredSuggest(query) {
    const tks = tokens(query);
    return state.items
      .filter((p) => {
        const hay = [p.title, p.snippet, ...(p.labels || [])].join(" ").toLowerCase();
        return tks.every((t) => hay.includes(t));
      })
      .sort((a, b) => (b.published || "").localeCompare(a.published || ""));
  }

  gq.addEventListener("input", () => scheduleSuggest());

  gq.addEventListener("keydown", (e) => {
    if (e.key === "Escape") return closeSuggest();

    if (!gqSuggest.hidden && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      const max = state.suggest.items.length - 1;
      if (e.key === "ArrowDown") setActiveSuggest(Math.min(max, state.suggest.idx + 1));
      else setActiveSuggest(Math.max(0, state.suggest.idx - 1));
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const q = gq.value.trim();
      if (!q) return toast("Type to search");

      if (!gqSuggest.hidden && state.suggest.idx >= 0 && state.suggest.items[state.suggest.idx]) {
        const p = state.suggest.items[state.suggest.idx];
        closeSuggest();
        openPreview(p);
        return;
      }

      closeSuggest();
      $("#q").value = q;
      state.q = q;
      render();
      document.querySelector(".results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  gqSuggest.addEventListener("mousedown", (e) => {
    const item = e.target.closest(".sItem[role='option']");
    if (!item) return;
    const i = parseInt(item.dataset.i, 10);
    const p = state.suggest.items[i];
    if (!p) return;
    e.preventDefault();
    closeSuggest();
    openPreview(p);
  });

  document.addEventListener("mousedown", (e) => {
    if (gqWrap.contains(e.target)) return;
    closeSuggest();
  });

  gq.addEventListener("blur", () => setTimeout(closeSuggest, 120));

  // ------------------------- Controls -------------------------
  $("#q").addEventListener("input", (e) => {
    state.q = e.target.value.trim();
    render();
  });
  $("#sort").addEventListener("change", (e) => {
    state.sort = e.target.value;
    render();
  });

  $("#btnClear").addEventListener("click", () => {
    state.q = "";
    state.activeLabels.clear();
    $("#q").value = "";
    gq.value = "";
    renderChips();
    render();
    toast("Cleared");
  });

  $("#btnOpenAll").addEventListener("click", () => {
    document.querySelector(".results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    toast("Results");
  });

  $("#btnOnlyPython").addEventListener("click", () => quickLabel("Python"));
  $("#btnOnlyDSA").addEventListener("click", () => quickLabel("DSA"));
  $("#btnOnlyProjects").addEventListener("click", () => quickLabel("Projects"));

  function quickLabel(label) {
    const exact = Array.from(state.labels.keys()).find((x) => x.toLowerCase() === label.toLowerCase());
    const lab = exact || label;
    if (state.activeLabels.has(lab)) state.activeLabels.delete(lab);
    else state.activeLabels.add(lab);
    renderChips();
    render();
  }

  $("#btnRefresh").addEventListener("click", async () => {
    await refreshFeed(true);
    // refresh featured too
    await fetchFeaturedDirect();
  });
  $("#btnLoadMore").addEventListener("click", async () => {
    await loadMore();
  });
  $("#btnStop").addEventListener("click", () => {
    stopCrawl();
    toast("Stopped");
  });
  $("#btnSettings").addEventListener("click", () => openSettings());

  $("#btnJumpLab").addEventListener("click", () => jumpToLab());
  $("#btnOpenLab").addEventListener("click", () => jumpToLab(true));

  function jumpToLab(fromFab = false) {
    const lab = document.getElementById("ppLab");
    if (!lab) return;
    lab.scrollIntoView({ behavior: "smooth", block: "start" });
    lab.classList.remove("labGlow");
    void lab.offsetWidth;
    lab.classList.add("labGlow");
    if (fromFab) $("#btnOpenLab")?.classList.remove("pulse");
    toast("Practice Lab");
  }

  // ------------------------- Settings modal -------------------------
  function openSettings() {
    const cfg = state.cfg;

    const html = `
      <div class="mini">
        <h3 style="margin:0 0 6px; font-size:14px;">Search settings</h3>
        <p class="hint" style="margin:0 0 10px;">Defaults should work for your domain. Loading is capped for safety.</p>

        <div class="field">
          <div class="label">Base URL</div>
          <input class="input" id="cfgBase" value="${escapeAttr(cfg.base)}" placeholder="https://www.learnwithchampak.live" />
        </div>

        <div class="row2" style="margin-top:10px;">
          <div class="field">
            <div class="label">Max results per fetch (1–150)</div>
            <input class="input" id="cfgMax" value="${cfg.maxResults}" />
          </div>
          <div class="field">
            <div class="label">Mode</div>
            <select class="select" id="cfgMode">
              <option value="default" ${cfg.mode === "default" ? "selected" : ""}>default</option>
              <option value="summary" ${cfg.mode === "summary" ? "selected" : ""}>summary</option>
            </select>
          </div>
        </div>

        <div class="row2" style="margin-top:10px;">
          <div class="field">
            <div class="label">Auto-load all</div>
            <select class="select" id="cfgAuto">
              <option value="yes" ${cfg.autoCrawl ? "selected" : ""}>Yes</option>
              <option value="no"  ${!cfg.autoCrawl ? "selected" : ""}>No</option>
            </select>
          </div>
          <div class="field">
            <div class="label">Max total items (cap)</div>
            <input class="input" id="cfgCap" value="${escapeAttr(String(cfg.maxTotalItems))}" />
          </div>
        </div>

        <div class="row2" style="margin-top:10px;">
          <div class="field">
            <div class="label">Featured labels (comma-separated)</div>
            <input class="input" id="cfgFeat" value="${escapeAttr((cfg.featuredLabels || DEFAULT_CFG.featuredLabels).join(", "))}" />
          </div>
          <div class="field">
            <div class="label">Featured limit</div>
            <input class="input" id="cfgFeatLim" value="${escapeAttr(String(cfg.featuredLimit || 9))}" />
          </div>
        </div>

        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:12px;">
          <button class="btn primary" id="cfgSave">💾 Save</button>
          <button class="btn" id="cfgReset">↩ Reset</button>
        </div>
      </div>
    `;

    openModal("Source settings", "", html, {
      kvs: [
        ["Current start-index", String(state.startIndex)],
        ["Cached items", String(loadCache()?.items?.length || 0)],
        ["Auto pages this run", String(state.crawl.pages)],
      ],
      openHref: null,
      copyText: JSON.stringify(cfg, null, 2),
      copyLabel: "📋 Copy settings",
    });

    const root = $("#mMain");
    root.querySelector("#cfgSave").addEventListener("click", async () => {
      const base = root.querySelector("#cfgBase").value.trim() || DEFAULT_CFG.base;
      const maxResults = clampInt(root.querySelector("#cfgMax").value, 1, 150);
      const mode = root.querySelector("#cfgMode").value;
      const autoCrawl = root.querySelector("#cfgAuto").value === "yes";
      const maxTotalItems = clampInt(root.querySelector("#cfgCap").value, 50, 5000);

      const featuredLabelsRaw = root.querySelector("#cfgFeat").value || "";
      const featuredLabels = featuredLabelsRaw.split(",").map((s) => s.trim()).filter(Boolean);

      const featuredLimit = clampInt(root.querySelector("#cfgFeatLim").value, 1, 30);

      state.cfg = {
        ...state.cfg,
        base,
        maxResults,
        mode,
        autoCrawl,
        maxTotalItems,
        featuredLabels: featuredLabels.length ? featuredLabels : DEFAULT_CFG.featuredLabels,
        featuredLimit,
      };
      saveCfg();

      toast("Saved. Refreshing…");
      closeModal();
      await refreshFeed(true);
      await fetchFeaturedDirect();
    });

    root.querySelector("#cfgReset").addEventListener("click", async () => {
      state.cfg = { ...DEFAULT_CFG };
      saveCfg();
      toast("Reset to defaults");
      closeModal();
      await refreshFeed(true);
      await fetchFeaturedDirect();
    });
  }

  // ------------------------- Feed load -------------------------
  async function refreshFeed(force = false) {
    $("#status").textContent = "Loading…";
    stopCrawl(true);

    if (!force) {
      const cache = loadCache();
      if (cache?.items?.length) {
        state.items = cache.items;
        rebuildLabels();
        updateStats();
        renderChips();
        render();
        $("#status").textContent = `Loaded from cache • ${state.items.length} items`;
        $("#crawlMsg").textContent = "Cache loaded. Auto-load may continue if enabled.";
        maybeAutoCrawl();
        return;
      }
    }

    state.items = [];
    state.labels = new Map();
    state.startIndex = 1;
    state.activeLabels.clear();
    updateStats();
    renderChips();
    render();

    try {
      await loadMore();
      $("#status").textContent = `Loaded • ${state.items.length} items`;
      maybeAutoCrawl();
    } catch (err) {
      console.error(err);
      $("#status").textContent = "Could not load. Check settings or network.";
      toast("Load failed");
    }
  }

  async function loadMore() {
    if (state.loading) {
      toast("Already fetching…");
      return { items: 0, added: 0, skipped: true };
    }

    state.loading = true;
    $("#btnLoadMore").disabled = true;

    try {
      $("#status").textContent = "Fetching…";
      const { url, cb } = buildFeedUrl({ startIndex: state.startIndex });
      const json = await jsonp(url, cb);
      const items = parseFeed(json);

      if (!items.length) {
        $("#status").textContent = "No more items (or empty response).";
        toast("No more items");
        return { items: 0, added: 0 };
      }

      const added = addToIndex(items);
      state.startIndex += items.length;

      renderChips();
      render();
      saveCache();

      $("#status").textContent = `Fetched ${items.length} • added ${added}`;
      $("#stStart").textContent = String(state.startIndex);
      $("#stLoaded").textContent = String(state.items.length);
      $("#loaded").textContent = `Index: ${state.items.length} items`;
      return { items: items.length, added };
    } catch (err) {
      console.error(err);
      $("#status").textContent = "Fetch failed. Check network/settings.";
      toast("Fetch failed");
      return { items: 0, added: 0, error: true };
    } finally {
      state.loading = false;
      $("#btnLoadMore").disabled = false;
    }
  }

  // ------------------------- Auto-load -------------------------
  function maybeAutoCrawl() {
    if (!state.cfg.autoCrawl) {
      $("#crawlMsg").textContent = "Auto-load is OFF (enable in settings).";
      $("#crawlBar").style.width = "0%";
      $("#btnStop").disabled = true;
      return;
    }

    if (state.items.length >= state.cfg.maxTotalItems) {
      $("#crawlMsg").textContent = `Auto-load reached cap: ${state.cfg.maxTotalItems} items.`;
      $("#crawlBar").style.width = "100%";
      $("#btnStop").disabled = true;
      return;
    }

    startCrawl();
  }

  async function startCrawl() {
    if (state.crawl.running) return;
    state.crawl.running = true;
    state.crawl.stop = false;
    state.crawl.pages = 0;
    $("#btnStop").disabled = false;

    toast("Auto-load started");
    await crawlLoop();
  }

  function stopCrawl(silent = false) {
    state.crawl.stop = true;
    state.crawl.running = false;
    $("#btnStop").disabled = true;
    if (!silent) $("#crawlMsg").textContent = "Auto-load stopped.";
  }

  async function crawlLoop() {
    try {
      while (!state.crawl.stop) {
        const cfg = state.cfg;

        if (state.items.length >= cfg.maxTotalItems) {
          $("#crawlMsg").textContent = `Auto-load reached cap: ${cfg.maxTotalItems} items.`;
          $("#crawlBar").style.width = "100%";
          break;
        }
        if (state.crawl.pages >= cfg.maxAutoPages) {
          $("#crawlMsg").textContent = `Auto-load stopped at page cap (${cfg.maxAutoPages}).`;
          break;
        }

        state.crawl.pages++;
        const percent = Math.min(99, Math.round((state.items.length / cfg.maxTotalItems) * 100));
        $("#crawlBar").style.width = `${percent}%`;
        $("#crawlMsg").textContent = `Auto-loading… page ${state.crawl.pages} • indexed ${state.items.length}/${cfg.maxTotalItems}`;

        const { items } = await loadMore();
        if (state.crawl.stop) break;

        if (!items) {
          $("#crawlMsg").textContent = `Auto-load finished • total ${state.items.length} items`;
          $("#crawlBar").style.width = "100%";
          break;
        }

        await sleep(cfg.crawlDelayMs);
      }
    } catch (err) {
      console.error(err);
      $("#crawlMsg").textContent = "Auto-load hit an error. You can Refresh.";
    } finally {
      state.crawl.running = false;
      $("#btnStop").disabled = true;
    }
  }

  // ------------------------- Cache/config -------------------------
  function loadCfg() {
    try {
      const raw = localStorage.getItem(CFG_KEY);
      const cfg = raw ? JSON.parse(raw) : null;
      return { ...DEFAULT_CFG, ...(cfg || {}) };
    } catch {
      return { ...DEFAULT_CFG };
    }
  }
  function saveCfg() {
    try {
      localStorage.setItem(CFG_KEY, JSON.stringify(state.cfg));
    } catch {}
  }
  function loadCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
  function saveCache() {
    try {
      const payload = {
        ts: Date.now(),
        items: state.items.slice(0, state.cfg.maxTotalItems),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    } catch {}
  }

  function loadFeatCache() {
    try {
      const raw = localStorage.getItem(FEAT_CACHE_KEY);
      const obj = raw ? JSON.parse(raw) : null;
      // keep it for 7 days
      if (obj?.ts && Date.now() - obj.ts > 7 * 24 * 60 * 60 * 1000) return null;
      return obj;
    } catch {
      return null;
    }
  }
  function saveFeatCache() {
    try {
      localStorage.setItem(FEAT_CACHE_KEY, JSON.stringify({ ts: Date.now(), items: state.featuredItems }));
    } catch {}
  }

  // ------------------------- Helpers -------------------------
  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
  function escapeAttr(s) {
    return escapeHtml(s).replaceAll("`", "&#096;");
  }
  function escapeRegExp(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function highlight(text, query) {
    const t = String(text ?? "");
    const q = String(query ?? "").trim();
    if (!q) return escapeHtml(t);
    const safe = escapeHtml(t);
    const re = new RegExp(escapeRegExp(q), "ig");
    return safe.replace(re, (m) => `<mark>${m}</mark>`);
  }

  function clampInt(v, min, max) {
    const n = parseInt(v, 10);
    if (Number.isNaN(n)) return min;
    return Math.max(min, Math.min(max, n));
  }
  function niceDate(iso) {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
    } catch {
      return "";
    }
  }
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
  }
  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  const toastEl = $("#toast");
  let toastT = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    if (toastT) clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove("show"), 1400);
  }

  function updateStats() {
    $("#stTotal").textContent = String(state.items.length);
    $("#stLoaded").textContent = String(state.items.length);
    $("#stStart").textContent = String(state.startIndex);
  }

  // =========================================================
  // Voice Search + Speech Output
  // =========================================================
  const Voice = (function () {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
    const synth = window.speechSynthesis || null;

    let rec = null;
    let listening = false;
    let lastSpokenKey = "";

    function supportedRecognition() {
      return !!SR;
    }
    function supportedSpeech() {
      return !!synth && !!window.SpeechSynthesisUtterance;
    }

    function setPill(on, msg) {
      const pill = document.getElementById("voicePill");
      const t = document.getElementById("voiceMsg");
      if (!pill || !t) return;
      pill.classList.toggle("on", !!on);
      t.textContent = msg || (on ? "Listening…" : "Voice: off");
    }

    function cancelSpeech() {
      if (!supportedSpeech()) return;
      try {
        synth.cancel();
      } catch {}
    }

    function speak(text, opts = {}) {
      if (!supportedSpeech()) {
        toast("Speech output not supported");
        return;
      }
      const clean = String(text || "").trim();
      if (!clean) return;

      const key = clean.slice(0, 220);
      if (opts.dedupe && key === lastSpokenKey) return;
      lastSpokenKey = key;

      cancelSpeech();

      const u = new SpeechSynthesisUtterance(clean);
      u.rate = typeof opts.rate === "number" ? opts.rate : 1.0;
      u.pitch = typeof opts.pitch === "number" ? opts.pitch : 1.0;
      u.lang = opts.lang || "en-IN";

      try {
        synth.speak(u);
      } catch {
        toast("Speech failed");
      }
    }

    function initRecognition() {
      if (!supportedRecognition()) return null;
      rec = new SR();
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.lang = "en-IN";
      return rec;
    }

    function stopListening() {
      listening = false;
      setPill(false, "Voice: off");
      const b = document.getElementById("btnVoiceGlobal");
      if (b) b.setAttribute("aria-pressed", "false");
      try {
        rec && rec.stop();
      } catch {}
    }

    function speakResultsSummary(opts = {}) {
      const alsoTop = !!opts.alsoTop;
      const list = getFiltered();
      const count = list.length;

      if (!count) {
        speak("No results found.", { lang: "en-IN", dedupe: true });
        return;
      }

      const top = alsoTop
        ? list.slice(0, 5).map((p) => p?.title).filter(Boolean)
        : [];

      const msg = top.length
        ? `Found ${count} results. Top results: ${top.join(". ")}.`
        : `Found ${count} results.`;

      speak(msg, { lang: "en-IN", dedupe: true });
    }

    function startVoiceGlobal() {
      if (!supportedRecognition()) {
        toast("Voice search not supported in this browser");
        return;
      }
      if (!rec) initRecognition();

      if (listening) {
        stopListening();
        toast("Voice stopped");
        return;
      }

      listening = true;
      setPill(true, "Listening…");
      const b = document.getElementById("btnVoiceGlobal");
      if (b) b.setAttribute("aria-pressed", "true");

      let interim = "";
      let finalText = "";

      rec.onresult = (ev) => {
        let txt = "";
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const res = ev.results[i];
          const piece = res[0]?.transcript || "";
          if (res.isFinal) finalText += piece + " ";
          else txt += piece + " ";
        }
        interim = txt.trim();

        const gqEl = document.getElementById("gq");
        if (gqEl) gqEl.value = (finalText + " " + interim).trim();
      };

      rec.onerror = () => {
        stopListening();
        toast("Voice error");
      };

      rec.onend = () => {
        const spoken = (finalText || interim || "").trim();
        stopListening();

        if (!spoken) {
          toast("No speech detected");
          return;
        }

        const gqEl = document.getElementById("gq");
        const qEl = document.getElementById("q");
        if (gqEl) gqEl.value = spoken;
        if (qEl) qEl.value = spoken;

        state.q = spoken;
        renderChips();
        render();

        speakResultsSummary({ alsoTop: true });
      };

      try {
        cancelSpeech();
        rec.start();
        toast("Listening…");
      } catch {
        stopListening();
        toast("Could not start voice");
      }
    }

    return {
      startVoiceGlobal,
      speakResultsSummary,
      speak,
      cancelSpeech,
    };
  })();

  (function initVoiceUI() {
    const btnVoice = document.getElementById("btnVoiceGlobal");
    const btnSpeak = document.getElementById("btnSpeakResults");

    if (btnVoice) btnVoice.addEventListener("click", () => Voice.startVoiceGlobal());
    if (btnSpeak) btnSpeak.addEventListener("click", () => Voice.speakResultsSummary({ alsoTop: true }));
  })();

  // ------------------------- Practice Lab tabs -------------------------
  function initPracticeLab() {
    const root = document.getElementById("ppLab");
    if (!root) return;

    const tabBtns = root.querySelectorAll(".tabBtn");
    const framePy = document.getElementById("labPy");
    const frameJs = document.getElementById("labJs");
    const frameSql = document.getElementById("labSql");
    const frameHtml = document.getElementById("labHtml");
    const frameMongo = document.getElementById("labMongo");

    const btnReload = document.getElementById("labReload");
    const btnOpenFull = document.getElementById("labOpenFull");

    const URLS = {
      py: framePy.getAttribute("src"),
      js: frameJs.getAttribute("src"),
      sql: frameSql.getAttribute("src"),
      html: frameHtml.getAttribute("src"),
      mongo: frameMongo.getAttribute("src"),
    };

    let current = "py";

    function setTab(t) {
      current = t;

      tabBtns.forEach((b) => {
        const on = b.dataset.labtab === t;
        b.classList.toggle("on", on);
        b.setAttribute("aria-selected", String(on));
      });

      framePy.classList.toggle("show", t === "py");
      frameJs.classList.toggle("show", t === "js");
      frameSql.classList.toggle("show", t === "sql");
      frameHtml.classList.toggle("show", t === "html");
      frameMongo.classList.toggle("show", t === "mongo");

      btnOpenFull.href = URLS[t] || "#";
      toast(
        t === "py" ? "Python editor"
        : t === "js" ? "JavaScript editor"
        : t === "sql" ? "SQL editor"
        : t === "html" ? "HTML preview"
        : "MongoDB editor"
      );
    }

    tabBtns.forEach((b) => b.addEventListener("click", () => setTab(b.dataset.labtab)));

    btnReload.addEventListener("click", () => {
      const f =
        current === "py" ? framePy
        : current === "js" ? frameJs
        : current === "sql" ? frameSql
        : current === "html" ? frameHtml
        : frameMongo;

      const src = f.getAttribute("src");
      f.setAttribute("src", src);
      toast("Reloaded");
    });

    btnOpenFull.href = URLS[current];
  }

  // ------------------------- Boot -------------------------
  (async function boot() {
    initPracticeLab();

    const cache = loadCache();
    if (cache?.items?.length) {
      state.items = cache.items;
      rebuildLabels();
      renderChips();
      render();
      updateStats();
      $("#status").textContent = `Loaded from cache • ${state.items.length} items`;
      $("#crawlMsg").textContent = "Cache loaded. Auto-load may continue if enabled.";
    } else {
      $("#status").textContent = "No cache. Loading…";
    }

    // Always fetch featured directly so mobile shows it immediately
    fetchFeaturedDirect();

    try {
      if (!cache?.items?.length) await refreshFeed(true);
      else {
        setTimeout(async () => {
          try {
            await loadMore();
            maybeAutoCrawl();
          } catch {}
        }, 500);
      }
    } catch {
      $("#status").textContent = "Could not load. Check settings or network.";
    }

    renderChips();
    render();
  })();
})();