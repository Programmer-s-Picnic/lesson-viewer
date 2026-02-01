
(function(){
  "use strict";
  const esc = (s)=>String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const basePrefix = (assetBase)=> (assetBase === ".." ? "../" : "./");

  function header(site, pageId, assetBase){
    const base = basePrefix(assetBase);
    const nav = site.nav || [];
    const b = site.brand || {};
    const links = nav.map(it=>{
      const href = base + it.href;
      const active = it.id===pageId ? " is-active" : "";
      return `<a class="nav__link${active}" href="${href}">${esc(it.label)}</a>`;
    }).join("");
    return `<header class="topbar"><div class="container topbar__inner">
      <a class="brand" href="${base}index.html" aria-label="${esc(b.name||"Home")}">
        <span class="brand__mark" aria-hidden="true">${esc(b.mark||"C")}</span>
        <span class="brand__text"><span class="brand__name">${esc(b.name||"")}</span><span class="brand__tag">${esc(b.tagline||"")}</span></span>
      </a>
      <nav class="nav" aria-label="Primary navigation">
        <button class="nav__toggle" id="navToggle" aria-expanded="false" aria-controls="navMenu">
          <span class="nav__toggleBars" aria-hidden="true"></span><span class="sr-only">Menu</span>
        </button>
        <div class="nav__menu" id="navMenu">
          ${links}
          <a class="btn btn--primary nav__cta" data-wa data-wa-context="Header CTA" href="#">${esc(site.cta?.primary_label || "WhatsApp")}</a>
        </div>
      </nav>
    </div></header>`;
  }

  function fab(site){
    return `<a class="fab" href="#" data-wa data-wa-context="Floating WhatsApp" aria-label="Chat on WhatsApp">
      <span class="fab__icon" aria-hidden="true">💬</span><span class="fab__text">${esc(site.cta?.primary_label || "WhatsApp")}</span></a>`;
  }

  function footer(site, assetBase){
    const base = basePrefix(assetBase);
    const c = site.contact || {};
    return `<footer class="footer"><div class="container footer__grid">
      <div><div class="footer__brand">${esc(site.brand?.name || "Curesia")}</div>
        <div class="footer__muted">${esc(site.brand?.tagline || "")}</div>
        <div style="margin-top:10px"><span class="badge">Online + In-clinic</span></div>
      </div>
      <div><div class="footer__head">Quick Links</div>
        <a class="footer__link" href="${base}index.html">Home</a>
        <a class="footer__link" href="${base}pages/anupriya.html">Meet Anupriya</a>
        <a class="footer__link" href="${base}pages/book.html">Book a Session</a>
        <a class="footer__link" href="${base}pages/contact.html">Contact</a>
      </div>
      <div><div class="footer__head">Contact</div>
        <a class="footer__link" href="mailto:${esc(c.email||"")}">${esc(c.email||"")}</a>
        <a class="footer__link" href="#" data-wa data-wa-context="Footer CTA">WhatsApp: ${esc(c.whatsapp_display||"")}</a>
        <div class="footer__muted">Address: ${esc(c.address||"")}</div>
        <div class="footer__muted">Timings: ${esc(c.timings||"")}</div>
      </div>
    </div>
    <div class="container footer__bottom"><span class="footer__muted">© <span id="year"></span> ${esc(site.brand?.name || "Curesia")}.</span></div>
    </footer>`;
  }

  function sectionHero(sec, assetBase){
    const base = basePrefix(assetBase);
    const secondary = sec.secondaryCta?.href ? `<a class="btn btn--ghost" href="${base + sec.secondaryCta.href}">${esc(sec.secondaryCta.label)}</a>` : "";
    const meta = (sec.meta || []).map(m=>`<div class="metaItem">${esc(m)}</div>`).join("");
    const side = sec.sideCard ? `<div class="mediaCard"><div class="mediaCard__img" role="img" aria-label="Placeholder image"></div>
      <div class="mediaCard__cap"><div class="mediaCard__title">${esc(sec.sideCard.title||"")}</div>
      <div class="mediaCard__sub">${esc(sec.sideCard.sub||"")}</div>
      <a class="link" href="${base + sec.sideCard.linkHref}">${esc(sec.sideCard.linkLabel||"Learn more →")}</a></div></div>` : "";
    return `<section class="hero"><div class="container hero__grid">
      <div class="hero__copy">
        <div class="pill"><span class="dot"></span>${esc(sec.pill||"")}</div>
        <h1 class="h1">${esc(sec.h1||"")}</h1>
        <p class="lead">${esc(sec.lead||"")}</p>
        <div class="hero__actions">
          <a class="btn btn--primary" data-wa data-wa-context="${esc(sec.primaryCta?.waContext || "Hero CTA")}" href="#">${esc(sec.primaryCta?.label || "WhatsApp →")}</a>
          ${secondary}
        </div>
        <div class="hero__meta">${meta}</div>
      </div>
      <div class="hero__media">${side}</div>
    </div></section>`;
  }

  function sectionChoices(sec, assetBase){
    const base = basePrefix(assetBase);
    const cards = (sec.items || []).map(it=>`
      <a class="cardChoice" href="${base + it.href}">
        <div class="cardChoice__icon" aria-hidden="true">${esc(it.icon||"")}</div>
        <div class="cardChoice__title">${esc(it.title||"")}</div>
        <div class="cardChoice__text">${esc(it.text||"")}</div>
        <div class="cardChoice__more">Learn more →</div>
      </a>`).join("");
    return `<section class="section"><div class="container">
      <div class="sectionHead"><h2 class="h2">${esc(sec.heading||"")}</h2><p class="muted">${esc(sec.sub||"")}</p></div>
      <div class="grid4">${cards}</div></div></section>`;
  }

  function sectionMeet(sec, assetBase){
    const base = basePrefix(assetBase);
    const bullets = (sec.bullets || []).map(b=>`<li>${esc(b)}</li>`).join("");
    const primaryHref = sec.primary?.href ? base + sec.primary.href : "#";
    return `<section class="section section--soft"><div class="container split">
      <div class="split__media"><div class="portrait" role="img" aria-label="Portrait placeholder"></div></div>
      <div class="split__copy">
        <h2 class="h2">${esc(sec.heading||"")}</h2>
        <p class="lead">${esc(sec.lead||"")}</p>
        <ul class="bullets">${bullets}</ul>
        <div class="actionsRow">
          <a class="btn btn--primary" href="${primaryHref}">${esc(sec.primary?.label || "Learn more →")}</a>
          <a class="btn btn--soft" data-wa data-wa-context="${esc(sec.secondary?.waContext || "Meet CTA")}" href="#">${esc(sec.secondary?.label || "WhatsApp")}</a>
        </div>
      </div></div></section>`;
  }

  function sectionFeelLike(){
    return `<section class="section"><div class="container">
      <div class="sectionHead"><h2 class="h2">What support here feels like</h2><p class="muted">You don’t need to “prepare” or know what to say.</p></div>
      <div class="grid2">
        <div class="cardSoft"><div class="cardSoft__icon">🌱</div><div class="cardSoft__title">A calm, safe conversation</div><div class="cardSoft__text">A space to slow down and feel understood.</div></div>
        <div class="cardSoft"><div class="cardSoft__icon">🧭</div><div class="cardSoft__title">Clarity, step-by-step</div><div class="cardSoft__text">We move gently with structure, not pressure.</div></div>
        <div class="cardSoft"><div class="cardSoft__icon">🔒</div><div class="cardSoft__title">Confidential</div><div class="cardSoft__text">Your privacy is respected at every step.</div></div>
        <div class="cardSoft"><div class="cardSoft__icon">🤍</div><div class="cardSoft__title">Respectful support</div><div class="cardSoft__text">No judgement. Just understanding and care.</div></div>
      </div></div></section>`;
  }

  function sectionProof(){
    return `<section class="section"><div class="container">
      <div class="proof">
        <div class="proof__item"><div class="proof__big">Online</div><div class="proof__small">sessions available</div></div>
        <div class="proof__item"><div class="proof__big">In-clinic</div><div class="proof__small">Ranchi, Jharkhand</div></div>
        <div class="proof__item"><div class="proof__big">Confidential</div><div class="proof__small">safe space</div></div>
        <div class="proof__item"><div class="proof__big">Gentle</div><div class="proof__small">at your pace</div></div>
      </div></div></section>`;
  }

  function sectionTestimonials(testimonials){
    const items = (testimonials?.items || []).slice(0,3).map(it=>`
      <div class="quote"><div class="quote__text">“${esc(it.text||"")}”</div><div class="quote__by">— ${esc(it.by||"Anonymous")}</div></div>
    `).join("");
    return `<section class="section section--soft"><div class="container">
      <div class="sectionHead"><h2 class="h2">What people say</h2><p class="muted">Short, anonymous feedback.</p></div>
      <div class="grid3">${items}</div></div></section>`;
  }

  function sectionBooking(sec, site, assetBase){
    const base = basePrefix(assetBase);
    const bookHref = base + (site?.nav?.find(n=>n.id==="book")?.href || "pages/book.html");
    return `<section class="section"><div class="container">
      <div class="booking">
        <div class="booking__copy">
          <h2 class="h2">${esc(sec.heading || "Ready to talk?")}</h2>
          <p class="lead">${esc(sec.lead || "Start with a simple message.")}</p>
          <div class="actionsRow">
            <a class="btn btn--primary" data-wa data-wa-context="${esc(sec.waContext || "Booking Block")}" href="#">Chat on WhatsApp</a>
            <a class="btn btn--ghost" href="${bookHref}">See booking options</a>
          </div>
          <p class="muted small">Online + in-clinic sessions available.</p>
        </div>
        <div class="booking__faq">
          <div class="faq"><button class="faq__q" data-faq aria-expanded="false">Is it confidential?</button><div class="faq__a" hidden>Yes. Sessions are confidential and handled with care and respect.</div></div>
          <div class="faq"><button class="faq__q" data-faq aria-expanded="false">Online or in-clinic?</button><div class="faq__a" hidden>Both options are available.</div></div>
          <div class="faq"><button class="faq__q" data-faq aria-expanded="false">What happens after I message?</button><div class="faq__a" hidden>We’ll guide you to the next step and schedule a session.</div></div>
        </div>
      </div>
      <p class="muted small" style="margin-top:12px">${esc(site?.meta?.emergency_note || "")}</p>
    </div></section>`;
  }

  function sectionContactCards(sec, site){
    const c = site.contact || {};
    return `<section class="section section--soft"><div class="container">
      <div class="sectionHead"><h2 class="h2">${esc(sec.heading || "Reach us")}</h2><p class="muted">${esc(sec.sub || "")}</p></div>
      <div class="grid2">
        <div class="cardSoft"><div class="cardSoft__title">WhatsApp</div><div class="cardSoft__text">Fastest way to book and ask questions.</div>
          <div style="margin-top:10px"><a class="btn btn--primary" data-wa data-wa-context="Contact Card: WhatsApp" href="#">WhatsApp: ${esc(c.whatsapp_display||"")}</a></div></div>
        <div class="cardSoft"><div class="cardSoft__title">Email</div><div class="cardSoft__text">${esc(c.email||"")}</div>
          <div style="margin-top:10px"><a class="btn btn--ghost" href="mailto:${esc(c.email||"")}">Email us</a></div></div>
        <div class="cardSoft"><div class="cardSoft__title">Clinic address</div><div class="cardSoft__text">${esc(c.address||"")}</div>
          <div style="margin-top:10px"><a class="btn btn--soft" data-wa data-wa-context="Contact Card: Directions" data-wa-extra="Please share directions / map link." href="#">Ask for directions</a></div></div>
        <div class="cardSoft"><div class="cardSoft__title">Timings</div><div class="cardSoft__text">${esc(c.timings||"")}</div>
          <div style="margin-top:10px"><a class="btn btn--soft" data-wa data-wa-context="Contact Card: Availability" data-wa-extra="Please share available slots." href="#">Ask available slots</a></div></div>
      </div>
      ${sec.showMap ? `<div style="margin-top:16px"><div class="cardSoft">
        <div class="cardSoft__title">Map</div><div class="cardSoft__text">Replace “dummy” address in data/site.json to show correct map.</div>
        <div style="margin-top:12px;border-radius:16px;overflow:hidden;border:1px solid var(--border)">
          <iframe title="Map" width="100%" height="320" style="border:0" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
            src="https://www.google.com/maps?q=${encodeURIComponent(c.address||"Ranchi")}&output=embed"></iframe>
        </div></div></div>` : ""}
    </div></section>`;
  }

  function sectionAssessments(sec){
    return `<section class="section"><div class="container">
      <div class="sectionHead"><h2 class="h2">${esc(sec.heading || "Quick self-check tools")}</h2><p class="muted">${esc(sec.sub || "")}</p></div>
      <div class="grid3">
        <div class="cardChoice" style="min-height:auto"><div class="cardChoice__icon">🧪</div><div class="cardChoice__title">Anxiety mini-check</div><div class="cardChoice__text">5 questions • share result on WhatsApp.</div><div style="margin-top:10px"><button class="btn btn--primary" type="button" data-assess-open="anxiety-mini">Start →</button></div><div class="muted small" style="margin-top:10px">${esc(sec.disclaimer||"")}</div></div>
        <div class="cardChoice" style="min-height:auto"><div class="cardChoice__icon">🧪</div><div class="cardChoice__title">Stress mini-check</div><div class="cardChoice__text">5 questions • share result on WhatsApp.</div><div style="margin-top:10px"><button class="btn btn--primary" type="button" data-assess-open="stress-mini">Start →</button></div><div class="muted small" style="margin-top:10px">${esc(sec.disclaimer||"")}</div></div>
        <div class="cardChoice" style="min-height:auto"><div class="cardChoice__icon">🧪</div><div class="cardChoice__title">Mood mini-check</div><div class="cardChoice__text">5 questions • share result on WhatsApp.</div><div style="margin-top:10px"><button class="btn btn--primary" type="button" data-assess-open="mood-mini">Start →</button></div><div class="muted small" style="margin-top:10px">${esc(sec.disclaimer||"")}</div></div>
      </div></div></section>`;
  }

  function modalShell(){
    return `<div class="modalBackdrop" id="ppModalBackdrop" aria-hidden="true"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="ppModalTitle">
      <div class="modal__head"><div class="modal__title" id="ppModalTitle">Self-assessment</div><button class="modal__close" id="ppModalClose" type="button" aria-label="Close">✕</button></div>
      <div class="modal__body" id="ppModalBody"></div>
      <div class="modal__foot"><div class="scoreBox" id="ppScoreBox">Score: 0</div>
        <div class="actionsRow"><button class="btn btn--ghost" id="ppSaveBtn" type="button" disabled>Save</button><button class="btn btn--primary" id="ppShareBtn" type="button" disabled>Share on WhatsApp</button></div>
      </div></div></div><div class="toast" id="ppToast" role="status" aria-live="polite"></div>`;
  }

  function renderSections({site,page,testimonials,assetBase}){
    const secs = page.sections || [];
    return secs.map(sec=>{
      switch(sec.type){
        case "hero": return sectionHero(sec, assetBase);
        case "choices": return sectionChoices(sec, assetBase);
        case "meet": return sectionMeet(sec, assetBase);
        case "feelLike": return sectionFeelLike();
        case "proof": return sectionProof();
        case "testimonials": return sectionTestimonials(testimonials);
        case "bookingBlock": return sectionBooking(sec, site, assetBase);
        case "contactCards": return sectionContactCards(sec, site);
        case "assessments": return sectionAssessments(sec);
        default: return "";
      }
    }).join("");
  }

  function pageRender(ctx){
    const {site,page,pageId,assetBase} = ctx;
    return `${header(site,pageId,assetBase)}${fab(site)}<main>${renderSections(ctx)}</main>${footer(site,assetBase)}${modalShell()}`;
  }

  window.PP_RENDER = { page: pageRender };
})();
