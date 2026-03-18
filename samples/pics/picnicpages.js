/* ==========================================================
   Programmer’s Picnic — GOD MODE Slideshow v2.2
   Includes:
   - Improved Timeline (active highlight + smooth centering)
   - Timeline does NOT pause slideshow (autoplay keeps running)
   - Favorites-only playback (bookmarks-only playlist)
   - Start Screen: Start All / Play Favorites / Start with Timeline
   - Floating toast messages (float up + fade out)
   - Lite mobile mode (auto + manual)
   ========================================================== */

(() => {
  "use strict";

  const CFG = {
    STORAGE: {
      BOOKMARKS_KEY: "pp_bookmarks_v2",
      SETTINGS_KEY: "pp_settings_v2",
    },
    TIMING: {
      SHARP_TIME: 6000,
      TRANSITION_TIME: 1800,
      START_FADE_OUT_MS: 900,
      CLARITY_ENTER_DELAY: 700,
      IMAGE_FADE_IN_DELAY: 200,
      CAPTION_1_DELAY: 2000,
      CAPTION_2_DELAY: 2600,
      KEN_BURNS_MS: 7000,
    },
    AUDIO: { SRC: "Picnic/0.mp3", VOLUME: 0.6 },
    UI: {
      autoCreateControls: true,
      timelineThumbsMax: 260,
      timelineThumbSize: 54,
    },
    QUALITY: {
      liteOnSmallScreen: true,
      smallScreenPx: 768,
      liteOnLowMemory: true,
      lowMemoryGB: 4,
      liteOnReducedMotion: true,
    },
  };

  const $ = (id) => document.getElementById(id);

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch { return fallback; }
  }

  function saveJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }

  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function deviceMemoryGB() {
    const dm = navigator.deviceMemory;
    return typeof dm === "number" ? dm : null;
  }

  function prettifyFilename(src) {
    try {
      let name = src.split("/").pop().split("?")[0];
      name = name.replace(/\.[^/.]+$/, "");
      name = name.replace(/[_-]+/g, " ");
      name = name.replace(/\s+/g, " ").trim();

      if (!name) return "Programmer’s Picnic Memory";
      if (/^\d+$/.test(name.replace(/\s/g, ""))) return "Programmer’s Picnic Memory";

      return name
        .toLowerCase()
        .split(" ")
        .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ""))
        .join(" ");
    } catch {
      return "Programmer’s Picnic Memory";
    }
  }

  class PicnicSlideshowV2 {
    constructor() {
      // DOM refs
      this.slideImg = $("slideImg");
      this.overlay = $("pp-gallery-overlay");
      this.startScreen = $("startScreen");
      this.progressBar = $("progressBar");
      this.progressContainer = $("progressContainer");
      this.photoCounter = $("photoCounter");
      this.musicBtn = $("musicBtn");
      this.petalLayer = $("petalLayer");
      this.fireflyLayer = $("fireflyLayer");
      this.bokehLayer = $("bokehLayer");
      this.captionLine1 = $("captionLine1");
      this.captionLine2 = $("captionLine2");
      this.nextBtn = $("nextBtn");
      this.prevBtn = $("prevBtn");

      // runtime
      this.images = [];
      this.current = 0;               // playlist position
      this.autoTimer = null;
      this.runToken = 0;
      this.isRunning = false;

      // settings
      this.settings = loadJSON(CFG.STORAGE.SETTINGS_KEY, {
        lite: null,          // null=auto, true/false user override
        timeline: false,
        favoritesOnly: false,
      });

      // bookmarks
      this.bookmarks = loadJSON(CFG.STORAGE.BOOKMARKS_KEY, { bySrc: {}, order: [] });

      // playlist (active playback list => indices into this.images)
      this.playlist = {
        mode: this.settings.favoritesOnly ? "favorites" : "all",
        indices: [],
        posByMasterIndex: new Map(), // masterIndex -> playlist position
      };

      // particles via rAF
      this.rafId = null;
      this.particleState = {
        clarityBoost: false,
        lastPetal: 0,
        lastFirefly: 0,
        lastBokeh: 0,
      };

      // audio
      this.audio = new Audio(CFG.AUDIO.SRC);
      this.audio.loop = true;
      this.audio.volume = CFG.AUDIO.VOLUME;

      // tooltip + toast
      this.progressTooltip = this.createProgressTooltip();

      // quotes
      this.quotes = window.spiritualQuotes || [];
      if (!this.quotes.length) this.quotes = this.defaultQuotes();

      // derived
      this.totalTime = CFG.TIMING.SHARP_TIME + CFG.TIMING.TRANSITION_TIME;

      // timeline UI
      this.timeline = { wrap: null, rail: null, isBuilt: false };

      // bottom controls UI (auto-created)
      this.controls = {
        wrap: null,
        btnLite: null,
        btnTimeline: null,
        btnBookmark: null,
        btnBookmarks: null,
        btnFavOnly: null,
      };

      // bind handlers
      this.onVisibility = this.onVisibility.bind(this);
      this.onResize = this.onResize.bind(this);
      this.onProgressClick = this.onProgressClick.bind(this);
      this.onProgressMove = this.onProgressMove.bind(this);
      this.onProgressLeave = this.onProgressLeave.bind(this);
      this.onOverlayTouchStart = this.onOverlayTouchStart.bind(this);
      this.onOverlayTouchEnd = this.onOverlayTouchEnd.bind(this);

      this.touchStartX = 0;
    }

    init() {
      this.assertDom();
      this.injectV2Styles();
      this.loadImagesFromHiddenContainer();
      if (!this.images.length) return false;

      shuffleArray(this.images);
      this.rebuildPlaylist(true);

      if (CFG.UI.autoCreateControls) this.ensureControlsUI();

      this.bindEvents();

      // placeholder
      this.slideImg.src = this.images[0].src;

      this.applyQualityMode();

      if (this.settings.timeline) this.enableTimeline(true);
      this.syncFavoritesButton();

      return true;
    }

    assertDom() {
      const must = [
        this.slideImg, this.overlay, this.startScreen,
        this.progressBar, this.progressContainer, this.photoCounter,
        this.musicBtn, this.petalLayer, this.fireflyLayer, this.bokehLayer,
        this.captionLine1, this.captionLine2, this.nextBtn, this.prevBtn
      ];
      if (must.some((x) => !x)) console.warn("PicnicSlideshowV2: Missing required DOM elements.");
    }

    loadImagesFromHiddenContainer() {
      const stored = document.querySelectorAll("#picnic-images img");
      stored.forEach((img) => { if (img && img.src) this.images.push({ src: img.src }); });
    }

    /* ------------------ Playlist: ALL vs FAVORITES ------------------ */
    rebuildPlaylist(keepCurrentIfPossible = false) {
      const wantFav = !!this.settings.favoritesOnly;

      let indices;
      if (!wantFav) {
        indices = this.images.map((_, i) => i);
        this.playlist.mode = "all";
      } else {
        const bookmarked = new Set(this.bookmarks.order);
        indices = this.images
          .map((x, i) => (bookmarked.has(x.src) ? i : -1))
          .filter((i) => i >= 0);

        if (!indices.length) {
          // fallback to ALL if no favorites
          this.settings.favoritesOnly = false;
          saveJSON(CFG.STORAGE.SETTINGS_KEY, this.settings);
          indices = this.images.map((_, i) => i);
          this.playlist.mode = "all";
          this.toast("No bookmarks yet — Favorites needs ⭐ bookmarks.");
        } else {
          this.playlist.mode = "favorites";
        }
      }

      this.playlist.indices = indices;
      this.playlist.posByMasterIndex = new Map();
      indices.forEach((masterIdx, pos) => this.playlist.posByMasterIndex.set(masterIdx, pos));

      if (keepCurrentIfPossible) {
        const currentMaster = this.getCurrentMasterIndexSafe();
        if (currentMaster != null && this.playlist.posByMasterIndex.has(currentMaster)) {
          this.current = this.playlist.posByMasterIndex.get(currentMaster);
        } else {
          this.current = 0;
        }
      } else {
        this.current = clamp(this.current, 0, this.activeCount() - 1);
      }

      // If timeline is ON, rebuild it so it reflects active playlist (favorites-only timeline)
      if (this.settings.timeline) {
        this.destroyTimeline();
        this.buildTimeline();
      }

      this.syncFavoritesButton();
    }

    getCurrentMasterIndexSafe() {
      const idx = this.playlist.indices[this.current];
      return typeof idx === "number" ? idx : null;
    }

    activeCount() { return this.playlist.indices.length; }

    /* ------------------ Quality / Lite mode ------------------ */
    autoLiteDecision() {
      const w = window.innerWidth || 1024;
      const small = CFG.QUALITY.liteOnSmallScreen && w <= CFG.QUALITY.smallScreenPx;
      const lowMem =
        CFG.QUALITY.liteOnLowMemory &&
        (deviceMemoryGB() !== null ? deviceMemoryGB() <= CFG.QUALITY.lowMemoryGB : false);
      const reduced = CFG.QUALITY.liteOnReducedMotion && prefersReducedMotion();
      return small || lowMem || reduced;
    }

    isLite() {
      if (this.settings.lite === true) return true;
      if (this.settings.lite === false) return false;
      return this.autoLiteDecision();
    }

    applyQualityMode() {
      const lite = this.isLite();
      document.documentElement.classList.toggle("pp-lite", lite);
      if (this.controls.btnLite) this.controls.btnLite.textContent = lite ? "📱 Lite: ON" : "✨ Lite: OFF";
    }

    toggleLite() {
      const cur = this.settings.lite;
      const next = cur === null ? true : (cur === true ? false : null);
      this.settings.lite = next;
      saveJSON(CFG.STORAGE.SETTINGS_KEY, this.settings);
      this.applyQualityMode();
    }

    /* ------------------ Bottom controls UI ------------------ */
    ensureControlsUI() {
      if (this.controls.wrap) return;

      const wrap = document.createElement("div");
      wrap.id = "pp-v2-controls";
      wrap.style.cssText = `
        position: fixed;
        left: 14px;
        bottom: 14px;
        z-index: 1000001;
        display: flex;
        gap: 10px;
        align-items: center;
        padding: 10px 12px;
        border-radius: 16px;
        background: rgba(255, 245, 225, 0.82);
        backdrop-filter: blur(8px);
        border: 1px solid rgba(90,40,0,0.12);
        box-shadow: 0 18px 40px rgba(120,60,10,0.18);
        user-select: none;
        flex-wrap: wrap;
      `;

      const mkBtn = (id, text) => {
        const b = document.createElement("button");
        b.id = id;
        b.type = "button";
        b.textContent = text;
        b.style.cssText = `
          appearance: none;
          border: 1px solid rgba(90,40,0,0.18);
          background: rgba(255, 210, 155, 0.75);
          color: #5a2d00;
          font-weight: 900;
          padding: 8px 10px;
          border-radius: 12px;
          cursor: pointer;
          font-size: 13px;
        `;
        return b;
      };

      const btnLite = mkBtn("ppBtnLite", "✨ Lite");
      const btnTimeline = mkBtn("ppBtnTimeline", "🕰️ Timeline");
      const btnBookmark = mkBtn("ppBtnBookmark", "⭐ Bookmark");
      const btnBookmarks = mkBtn("ppBtnBookmarks", "📌 Bookmarks");
      const btnFavOnly = mkBtn("ppBtnFavOnly", "⭐ Favorites: OFF");

      wrap.appendChild(btnLite);
      wrap.appendChild(btnTimeline);
      wrap.appendChild(btnBookmark);
      wrap.appendChild(btnBookmarks);
      wrap.appendChild(btnFavOnly);
      document.body.appendChild(wrap);

      this.controls.wrap = wrap;
      this.controls.btnLite = btnLite;
      this.controls.btnTimeline = btnTimeline;
      this.controls.btnBookmark = btnBookmark;
      this.controls.btnBookmarks = btnBookmarks;
      this.controls.btnFavOnly = btnFavOnly;

      btnLite.addEventListener("click", () => this.toggleLite());
      btnTimeline.addEventListener("click", () => this.enableTimeline(!this.settings.timeline));
      btnBookmark.addEventListener("click", () => this.toggleBookmarkForCurrent());
      btnBookmarks.addEventListener("click", () => this.openBookmarksPanel());
      btnFavOnly.addEventListener("click", () => this.toggleFavoritesOnly());

      this.applyQualityMode();
      this.syncFavoritesButton();
      this.syncBookmarkButton();
    }

    syncFavoritesButton() {
      if (!this.controls.btnFavOnly) return;
      const on = !!this.settings.favoritesOnly && this.playlist.mode === "favorites";
      this.controls.btnFavOnly.textContent = on ? "⭐ Favorites: ON" : "⭐ Favorites: OFF";
    }

    toggleFavoritesOnly() {
      this.settings.favoritesOnly = !this.settings.favoritesOnly;
      saveJSON(CFG.STORAGE.SETTINGS_KEY, this.settings);

      this.rebuildPlaylist(true);

      if (this.isRunning) {
        this.show();
        this.startAuto(); // reset timer but keep running
      }
    }

    /* ------------------ Timeline mode (Improved) ------------------ */
    enableTimeline(on) {
      this.settings.timeline = !!on;
      saveJSON(CFG.STORAGE.SETTINGS_KEY, this.settings);

      if (this.controls.btnTimeline) {
        this.controls.btnTimeline.textContent = on ? "🕰️ Timeline: ON" : "🕰️ Timeline";
      }

      if (!on) {
        this.destroyTimeline();
        return;
      }

      this.buildTimeline();
      this.syncTimelineActive();
    }

    buildTimeline() {
      if (this.timeline.isBuilt) return;

      const wrap = document.createElement("div");
      wrap.id = "pp-timeline";
      wrap.style.cssText = `
        position: fixed;
        left: 50%;
        transform: translateX(-50%);
        bottom: 66px;
        width: min(980px, 94vw);
        z-index: 1000000;
        padding: 10px;
        border-radius: 18px;
        background: rgba(255, 245, 225, 0.78);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(90,40,0,0.12);
        box-shadow: 0 22px 55px rgba(120,60,10,0.22);
      `;

      const rail = document.createElement("div");
      rail.style.cssText = `
        display: flex;
        gap: 8px;
        overflow-x: auto;
        overflow-y: hidden;
        padding: 6px 4px;
        scroll-snap-type: x mandatory;
        scrollbar-width: thin;
      `;

      // Timeline follows active playlist (favorites-only timeline when favoritesOnly is ON)
      const activeMasterIndices = this.playlist.indices;
      const max = Math.min(activeMasterIndices.length, CFG.UI.timelineThumbsMax);

      for (let p = 0; p < max; p++) {
        const masterIdx = activeMasterIndices[p];
        const src = this.images[masterIdx].src;

        const t = document.createElement("img");
        t.alt = "memory";
        t.loading = "lazy";
        t.decoding = "async";
        t.src = src;
        t.dataset.playpos = String(p);

        t.style.cssText = `
          width: ${CFG.UI.timelineThumbSize}px;
          height: ${CFG.UI.timelineThumbSize}px;
          object-fit: cover;
          border-radius: 12px;
          border: 2px solid rgba(90,40,0,0.10);
          opacity: 0.82;
          cursor: pointer;
          scroll-snap-align: center;
          flex: 0 0 auto;
          transition: transform .18s ease, opacity .18s ease, box-shadow .18s ease, border-color .18s ease, filter .18s ease;
          filter: saturate(1.05) contrast(1.02);
        `;

        t.addEventListener("click", (e) => {
          e.stopPropagation();
          // Jump but keep autoplay running (reset timer so user gets full duration)
          this.goTo(p);
          if (this.isRunning) this.startAuto();
        });

        rail.appendChild(t);
      }

      wrap.appendChild(rail);
      document.body.appendChild(wrap);

      this.timeline.wrap = wrap;
      this.timeline.rail = rail;
      this.timeline.isBuilt = true;

      if (this.isLite()) wrap.style.bottom = "58px";
    }

    destroyTimeline() {
      if (this.timeline.wrap) this.timeline.wrap.remove();
      this.timeline.wrap = null;
      this.timeline.rail = null;
      this.timeline.isBuilt = false;
    }

    syncTimelineActive() {
      if (!this.timeline.isBuilt || !this.timeline.rail) return;

      const thumbs = this.timeline.rail.querySelectorAll("img[data-playpos]");
      thumbs.forEach((img) => {
        const pos = Number(img.dataset.playpos);
        const active = pos === this.current;

        if (active) {
          img.style.opacity = "1";
          img.style.transform = "scale(1.14)";
          img.style.borderColor = "rgba(217, 119, 6, 0.95)";
          img.style.boxShadow =
            "0 0 0 2px rgba(255, 220, 170, 0.85), 0 14px 35px rgba(217, 119, 6, 0.35)";
          img.style.filter = "saturate(1.25) contrast(1.12) brightness(1.04)";
        } else {
          img.style.opacity = "0.74";
          img.style.transform = "scale(1)";
          img.style.borderColor = "rgba(90,40,0,0.10)";
          img.style.boxShadow = "none";
          img.style.filter = "saturate(1.05) contrast(1.02)";
        }
      });

      const activeEl = this.timeline.rail.querySelector(`img[data-playpos="${this.current}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }

    /* ------------------ Bookmarks ------------------ */
    toggleBookmarkForCurrent() {
      const masterIdx = this.getCurrentMasterIndexSafe();
      if (masterIdx == null) return;

      const src = this.images[masterIdx]?.src;
      if (!src) return;

      const exists = !!this.bookmarks.bySrc[src];
      if (exists) {
        delete this.bookmarks.bySrc[src];
        this.bookmarks.order = this.bookmarks.order.filter((x) => x !== src);
        this.toast("Removed bookmark ⭐");
      } else {
        this.bookmarks.bySrc[src] = { src, title: prettifyFilename(src), ts: Date.now() };
        this.bookmarks.order.unshift(src);
        this.bookmarks.order = Array.from(new Set(this.bookmarks.order)).slice(0, 400);
        this.toast("Bookmarked ⭐");
      }

      saveJSON(CFG.STORAGE.BOOKMARKS_KEY, this.bookmarks);
      this.syncBookmarkButton();

      // If favorites-only mode is ON, playlist may change immediately
      if (this.settings.favoritesOnly) {
        this.rebuildPlaylist(true);
        if (this.isRunning) {
          this.show();
          this.startAuto();
        }
      } else {
        if (this.settings.timeline) this.syncTimelineActive();
      }
    }

    syncBookmarkButton() {
      if (!this.controls.btnBookmark) return;
      const masterIdx = this.getCurrentMasterIndexSafe();
      const src = masterIdx != null ? this.images[masterIdx]?.src : "";
      const marked = src ? !!this.bookmarks.bySrc[src] : false;
      this.controls.btnBookmark.textContent = marked ? "⭐ Bookmarked" : "⭐ Bookmark";
    }

    openBookmarksPanel() {
      const panelId = "pp-bookmarks-panel";
      const old = document.getElementById(panelId);
      if (old) old.remove();

      const panel = document.createElement("div");
      panel.id = panelId;
      panel.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 1000002;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(10, 6, 2, 0.55);
        backdrop-filter: blur(6px);
      `;

      const card = document.createElement("div");
      card.style.cssText = `
        width: min(860px, 94vw);
        max-height: 78vh;
        overflow: hidden;
        border-radius: 22px;
        background: rgba(255, 248, 235, 0.94);
        border: 1px solid rgba(90,40,0,0.14);
        box-shadow: 0 40px 120px rgba(20, 10, 2, 0.45);
        display: flex;
        flex-direction: column;
      `;

      const header = document.createElement("div");
      header.style.cssText = `
        padding: 14px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        border-bottom: 1px solid rgba(90,40,0,0.10);
        flex-wrap: wrap;
      `;

      const title = document.createElement("div");
      title.textContent = "📌 Bookmarks";
      title.style.cssText = `font-weight: 900; color:#5a2d00; font-size: 16px;`;

      const actions = document.createElement("div");
      actions.style.cssText = `display:flex; gap:10px; align-items:center; flex-wrap: wrap;`;

      const mkBtn = (txt) => {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = txt;
        b.style.cssText = `
          border: 1px solid rgba(90,40,0,0.18);
          background: rgba(255, 210, 155, 0.75);
          color: #5a2d00;
          font-weight: 900;
          padding: 8px 10px;
          border-radius: 12px;
          cursor: pointer;
          font-size: 13px;
        `;
        return b;
      };

      const btnPlayFav = mkBtn("Play Favorites");
      const btnClear = mkBtn("Clear All");
      const btnClose = mkBtn("Close");

      actions.appendChild(btnPlayFav);
      actions.appendChild(btnClear);
      actions.appendChild(btnClose);

      header.appendChild(title);
      header.appendChild(actions);

      const list = document.createElement("div");
      list.style.cssText = `
        padding: 12px;
        overflow: auto;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 12px;
      `;

      const items = this.bookmarks.order.map((src) => this.bookmarks.bySrc[src]).filter(Boolean);

      if (!items.length) {
        const empty = document.createElement("div");
        empty.textContent = "No bookmarks yet. Tap ⭐ to save a memory.";
        empty.style.cssText = `color:#6e3300; opacity:.85; padding: 16px; font-weight: 800;`;
        list.appendChild(empty);
        btnPlayFav.disabled = true;
        btnPlayFav.style.opacity = "0.55";
        btnPlayFav.style.cursor = "not-allowed";
      } else {
        items.forEach((it) => {
          const tile = document.createElement("div");
          tile.style.cssText = `
            border: 1px solid rgba(90,40,0,0.12);
            border-radius: 16px;
            padding: 10px;
            background: rgba(255,255,255,0.75);
            cursor: pointer;
          `;

          const img = document.createElement("img");
          img.src = it.src;
          img.loading = "lazy";
          img.decoding = "async";
          img.alt = it.title || "bookmark";
          img.style.cssText = `width: 100%; height: 110px; object-fit: cover; border-radius: 12px;`;

          const cap = document.createElement("div");
          cap.textContent = it.title || "Memory";
          cap.style.cssText = `margin-top: 8px; font-weight: 900; color:#5a2d00; font-size: 13px; line-height: 1.2;`;

          tile.appendChild(img);
          tile.appendChild(cap);

          tile.addEventListener("click", () => {
            const masterIdx = this.images.findIndex((x) => x.src === it.src);
            if (masterIdx >= 0) {
              panel.remove();
              // Jump correctly depending on playlist mode
              if (this.settings.favoritesOnly) {
                this.rebuildPlaylist(true);
                const pos = this.playlist.posByMasterIndex.get(masterIdx);
                if (typeof pos === "number") {
                  this.goTo(pos);
                  if (this.isRunning) this.startAuto();
                } else {
                  this.toast("This bookmark isn’t in current favorites list.");
                }
              } else {
                // in ALL mode, playlist position == masterIdx
                this.goTo(masterIdx);
                if (this.isRunning) this.startAuto();
              }
            } else {
              this.toast("Bookmark image not found in this set.");
            }
          });

          list.appendChild(tile);
        });
      }

      card.appendChild(header);
      card.appendChild(list);
      panel.appendChild(card);
      document.body.appendChild(panel);

      const close = () => panel.remove();
      btnClose.addEventListener("click", close);
      panel.addEventListener("click", (e) => { if (e.target === panel) close(); });

      btnClear.addEventListener("click", () => {
        this.bookmarks = { bySrc: {}, order: [] };
        saveJSON(CFG.STORAGE.BOOKMARKS_KEY, this.bookmarks);
        panel.remove();
        this.toast("Bookmarks cleared.");
        this.syncBookmarkButton();

        if (this.settings.favoritesOnly) {
          this.rebuildPlaylist(true);
          if (this.isRunning) { this.show(); this.startAuto(); }
        }
      });

      btnPlayFav.addEventListener("click", () => {
        panel.remove();
        this.settings.favoritesOnly = true;
        this.settings.timeline = true; // favorites-only timeline feel
        saveJSON(CFG.STORAGE.SETTINGS_KEY, this.settings);

        this.rebuildPlaylist(true);
        this.enableTimeline(true);

        if (this.isRunning) { this.show(); this.startAuto(); }
        this.toast("Playing Favorites ⭐");
      });
    }

    /* ------------------ Events ------------------ */
    bindEvents() {
      // Start screen buttons
      const btnAll = $("ppStartAll");
      const btnFav = $("ppStartFav");
      const btnTL  = $("ppStartTimeline");

      const begin = ({ favoritesOnly, timeline }) => {
        this.settings.favoritesOnly = !!favoritesOnly;
        this.settings.timeline = !!timeline;
        saveJSON(CFG.STORAGE.SETTINGS_KEY, this.settings);

        this.rebuildPlaylist(true);

        if (this.settings.timeline) {
          this.destroyTimeline();
          this.buildTimeline();
        } else {
          this.destroyTimeline();
        }

        this.startScreen.style.opacity = "0";
        setTimeout(() => {
          this.startScreen.style.display = "none";
          this.overlay.style.display = "flex";
          this.start();
          this.tryPlayMusic();

          // small feature-marketing toast once
          if (!this._marketingShownOnce) {
            this._marketingShownOnce = true;
            setTimeout(() => this.toast("Tip: ⭐ Bookmark memories → then Play Favorites."), 900);
          }
        }, CFG.TIMING.START_FADE_OUT_MS);
      };

      if (btnAll) btnAll.addEventListener("click", (e) => { e.stopPropagation(); begin({ favoritesOnly:false, timeline:false }); });
      if (btnFav) btnFav.addEventListener("click", (e) => { e.stopPropagation(); begin({ favoritesOnly:true, timeline:true }); });
      if (btnTL)  btnTL.addEventListener("click",  (e) => { e.stopPropagation(); begin({ favoritesOnly:false, timeline:true }); });

      // fallback click anywhere => start all
      this.startScreen.addEventListener("click", () => begin({ favoritesOnly:false, timeline:false }));

      // Music toggle
      this.musicBtn.addEventListener("click", () => {
        if (this.audio.paused) {
          this.audio.play().catch(() => {});
          this.musicBtn.textContent = "🔊 Playing";
        } else {
          this.audio.pause();
          this.musicBtn.textContent = "🎵 Music";
        }
      });

      // Next/Prev
      this.nextBtn.addEventListener("click", () => { this.next(); this.startAuto(); });
      this.prevBtn.addEventListener("click", () => { this.prev(); this.startAuto(); });

      // Progress
      this.progressContainer.addEventListener("click", this.onProgressClick);
      this.progressContainer.addEventListener("mousemove", this.onProgressMove);
      this.progressContainer.addEventListener("mouseleave", this.onProgressLeave);

      // Touch swipe
      this.overlay.addEventListener("touchstart", this.onOverlayTouchStart, { passive: true });
      this.overlay.addEventListener("touchend", this.onOverlayTouchEnd, { passive: true });

      // IMPORTANT: We do NOT pause on hover/touch anymore (keeps slideshow running)
      // (intentionally no mouseover pause handlers)

      // Keyboard shortcuts
      document.addEventListener("keydown", (e) => {
        if (this.overlay.style.display !== "flex") return;
        const k = e.key.toLowerCase();

        if (e.key === "ArrowRight") { this.next(); this.startAuto(); }
        if (e.key === "ArrowLeft") { this.prev(); this.startAuto(); }
        if (k === "b") this.toggleBookmarkForCurrent();
        if (k === "t") this.enableTimeline(!this.settings.timeline);
        if (k === "l") this.toggleLite();
        if (k === "f") this.toggleFavoritesOnly();
      });

      document.addEventListener("visibilitychange", this.onVisibility);
      window.addEventListener("resize", this.onResize);
    }

    onVisibility() {
      if (document.hidden) {
        this.stopAuto();
        this.pauseParticles();
        if (!this.audio.paused) this.audio.pause();
      } else {
        if (this.isRunning) {
          this.startAuto();
          this.resumeParticles();
        }
      }
    }

    onResize() { this.applyQualityMode(); }

    onOverlayTouchStart(e) {
      if (!e.changedTouches || !e.changedTouches.length) return;
      this.touchStartX = e.changedTouches[0].clientX;
    }

    onOverlayTouchEnd(e) {
      if (!e.changedTouches || !e.changedTouches.length) return;
      const x = e.changedTouches[0].clientX;
      const diff = x - this.touchStartX;

      if (diff > 50) { this.prev(); this.startAuto(); }
      else if (diff < -50) { this.next(); this.startAuto(); }
    }

    onProgressClick(e) {
      if (!this.activeCount()) return;
      const rect = this.progressContainer.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const idx = Math.round(clamp(percent, 0, 1) * (this.activeCount() - 1));
      this.goTo(idx);
      this.startAuto();
    }

    onProgressMove(e) {
      if (!this.activeCount()) return;
      const rect = this.progressContainer.getBoundingClientRect();
      let percent = (e.clientX - rect.left) / rect.width;
      percent = clamp(percent, 0, 1);

      const previewIndex = Math.round(percent * (this.activeCount() - 1));
      const number = previewIndex + 1;

      const modeLabel = this.playlist.mode === "favorites" ? "Favorites" : "All";
      this.progressTooltip.textContent = `${modeLabel}: ${number} / ${this.activeCount()}`;
      this.progressTooltip.style.left = e.clientX + "px";
      this.progressTooltip.style.top = rect.top + "px";
      this.progressTooltip.style.display = "block";
    }

    onProgressLeave() { this.progressTooltip.style.display = "none"; }

    /* ------------------ Start/Stop autoplay ------------------ */
    start() {
      if (!this.activeCount()) return;
      this.isRunning = true;

      this.current = clamp(this.current, 0, this.activeCount() - 1);
      this.show();
      this.startAuto();
      this.resumeParticles();
      this.syncBookmarkButton();
      this.syncFavoritesButton();
    }

    startAuto() {
      if (!this.isRunning) return;
      this.stopAuto();
      this.autoTimer = setInterval(() => this.next(), this.totalTime);
    }

    stopAuto() {
      if (this.autoTimer) clearInterval(this.autoTimer);
      this.autoTimer = null;
    }

    /* ------------------ Navigation (playlist-based) ------------------ */
    next() {
      if (!this.activeCount()) return;
      this.current = (this.current + 1) % this.activeCount();
      this.show();
    }

    prev() {
      if (!this.activeCount()) return;
      this.current = (this.current - 1 + this.activeCount()) % this.activeCount();
      this.show();
    }

    goTo(playlistPos) {
      if (!this.activeCount()) return;
      this.current = clamp(playlistPos, 0, this.activeCount() - 1);
      this.show();
    }

    /* ------------------ Display ------------------ */
    show() {
      if (!this.activeCount()) return;
      const token = ++this.runToken;

      this.particleState.clarityBoost = false;
      this.slideImg.style.opacity = 0;
      this.slideImg.classList.remove("sharp");
      this.slideImg.style.transform = "scale(1) translate(0,0)";
      this.captionLine1.classList.remove("caption-show");
      this.captionLine2.classList.remove("caption-show");

      const masterIdx = this.playlist.indices[this.current];
      const src = this.images[masterIdx].src;

      const modeLabel = this.playlist.mode === "favorites" ? "⭐ " : "";
      this.photoCounter.textContent = `${modeLabel}${this.current + 1} / ${this.activeCount()}`;

      this.updateProgress();
      this.syncTimelineActive();
      this.syncBookmarkButton();
      this.syncFavoritesButton();

      this.slideImg.onload = () => {
        if (token !== this.runToken) return;

        setTimeout(() => {
          if (token !== this.runToken) return;
          this.slideImg.style.opacity = 1;
        }, CFG.TIMING.IMAGE_FADE_IN_DELAY);

        setTimeout(() => {
          if (token !== this.runToken) return;
          this.particleState.clarityBoost = true;
          this.slideImg.classList.add("sharp");
          this.applyKenBurns();
          this.setCaptions(masterIdx);
        }, CFG.TIMING.CLARITY_ENTER_DELAY);

        setTimeout(() => {
          if (token !== this.runToken) return;
          this.particleState.clarityBoost = false;
          this.slideImg.classList.remove("sharp");
          this.slideImg.style.transform = "scale(1) translate(0,0)";
          this.captionLine1.classList.remove("caption-show");
          this.captionLine2.classList.remove("caption-show");
        }, CFG.TIMING.SHARP_TIME);
      };

      this.slideImg.src = src;
    }

    updateProgress() {
      if (this.activeCount() <= 1) {
        this.progressBar.style.width = "100%";
        return;
      }
      const percent = (this.current / (this.activeCount() - 1)) * 100;
      this.progressBar.style.width = percent + "%";
    }

    setCaptions(masterIdx) {
      const src = this.images[masterIdx]?.src || "";
      const title = prettifyFilename(src);
      const quote = this.quotes[masterIdx % this.quotes.length];

      this.captionLine1.textContent = title;
      this.captionLine2.textContent = quote;

      this.captionLine1.classList.remove("caption-show");
      this.captionLine2.classList.remove("caption-show");

      const token = this.runToken;
      setTimeout(() => { if (token === this.runToken) this.captionLine1.classList.add("caption-show"); }, CFG.TIMING.CAPTION_1_DELAY);
      setTimeout(() => { if (token === this.runToken) this.captionLine2.classList.add("caption-show"); }, CFG.TIMING.CAPTION_2_DELAY);
    }

    /* ------------------ Ken Burns ------------------ */
    applyKenBurns() {
      if (this.isLite()) {
        this.slideImg.style.transform = "scale(1) translate(0,0)";
        return;
      }
      const zoomVal = Math.random() < 0.5 ? 1.08 : 1.12;
      const tx = Math.random() * 24 - 12;
      const ty = Math.random() * 24 - 12;

      this.slideImg.style.transition = `transform ${CFG.TIMING.KEN_BURNS_MS}ms ease-in-out`;
      this.slideImg.style.transform = `scale(${zoomVal}) translate(${tx}px, ${ty}px)`;
    }

    /* ------------------ Particles (rAF) ------------------ */
    resumeParticles() {
      if (this.rafId) return;
      const loop = (t) => {
        this.rafId = requestAnimationFrame(loop);
        this.tickParticles(t);
      };
      this.rafId = requestAnimationFrame(loop);
    }

    pauseParticles() {
      if (this.rafId) cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    tickParticles(t) {
      if (!this.particleState.clarityBoost) return;

      const lite = this.isLite();
      const petalEvery = lite ? 520 : 220;
      const fireflyEvery = lite ? 700 : 320;
      const bokehEvery = lite ? 1400 : 720;

      if (t - this.particleState.lastPetal > petalEvery) {
        this.particleState.lastPetal = t;
        this.spawnPetals(lite ? 1 : 1 + Math.floor(Math.random() * 3));
      }
      if (t - this.particleState.lastFirefly > fireflyEvery) {
        this.particleState.lastFirefly = t;
        this.spawnFirefly();
      }
      if (!lite && (t - this.particleState.lastBokeh > bokehEvery)) {
        this.particleState.lastBokeh = t;
        this.spawnBokeh();
      }
    }

    spawnPetals(count) {
      for (let i = 0; i < count; i++) {
        const isMarigold = Math.random() < 0.5;
        const el = document.createElement("div");
        el.className = isMarigold ? "marigold" : "petal";
        el.style.left = Math.random() * window.innerWidth + "px";
        el.style.top = "-40px";
        el.style.animationDelay = `${Math.random() * 2}s`;
        this.petalLayer.appendChild(el);
        setTimeout(() => el.remove(), 9000);
      }
    }

    spawnFirefly() {
      const dot = document.createElement("div");
      const size = Math.random() * 8 + 4;
      dot.className = "godParticle";
      dot.style.width = size + "px";
      dot.style.height = size + "px";
      dot.style.top = Math.random() * window.innerHeight + "px";
      dot.style.left = Math.random() * window.innerWidth + "px";
      dot.style.background = "radial-gradient(circle, rgba(255,255,220,0.9), rgba(255,200,120,0.1))";
      dot.style.boxShadow = "0 0 16px rgba(255,230,160,0.9)";
      dot.style.zIndex = 5;
      this.fireflyLayer.appendChild(dot);
      setTimeout(() => dot.remove(), 2600);
    }

    spawnBokeh() {
      const orb = document.createElement("div");
      const size = Math.random() * 120 + 60;
      orb.className = "bokehOrb";
      orb.style.width = size + "px";
      orb.style.height = size + "px";
      orb.style.top = Math.random() * window.innerHeight + "px";
      orb.style.left = Math.random() * window.innerWidth + "px";
      orb.style.zIndex = 4;
      this.bokehLayer.appendChild(orb);
      setTimeout(() => orb.remove(), 4200);
    }

    /* ------------------ Audio ------------------ */
    tryPlayMusic() {
      this.audio.play().catch(() => {});
    }

    /* ------------------ Tooltip + Floating Toast ------------------ */
    createProgressTooltip() {
      const d = document.createElement("div");
      d.style.position = "fixed";
      d.style.padding = "4px 8px";
      d.style.borderRadius = "8px";
      d.style.fontSize = "12px";
      d.style.background = "rgba(90, 40, 0, 0.9)";
      d.style.color = "#ffe9c4";
      d.style.pointerEvents = "none";
      d.style.transform = "translate(-50%, -120%)";
      d.style.whiteSpace = "nowrap";
      d.style.zIndex = "1000000";
      d.style.display = "none";
      document.body.appendChild(d);
      return d;
    }

    toast(msg) {
      const id = "pp-toast-v2";
      let t = document.getElementById(id);

      if (!t) {
        t = document.createElement("div");
        t.id = id;
        t.style.cssText = `
          position: fixed;
          left: 50%;
          top: 18px;
          transform: translateX(-50%);
          z-index: 1000003;
          padding: 10px 14px;
          border-radius: 14px;
          background: rgba(255,245,225,0.92);
          border: 1px solid rgba(90,40,0,0.14);
          box-shadow: 0 18px 45px rgba(120,60,10,0.22);
          color: #5a2d00;
          font-weight: 900;
          pointer-events: none;
          opacity: 0;
        `;
        document.body.appendChild(t);
      }

      t.textContent = msg;
      t.style.animation = "none";
      void t.offsetHeight; // reflow to restart animation
      t.style.animation = "ppToastFloat 1.25s ease forwards";
    }

    /* ------------------ Styles injection ------------------ */
    injectV2Styles() {
      const style = document.createElement("style");
      style.textContent = `
        /* Lite mode: reduce heavy blend/filters */
        .pp-lite #godRays { display: none !important; }
        .pp-lite #aurora { opacity: 0.65 !important; }
        .pp-lite #slideImg { transition: opacity 1s ease, filter 1.2s ease, transform 0s ease !important; }
        .pp-lite #slideImg.sharp { filter: blur(0px) brightness(1.06) contrast(1.18) saturate(1.08) !important; }

        /* Floating toast animation */
        @keyframes ppToastFloat {
          0%   { opacity: 0; transform: translateX(-50%) translateY(10px) scale(0.99); }
          12%  { opacity: 1; transform: translateX(-50%) translateY(0px) scale(1); }
          70%  { opacity: 1; transform: translateX(-50%) translateY(-14px) scale(1); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-28px) scale(0.99); }
        }

        @media (max-width: 768px){
          #pp-v2-controls{ left: 10px !important; bottom: 10px !important; gap: 8px !important; padding: 8px 10px !important; }
          #pp-v2-controls button{ font-size: 12px !important; padding: 7px 9px !important; }
          #pp-timeline{ bottom: 58px !important; }
        }
      `;
      document.head.appendChild(style);
    }

    defaultQuotes() {
      return [
        "Old projects feel like handwritten letters from my younger self.",
        "Refactoring code taught me I can refactor my life too.",
        "Every error message is just a mentor with bad communication skills.",
        "Your future self is quietly hoping you don’t give up today.",
        "Memories are snapshots worth backing up often.",
      ];
    }
  }

  // boot
  const engine = new PicnicSlideshowV2();
  engine.init();
  window.PP_GODMODE = engine; // optional console access
})();
