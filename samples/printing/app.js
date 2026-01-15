(() => {
  const PHONE_MAIN = "91930788055";
  const PHONE_ALT  = "919793888066";
  const EMAIL = "vnsprinting2022@gmail.com";

  // THEME_SELECTOR_VNS
  const THEME_KEY = "vns_theme";
  const root = document.documentElement;
  const themeSelect = document.getElementById("themeSelect");
  const themeSelectMobile = document.getElementById("themeSelectMobile");
  const themes = ["saffron", "midnight", "mint", "rose"];

  function applyTheme(t) {
    const theme = themes.includes(t) ? t : "saffron";
    root.setAttribute("data-theme", theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch {}
    if (themeSelect) themeSelect.value = theme;
    if (themeSelectMobile) themeSelectMobile.value = theme;
  }

  function loadTheme() {
    let saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch {}
    applyTheme(saved || root.getAttribute("data-theme") || "saffron");
  }

  if (themeSelect) themeSelect.addEventListener("change", () => applyTheme(themeSelect.value));
  if (themeSelectMobile) themeSelectMobile.addEventListener("change", () => applyTheme(themeSelectMobile.value));
  loadTheme();


  const navToggle = document.getElementById("navToggle");
  const drawer = document.getElementById("drawer");
  const drawerClose = document.getElementById("drawerClose");
  const drawerBackdrop = document.getElementById("drawerBackdrop");
  const navLinks = Array.from(document.querySelectorAll(".nav__link"));
  const drawerLinks = Array.from(document.querySelectorAll(".drawer__link"));

  function openDrawer() {
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    navToggle.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  }

  function closeDrawer() {
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    navToggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }

  if (navToggle) navToggle.addEventListener("click", openDrawer);
  if (drawerClose) drawerClose.addEventListener("click", closeDrawer);
  if (drawerBackdrop) drawerBackdrop.addEventListener("click", closeDrawer);
  drawerLinks.forEach(a => a.addEventListener("click", closeDrawer));

  // Active link highlighting using IntersectionObserver
  const sectionIds = ["about", "services", "largeformat", "branding", "pricing", "gallery", "faq", "contact"];
  const sections = sectionIds.map(id => document.getElementById(id)).filter(Boolean);

  const linkByHash = new Map();
  navLinks.forEach(a => linkByHash.set(a.getAttribute("href"), a));

  function setActive(hash) {
    navLinks.forEach(a => a.classList.remove("is-active"));
    const link = linkByHash.get(hash);
    if (link) link.classList.add("is-active");
  }

  const observer = new IntersectionObserver((entries) => {
    const visible = entries
      .filter(e => e.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (visible?.target?.id) setActive(`#${visible.target.id}`);
  }, {
    root: null,
    threshold: [0.12, 0.2, 0.3, 0.4, 0.5, 0.6],
    rootMargin: "-20% 0px -60% 0px"
  });

  sections.forEach(sec => observer.observe(sec));

  // Build WhatsApp link
  function waLink(message, phone = PHONE_MAIN) {
    const text = encodeURIComponent(message);
    return `https://wa.me/${phone}?text=${text}`;
  }

  function buildMessage({ name, phone, service, details } = {}) {
    const safe = (v) => (v || "").toString().trim();
    const n = safe(name) || "—";
    const p = safe(phone) || "—";
    const s = safe(service) || "—";
    const d = safe(details) || "—";
    return (
      `Hello VNS Printing,\n\n` +
      `I want a quote for: ${s}\n\n` +
      `Name: ${n}\n` +
      `Phone: ${p}\n\n` +
      `Details:\n${d}\n\n` +
      `Please share price and delivery timeline.\n` +
      `Thank you.`
    );
  }

  // WhatsApp buttons
  const whatsFab = document.getElementById("whatsFab");
  const heroWhats = document.getElementById("heroWhats");
  const printWhats = document.getElementById("printWhats");
  const pricingWhats = document.getElementById("pricingWhats");
  const contactWhats = document.getElementById("contactWhats");

  const quickMsg = `Hello VNS Printing,\n\nI want a quote.\nPlease guide me on size, material, and price.\n\nThank you.`;

  [whatsFab, heroWhats, printWhats, pricingWhats, contactWhats].forEach(el => {
    if (!el) return;
    el.href = waLink(quickMsg);
    el.target = "_blank";
    el.rel = "noopener";
  });

  // Pricing "Get quote" buttons prefill dropdown
  const serviceSelect = document.getElementById("serviceSelect");
  document.querySelectorAll("[data-prefill]").forEach(btn => {
    btn.addEventListener("click", () => {
      const pref = btn.getAttribute("data-prefill");
      if (serviceSelect && pref) {
        // Try to match existing option; else set to "Other"
        const opts = Array.from(serviceSelect.options).map(o => o.textContent.trim());
        const idx = opts.findIndex(x => x.toLowerCase() === pref.toLowerCase());
        if (idx >= 0) serviceSelect.selectedIndex = idx;
        else serviceSelect.value = "Other";
      }
    });
  });

  // Tabs: Email vs WhatsApp
  const tabEmail = document.getElementById("tabEmail");
  const tabWhats = document.getElementById("tabWhats");
  let mode = "email";

  function setMode(next) {
    mode = next;
    if (tabEmail && tabWhats) {
      tabEmail.classList.toggle("is-active", mode === "email");
      tabWhats.classList.toggle("is-active", mode === "whatsapp");
      tabEmail.setAttribute("aria-selected", String(mode === "email"));
      tabWhats.setAttribute("aria-selected", String(mode === "whatsapp"));
    }
    hintText(`Mode: ${mode === "email" ? "Email" : "WhatsApp"} (your message is always shown below).`);
  }

  if (tabEmail) tabEmail.addEventListener("click", () => setMode("email"));
  if (tabWhats) tabWhats.addEventListener("click", () => setMode("whatsapp"));

  // Quote form: mailto OR WhatsApp with structured message
  const form = document.getElementById("quoteForm");
  const hint = document.getElementById("formHint");
  const msgPreview = document.getElementById("msgPreview");
  const copyBtn = document.getElementById("copyMsg");

  function hintText(t) { if (hint) hint.textContent = t || ""; }

  function currentData() {
    if (!form) return {};
    const data = new FormData(form);
    return {
      name: (data.get("name") || "").toString().trim(),
      phone: (data.get("phone") || "").toString().trim(),
      service: (data.get("service") || "").toString().trim(),
      details: (data.get("details") || "").toString().trim(),
    };
  }

  function refreshPreview() {
    const d = currentData();
    const msg = buildMessage(d);
    if (msgPreview) msgPreview.value = msg;
    return msg;
  }

  if (form) {
    // live preview
    form.addEventListener("input", () => refreshPreview());
    refreshPreview();

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const d = currentData();
      const msg = buildMessage(d);

      // Light validation
      if (!d.name || !d.phone || !d.service || !d.details) {
        hintText("Please fill all fields (name, phone, service, details).");
        return;
      }

      if (mode === "whatsapp") {
        window.open(waLink(msg), "_blank", "noopener");
        hintText("Opening WhatsApp with your pre-filled message…");
        return;
      }

      // Email mode
      const subject = encodeURIComponent(`Quote Request — ${d.service} — ${d.name}`);
      const body = encodeURIComponent(msg.replace(/\n/g, "\n"));
      window.location.href = `mailto:${EMAIL}?subject=${subject}&body=${body}`;
      hintText("Opening your email app…");
    });
  }

  // Copy message
  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      const msg = refreshPreview();
      try {
        await navigator.clipboard.writeText(msg);
        hintText("Message copied. Now paste into WhatsApp or email.");
      } catch {
        // fallback
        if (msgPreview) {
          msgPreview.focus();
          msgPreview.select();
          document.execCommand("copy");
          hintText("Message selected. If not copied automatically, long-press and copy.");
        }
      }
    });
  }

  // Lightbox gallery
  const lightbox = document.getElementById("lightbox");
  const lbImg = document.getElementById("lbImg");
  const lbClose = document.getElementById("lbClose");
  const lbBackdrop = document.getElementById("lbBackdrop");

  function openLB(src) {
    if (!lightbox || !lbImg) return;
    lbImg.src = src;
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function closeLB() {
    if (!lightbox) return;
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (lbImg) lbImg.src = "";
  }

  document.querySelectorAll("[data-lightbox]").forEach(btn => {
    btn.addEventListener("click", () => {
      const src = btn.getAttribute("data-lightbox");
      if (src) openLB(src);
    });
  });

  if (lbClose) lbClose.addEventListener("click", closeLB);
  if (lbBackdrop) lbBackdrop.addEventListener("click", closeLB);

  // Esc closes drawer/lightbox
  window.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (drawer?.classList.contains("is-open")) closeDrawer();
    if (lightbox?.classList.contains("is-open")) closeLB();
  });

  // Keep preview fresh for quick WhatsApp links
  // Provide context-aware WhatsApp for specific buttons
  function attachWA(el, serviceName) {
    if (!el) return;
    el.addEventListener("click", (e) => {
      // If user already typed something, use it. Else use a service prefill.
      const d = currentData();
      const msg = (d?.name || d?.phone || d?.details)
        ? buildMessage(d)
        : buildMessage({ service: serviceName || "Quote", details: "Please share size/material options and price.", name: "", phone: "" });
      el.href = waLink(msg);
    });
  }
  attachWA(heroWhats, "General Quote");
  attachWA(printWhats, "Digital Printing");
  attachWA(pricingWhats, "Pricing Request");
  attachWA(contactWhats, "General Quote");
  attachWA(whatsFab, "General Quote");
})();