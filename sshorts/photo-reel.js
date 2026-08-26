"use strict";

(() => {
  const RECOMMENDED_PHOTOS = 10;
  const MAX_PHOTOS = 100;
  const PHOTO_DEFAULT_SECONDS = 5;

  const entranceOptions = [
    ["fade", "Fade in"],
    ["slide", "Slide in from right"],
    ["slide-left", "Slide in from left"],
    ["slide-top", "Slide in from top"],
    ["slide-bottom", "Slide in from bottom"],
    ["zoom", "Zoom in"],
    ["zoom-out", "Zoom out into place"],
    ["rise", "Rise and settle"],
    ["drop", "Drop and settle"],
    ["rotate", "Rotate in"],
    ["rotate-reverse", "Rotate in reverse"],
    ["diagonal-tl", "Diagonal from top-left"],
    ["diagonal-br", "Diagonal from bottom-right"],
    ["flip-x", "Flip horizontal"],
    ["flip-y", "Flip vertical"],
    ["reveal", "Diagonal reveal"],
    ["wipe-right", "Wipe in from left"],
    ["wipe-down", "Wipe in from top"],
    ["pop", "Pop in"],
    ["none", "None"]
  ];

  const exitOptions = [
    ["fade", "Fade out"],
    ["slide-left", "Slide out left"],
    ["slide-right", "Slide out right"],
    ["slide-top", "Slide out top"],
    ["slide-bottom", "Slide out bottom"],
    ["zoom", "Zoom away"],
    ["zoom-in", "Zoom forward"],
    ["rotate", "Spin out"],
    ["rotate-reverse", "Reverse spin out"],
    ["diagonal-tl", "Diagonal out top-left"],
    ["diagonal-br", "Diagonal out bottom-right"],
    ["wipe-left", "Wipe out left"],
    ["wipe-right", "Wipe out right"],
    ["wipe-up", "Wipe out up"],
    ["wipe-down", "Wipe out down"],
    ["shrink", "Shrink away"],
    ["none", "None"]
  ];

  const motionOptions = [
    ["none", "Still"],
    ["ken-in", "Slow zoom in"],
    ["ken-out", "Slow zoom out"],
    ["pan-left", "Slow pan left"],
    ["pan-right", "Slow pan right"],
    ["pan-up", "Slow pan up"],
    ["pan-down", "Slow pan down"],
    ["drift", "Gentle cinematic drift"],
    ["float", "Soft floating motion"]
  ];

  const presets = {
    cinematic: {
      entrances: ["fade", "zoom", "zoom-out", "rise", "diagonal-br"],
      exits: ["fade", "slide-left", "slide-right", "zoom", "shrink"],
      motions: ["ken-in", "ken-out", "pan-left", "pan-right", "drift"]
    },
    slides: {
      entrances: ["slide", "slide-left", "slide-top", "slide-bottom", "diagonal-tl", "diagonal-br"],
      exits: ["slide-left", "slide-right", "slide-top", "slide-bottom", "diagonal-tl", "diagonal-br"],
      motions: ["pan-left", "pan-right", "pan-up", "pan-down"]
    },
    dynamic: {
      entrances: entranceOptions.map(item => item[0]).filter(value => value !== "none"),
      exits: exitOptions.map(item => item[0]).filter(value => value !== "none"),
      motions: motionOptions.map(item => item[0]).filter(value => value !== "none")
    },
    gentle: {
      entrances: ["fade", "zoom", "rise", "wipe-right"],
      exits: ["fade", "slide-left", "shrink"],
      motions: ["ken-in", "ken-out", "drift", "float"]
    }
  };

  let activeExit = "none";
  let activeMotion = "none";

  const $photo = id => document.getElementById(id);
  const randomFrom = list => list[Math.floor(Math.random() * list.length)];
  const clamp01 = value => Math.max(0, Math.min(1, value));
  const easeOut = t => 1 - Math.pow(1 - clamp01(t), 3);
  const easeInOut = t => {
    t = clamp01(t);
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  function optionsHtml(options) {
    return options.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
  }

  function cleanCaption(name) {
    return String(name || "Photo")
      .replace(/\.[^.]+$/, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, char => char.toUpperCase())
      .slice(0, 70);
  }

  function formatTime(seconds) {
    const total = Math.max(0, Math.round(seconds));
    const minutes = Math.floor(total / 60);
    const remainder = total % 60;
    return minutes ? `${minutes}m ${remainder}s` : `${remainder}s`;
  }

  async function photoData(file, largeSet = false) {
    if (!file) throw new Error("Missing picture");
    try {
      if ("createImageBitmap" in window) {
        const bitmap = await createImageBitmap(file);
        const maxDimension = largeSet ? 1440 : 1920;
        const ratio = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
        const width = Math.max(1, Math.round(bitmap.width * ratio));
        const height = Math.max(1, Math.round(bitmap.height * ratio));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        context.drawImage(bitmap, 0, 0, width, height);
        bitmap.close?.();
        return canvas.toDataURL("image/jpeg", largeSet ? 0.82 : 0.9);
      }
    } catch (error) {}

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function applyPresetToSlide(slide, presetName, index = 0) {
    const preset = presets[presetName] || presets.cinematic;
    slide.transition = randomFrom(preset.entrances);
    slide.exitTransition = randomFrom(preset.exits);
    slide.imageMotion = randomFrom(preset.motions);

    if (slide.transition === "slide" && slide.exitTransition === "slide-right") {
      slide.exitTransition = "slide-left";
    }
    if (slide.transition === "slide-left" && slide.exitTransition === "slide-left") {
      slide.exitTransition = "slide-right";
    }
    if (index % 2 && slide.imageMotion === "pan-left") slide.imageMotion = "pan-right";
  }

  function addPhotoUi() {
    const templateButton = $photo("useTemplateBtn");
    if (!templateButton || $photo("photoReelBox")) return;

    const box = document.createElement("section");
    box.id = "photoReelBox";
    box.className = "photo-reel-box";
    box.innerHTML = `
      <div class="photo-reel-head">
        <div>
          <strong>Photo Reel</strong>
          <small>Recommended: ${RECOMMENDED_PHOTOS} pictures · Maximum: ${MAX_PHOTOS}</small>
        </div>
        <span class="photo-count-badge">10 recommended · 100 max</span>
      </div>
      <label class="photo-picker">Select pictures
        <input id="photoReelInput" type="file" accept="image/*" multiple>
      </label>
      <div class="photo-reel-grid">
        <label>Seconds each
          <input id="photoReelSeconds" type="number" min="1" max="15" value="${PHOTO_DEFAULT_SECONDS}">
        </label>
        <label>Picture fit
          <select id="photoReelFit">
            <option value="cover" selected>Cover</option>
            <option value="contain">Contain</option>
          </select>
        </label>
      </div>
      <label>Animation style
        <select id="photoReelPreset">
          <option value="cinematic" selected>Cinematic mix</option>
          <option value="slides">Slide in / slide out</option>
          <option value="gentle">Gentle</option>
          <option value="dynamic">Dynamic mix</option>
        </select>
      </label>
      <label class="photo-check"><input id="photoFilenameCaption" type="checkbox" checked> Use picture filenames as captions</label>
      <div class="photo-reel-actions">
        <button type="button" id="randomizePhotoAnimationsBtn" class="secondary">Randomize photo animations</button>
      </div>
      <p id="photoReelStatus" class="help">Choose up to 100 pictures. Ten is recommended for a short reel; larger sets are also supported.</p>
    `;

    templateButton.insertAdjacentElement("afterend", box);
    $photo("photoReelInput").addEventListener("change", createPhotoReel);
    $photo("randomizePhotoAnimationsBtn").addEventListener("click", randomizePhotoAnimations);
  }

  function addEditorControls() {
    const imageFields = $photo("imageFields");
    if (!imageFields || $photo("photoAnimationFields")) return;

    const controls = document.createElement("div");
    controls.id = "photoAnimationFields";
    controls.className = "photo-animation-fields";
    controls.innerHTML = `
      <div class="two">
        <label>Picture motion
          <select id="imageMotion">${optionsHtml(motionOptions)}</select>
        </label>
        <label>Exit animation
          <select id="exitTransition">${optionsHtml(exitOptions)}</select>
        </label>
      </div>
      <p class="help">Entrance uses the Transition control below. Picture motion runs through the slide; Exit animation controls how it leaves.</p>
    `;
    imageFields.appendChild(controls);

    $photo("imageMotion").addEventListener("input", () => {
      const slide = current();
      if (!slide || slide.type !== "image") return;
      slide.imageMotion = $photo("imageMotion").value;
      saveLocal();
      drawPreview(Number($photo("progress")?.value || 100) / 100);
    });

    $photo("exitTransition").addEventListener("input", () => {
      const slide = current();
      if (!slide || slide.type !== "image") return;
      slide.exitTransition = $photo("exitTransition").value;
      saveLocal();
      drawPreview(Number($photo("progress")?.value || 100) / 100);
    });
  }

  function extendTransitionSelect() {
    const select = $photo("transition");
    if (!select || select.dataset.photoExtended === "1") return;
    select.dataset.photoExtended = "1";
    const existing = new Set([...select.options].map(option => option.value));
    entranceOptions.forEach(([value, label]) => {
      if (existing.has(value)) return;
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      select.appendChild(option);
    });
  }

  async function createPhotoReel(event) {
    const input = event.currentTarget;
    const selected = [...(input.files || [])].filter(file => file.type.startsWith("image/"));
    if (!selected.length) return;

    const statusNode = $photo("photoReelStatus");
    const files = selected.slice(0, MAX_PHOTOS);
    const seconds = Math.max(1, Math.min(15, Number($photo("photoReelSeconds").value || PHOTO_DEFAULT_SECONDS)));
    const estimatedSeconds = files.length * seconds;

    if (selected.length > MAX_PHOTOS) {
      statusNode.textContent = `${selected.length} pictures selected. Only the first ${MAX_PHOTOS} can be used.`;
      alert(`Maximum Photo Reel size is ${MAX_PHOTOS} pictures. The first ${MAX_PHOTOS} pictures will be used.`);
    }

    if (files.length > RECOMMENDED_PHOTOS) {
      const proceed = confirm(
        `${files.length} pictures selected.\n\n` +
        `Recommended for a short reel: ${RECOMMENDED_PHOTOS}\n` +
        `Maximum allowed: ${MAX_PHOTOS}\n` +
        `Estimated duration: ${formatTime(estimatedSeconds)}\n\n` +
        `Continue with all ${files.length} pictures?`
      );
      if (!proceed) {
        input.value = "";
        statusNode.textContent = `Photo selection cancelled. ${RECOMMENDED_PHOTOS} pictures are recommended.`;
        return;
      }
    }

    if (state.slides.length && !confirm(`Replace the current ${state.slides.length} slide${state.slides.length === 1 ? "" : "s"} with a ${files.length}-picture Photo Reel?`)) {
      input.value = "";
      return;
    }

    const fit = $photo("photoReelFit").value || "cover";
    const preset = $photo("photoReelPreset").value || "cinematic";
    const captions = $photo("photoFilenameCaption").checked;
    const largeSet = files.length > 20;

    input.disabled = true;
    statusNode.textContent = `Preparing ${files.length} picture${files.length === 1 ? "" : "s"}…`;

    try {
      const slides = [];
      for (let i = 0; i < files.length; i++) {
        statusNode.textContent = `Preparing picture ${i + 1} of ${files.length}…`;
        const slide = makeSlide("image", "Photo", "");
        slide.heading = captions ? cleanCaption(files[i].name) : "";
        slide.content = "";
        slide.narrationText = slide.heading;
        slide.duration = seconds;
        slide.imageFit = fit;
        slide.image = await photoData(files[i], largeSet);
        slide.photoReel = true;
        applyPresetToSlide(slide, preset, i);
        slides.push(slide);
      }

      state.slides = slides;
      state.current = 0;
      if (($photo("projectTitle").value || "").trim() === "Python in 30 Seconds") {
        state.projectTitle = "Photo Reel";
        $photo("projectTitle").value = "Photo Reel";
      }
      $photo("defaultDuration").value = seconds;

      renderAll();
      const recommendation = slides.length > RECOMMENDED_PHOTOS ? ` Recommended is ${RECOMMENDED_PHOTOS}, but ${slides.length} is supported.` : "";
      statusNode.textContent = `${slides.length} photo slides created.${recommendation}`;
      status(`Photo Reel ready: ${slides.length} pictures × ${seconds}s = ${formatTime(slides.length * seconds)}.`);
    } catch (error) {
      statusNode.textContent = `Could not create the Photo Reel: ${error.message || "picture loading failed"}.`;
    } finally {
      input.disabled = false;
      input.value = "";
    }
  }

  function randomizePhotoAnimations() {
    const imageSlides = state.slides.filter(slide => slide.type === "image");
    if (!imageSlides.length) return status("Create or add image slides first.");
    const preset = $photo("photoReelPreset")?.value || "cinematic";
    imageSlides.forEach((slide, index) => applyPresetToSlide(slide, preset, index));
    renderAll();
    status(`Randomized entrance, picture motion and exit for ${imageSlides.length} photo slide${imageSlides.length === 1 ? "" : "s"}.`);
  }

  function centreTransform(ctx, scaleX, scaleY, rotation = 0, translateX = 0, translateY = 0) {
    ctx.translate(translateX, translateY);
    ctx.translate(W / 2, H / 2);
    if (rotation) ctx.rotate(rotation);
    ctx.scale(scaleX, scaleY);
    ctx.translate(-W / 2, -H / 2);
  }

  function applyContinuousMotion(ctx, motion, progress) {
    const p = clamp01(progress);
    switch (motion) {
      case "ken-in": centreTransform(ctx, 1 + p * 0.07, 1 + p * 0.07); break;
      case "ken-out": centreTransform(ctx, 1.07 - p * 0.07, 1.07 - p * 0.07); break;
      case "pan-left": centreTransform(ctx, 1.035, 1.035, 0, 55 - p * 110, 0); break;
      case "pan-right": centreTransform(ctx, 1.035, 1.035, 0, -55 + p * 110, 0); break;
      case "pan-up": centreTransform(ctx, 1.035, 1.035, 0, 0, 55 - p * 110); break;
      case "pan-down": centreTransform(ctx, 1.035, 1.035, 0, 0, -55 + p * 110); break;
      case "drift": centreTransform(ctx, 1.025 + p * 0.025, 1.025 + p * 0.025, 0, 22 * Math.sin(p * Math.PI * 1.5), -18 * Math.cos(p * Math.PI)); break;
      case "float": centreTransform(ctx, 1.02, 1.02, 0, 14 * Math.sin(p * Math.PI * 2), 18 * Math.sin(p * Math.PI)); break;
    }
  }

  function applyIn(ctx, transition, amount) {
    const e = easeOut(amount);
    switch (transition) {
      case "fade": ctx.globalAlpha *= Math.max(0.01, e); break;
      case "slide": ctx.translate((1 - e) * W, 0); break;
      case "slide-left": ctx.translate(-(1 - e) * W, 0); break;
      case "slide-top": ctx.translate(0, -(1 - e) * H); break;
      case "slide-bottom": ctx.translate(0, (1 - e) * H); break;
      case "zoom": centreTransform(ctx, 0.76 + 0.24 * e, 0.76 + 0.24 * e); break;
      case "zoom-out": centreTransform(ctx, 1.28 - 0.28 * e, 1.28 - 0.28 * e); break;
      case "rise": centreTransform(ctx, 1, 1, 0, 0, (1 - e) * H * 0.28); break;
      case "drop": centreTransform(ctx, 1, 1, 0, 0, -(1 - e) * H * 0.28); break;
      case "rotate": centreTransform(ctx, 0.86 + 0.14 * e, 0.86 + 0.14 * e, (1 - e) * -0.16); break;
      case "rotate-reverse": centreTransform(ctx, 0.86 + 0.14 * e, 0.86 + 0.14 * e, (1 - e) * 0.16); break;
      case "diagonal-tl": ctx.translate(-(1 - e) * W * 0.75, -(1 - e) * H * 0.45); break;
      case "diagonal-br": ctx.translate((1 - e) * W * 0.75, (1 - e) * H * 0.45); break;
      case "flip-x": centreTransform(ctx, Math.max(0.04, e), 1); break;
      case "flip-y": centreTransform(ctx, 1, Math.max(0.04, e)); break;
      case "reveal":
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W * e, 0); ctx.lineTo(Math.min(W, W * e + H * 0.35), H); ctx.lineTo(0, H); ctx.closePath(); ctx.clip();
        break;
      case "wipe-right": ctx.beginPath(); ctx.rect(0, 0, W * e, H); ctx.clip(); break;
      case "wipe-down": ctx.beginPath(); ctx.rect(0, 0, W, H * e); ctx.clip(); break;
      case "pop": {
        const overshoot = e < 0.8 ? 0.72 + e * 0.42 : 1.056 - (e - 0.8) * 0.28;
        centreTransform(ctx, overshoot, overshoot);
        ctx.globalAlpha *= Math.max(0.05, e);
        break;
      }
      case "none": break;
      default: ctx.globalAlpha *= Math.max(0.01, e);
    }
  }

  function applyOut(ctx, transition, amount) {
    if (!transition || transition === "none" || amount <= 0) return;
    const e = easeInOut(amount);
    switch (transition) {
      case "fade": ctx.globalAlpha *= Math.max(0.01, 1 - e); break;
      case "slide-left": ctx.translate(-e * W, 0); break;
      case "slide-right": ctx.translate(e * W, 0); break;
      case "slide-top": ctx.translate(0, -e * H); break;
      case "slide-bottom": ctx.translate(0, e * H); break;
      case "zoom": centreTransform(ctx, 1 - e * 0.72, 1 - e * 0.72); ctx.globalAlpha *= 1 - e * 0.7; break;
      case "zoom-in": centreTransform(ctx, 1 + e * 0.55, 1 + e * 0.55); ctx.globalAlpha *= 1 - e; break;
      case "rotate": centreTransform(ctx, 1 - e * 0.45, 1 - e * 0.45, e * 0.38); ctx.globalAlpha *= 1 - e * 0.75; break;
      case "rotate-reverse": centreTransform(ctx, 1 - e * 0.45, 1 - e * 0.45, -e * 0.38); ctx.globalAlpha *= 1 - e * 0.75; break;
      case "diagonal-tl": ctx.translate(-e * W * 0.8, -e * H * 0.55); break;
      case "diagonal-br": ctx.translate(e * W * 0.8, e * H * 0.55); break;
      case "wipe-left": ctx.beginPath(); ctx.rect(e * W, 0, W * (1 - e), H); ctx.clip(); break;
      case "wipe-right": ctx.beginPath(); ctx.rect(0, 0, W * (1 - e), H); ctx.clip(); break;
      case "wipe-up": ctx.beginPath(); ctx.rect(0, e * H, W, H * (1 - e)); ctx.clip(); break;
      case "wipe-down": ctx.beginPath(); ctx.rect(0, 0, W, H * (1 - e)); ctx.clip(); break;
      case "shrink": centreTransform(ctx, 1 - e * 0.82, 1 - e * 0.82); ctx.globalAlpha *= 1 - e; break;
    }
  }

  function enhancedApplyEntrance(ctx, transition, progress) {
    const entranceAmount = clamp01(progress / 0.18);
    const exitAmount = clamp01((progress - 0.80) / 0.20);
    applyContinuousMotion(ctx, activeMotion, progress);
    applyIn(ctx, transition || "fade", entranceAmount);
    applyOut(ctx, activeExit, exitAmount);
    return entranceAmount;
  }

  function hookRendering() {
    if (typeof applyEntrance !== "function" || typeof paint !== "function") return;
    applyEntrance = enhancedApplyEntrance;

    const originalPaint = paint;
    paint = async function photoAwarePaint(ctx, slide, progress = 1) {
      activeExit = slide?.type === "image" ? (slide.exitTransition || "fade") : "none";
      activeMotion = slide?.type === "image" ? (slide.imageMotion || "none") : "none";
      return originalPaint(ctx, slide, progress);
    };

    if (typeof paintLandscape === "function") {
      const originalLandscape = paintLandscape;
      paintLandscape = async function photoAwareLandscape(ctx, slide, progress = 1) {
        activeExit = slide?.type === "image" ? (slide.exitTransition || "fade") : "none";
        activeMotion = slide?.type === "image" ? (slide.imageMotion || "none") : "none";
        return originalLandscape(ctx, slide, progress);
      };
    }
  }

  function hookEditor() {
    if (typeof loadEditor !== "function") return;
    const originalLoadEditor = loadEditor;
    loadEditor = function photoAwareLoadEditor() {
      const result = originalLoadEditor();
      const slide = current();
      const motion = $photo("imageMotion");
      const exit = $photo("exitTransition");
      if (motion) motion.value = slide?.imageMotion || "none";
      if (exit) exit.value = slide?.exitTransition || (slide?.type === "image" ? "fade" : "none");
      return result;
    };
  }

  function addStyles() {
    if ($photo("photoReelStyles")) return;
    const style = document.createElement("style");
    style.id = "photoReelStyles";
    style.textContent = `
      .photo-reel-box{margin:16px 0 4px;padding:14px;border:2px solid #c4b5fd;border-radius:16px;background:linear-gradient(145deg,#faf5ff,#eff6ff)}
      .photo-reel-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
      .photo-reel-head strong{display:block;color:#5b21b6;font-size:16px}.photo-reel-head small{display:block;color:#64748b;margin-top:2px}
      .photo-count-badge{background:#5b21b6;color:#fff;border-radius:999px;padding:5px 9px;font-size:11px;font-weight:800;white-space:nowrap}
      .photo-picker{display:block;padding:10px;border:1px dashed #7c3aed;border-radius:12px;background:#fff;color:#4c1d95;font-weight:800}
      .photo-picker input{margin-top:7px}.photo-reel-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
      .photo-check{display:flex!important;align-items:center;gap:8px;margin-top:10px!important;font-weight:700!important}.photo-check input{width:auto!important;margin:0!important}
      .photo-reel-actions{margin-top:10px}.photo-reel-actions button{width:100%}.photo-animation-fields{margin-top:10px;padding-top:10px;border-top:1px dashed #cbd5e1}
      @media(max-width:520px){.photo-reel-grid{grid-template-columns:1fr}.photo-reel-head{align-items:flex-start;flex-direction:column}}
    `;
    document.head.appendChild(style);
  }

  addStyles();
  addPhotoUi();
  addEditorControls();
  extendTransitionSelect();
  hookRendering();
  hookEditor();
  try { loadEditor(); } catch (error) {}
})();