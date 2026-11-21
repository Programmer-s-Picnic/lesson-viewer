"use strict";

/*
 * Clear karaoke-style spoken captions.
 *
 * Important timing for synthesized narration:
 *   slide appears -> 3 seconds -> speech -> 5 seconds -> next slide.
 *
 * The renderer is shared by preview and export, so these captions are burned
 * into the exported video as well.
 */
(() => {
  let liveSpeechWord = -1;
  let liveSpeechSlideId = "";
  let liveSpeechText = "";
  let liveSpeechUtterance = null;

  function normalizeSpeechText(text) {
    return String(text || "")
      .replaceAll("<br/>", " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function tokensFor(text) {
    const value = normalizeSpeechText(text);
    const tokens = [];
    const re = /\S+/g;
    let match;
    while ((match = re.exec(value))) {
      tokens.push({
        text: match[0],
        start: match.index,
        end: match.index + match[0].length
      });
    }
    return tokens;
  }

  function wordFromChar(text, charIndex) {
    const tokens = tokensFor(text);
    if (!tokens.length) return -1;
    const index = Math.max(0, Number(charIndex || 0));
    for (let i = 0; i < tokens.length; i++) {
      if (index >= tokens[i].start && index < tokens[i].end) return i;
      if (index < tokens[i].start) return Math.max(0, i - 1);
    }
    return tokens.length - 1;
  }

  function timingState(slide, progress, wordCount) {
    const total = Math.max(.001, Number(
      typeof slidePlaybackDuration === "function"
        ? slidePlaybackDuration(slide)
        : slide.duration || 1
    ));
    const elapsed = clamp01(progress) * total;

    if (slide?.narrationAudio && typeof isSynthesizedNarration === "function" && isSynthesizedNarration(slide)) {
      const lead = Number(narrationLeadIn(slide) || 0);
      const speechDuration = Math.max(.001, Number(slide.narrationDuration || 0));

      if (elapsed < lead) return { phase: "lead", active: -1 };

      // During live preview, follow the real audio element position. This keeps
      // word highlighting aligned even when WebM metadata was inaccurate.
      if (
        typeof narrationPlayer !== "undefined" &&
        narrationPlayer &&
        !narrationPlayer.ended &&
        Number.isFinite(narrationPlayer.currentTime)
      ) {
        const currentAudioTime = Math.max(0, Number(narrationPlayer.currentTime || 0));
        const realDuration = Math.max(
          .001,
          Number.isFinite(narrationPlayer.duration) ? narrationPlayer.duration : speechDuration
        );
        const fraction = clamp01(currentAudioTime / realDuration);
        return {
          phase: "speaking",
          active: Math.min(wordCount - 1, Math.floor(fraction * wordCount))
        };
      }

      if (elapsed >= lead + speechDuration) return { phase: "hold", active: -1 };
      const fraction = clamp01((elapsed - lead) / speechDuration);
      return {
        phase: "speaking",
        active: Math.min(wordCount - 1, Math.floor(fraction * wordCount))
      };
    }

    if (
      liveSpeechSlideId === slide?.id &&
      liveSpeechText === normalizeSpeechText(slide?.narrationText || slide?.content || "") &&
      liveSpeechWord >= 0
    ) {
      return { phase: "speaking", active: Math.min(wordCount - 1, liveSpeechWord) };
    }

    if (slide?.narrationAudio) {
      const speechDuration = Math.max(.001, Number(slide.narrationDuration || total));
      if (elapsed > speechDuration + .15) return { phase: "hold", active: -1 };
      const fraction = clamp01(elapsed / speechDuration);
      return {
        phase: "speaking",
        active: Math.min(wordCount - 1, Math.floor(fraction * wordCount))
      };
    }

    // Spoken slide before browser TTS starts: do not show a fake highlighted word.
    if (slide?.type === "spoken") {
      if (liveSpeechSlideId === slide.id) return { phase: "speaking", active: Math.max(0, liveSpeechWord) };
      return { phase: "lead", active: -1 };
    }

    return { phase: "hidden", active: -1 };
  }

  function bottomOverlayClearance(landscape) {
    try {
      const video = typeof activeOverlayVideo === "function" ? activeOverlayVideo() : null;
      if (!video) return 0;
      const settings = typeof overlaySettings === "function"
        ? overlaySettings()
        : { position: "bottom-right", size: "medium", round: true };

      if (!String(settings.position || "").startsWith("bottom")) return 0;

      const sizes = landscape
        ? { small: 180, medium: 245, large: 320 }
        : { small: 220, medium: 300, large: 390 };
      const width = sizes[settings.size] || (landscape ? 245 : 300);
      const height = settings.round ? width : Math.round(width * 9 / 16);

      // Keep the subtitle block low in both landscape and portrait.
      // A bottom camera/video overlay no longer pushes the whole caption area
      // upward. The subtitle block is centered and narrow enough to coexist
      // with the side overlay in normal use.
      return 0;
    } catch (error) {
      return 0;
    }
  }

  function chooseWindow(tokens, activeIndex, limit) {
    if (tokens.length <= limit) return { start: 0, words: tokens };

    if (activeIndex < 0) {
      return {
        start: Math.max(0, tokens.length - limit),
        words: tokens.slice(Math.max(0, tokens.length - limit))
      };
    }

    let start = Math.max(0, activeIndex - Math.floor(limit * .42));
    start = Math.min(start, tokens.length - limit);
    return { start, words: tokens.slice(start, start + limit) };
  }

  function makeLines(ctx, words, startIndex, activeIndex, maxWidth, maxLines) {
    const lines = [];
    const spaceWidth = ctx.measureText(" ").width;
    let line = [];
    let width = 0;

    words.forEach((token, localIndex) => {
      const wordWidth = ctx.measureText(token.text).width;
      const nextWidth = line.length ? width + spaceWidth + wordWidth : wordWidth;

      if (line.length && nextWidth > maxWidth) {
        lines.push(line);
        if (lines.length >= maxLines) return;
        line = [];
        width = 0;
      }

      if (lines.length < maxLines) {
        const globalIndex = startIndex + localIndex;
        line.push({
          text: token.text,
          width: wordWidth,
          active: globalIndex === activeIndex
        });
        width += (line.length > 1 ? spaceWidth : 0) + wordWidth;
      }
    });

    if (line.length && lines.length < maxLines) lines.push(line);
    return lines;
  }

  function drawKaraoke(ctx, slide, progress) {
    const text = normalizeSpeechText(slide?.narrationText || (slide?.type === "spoken" ? slide.content : ""));
    if (!slide || !text) return;

    const shouldShow =
      slide.type === "spoken" ||
      !!slide.narrationAudio ||
      liveSpeechSlideId === slide.id;
    if (!shouldShow) return;

    const tokens = tokensFor(text);
    if (!tokens.length) return;

    const stateNow = timingState(slide, progress, tokens.length);

    // Requested behavior: synthesized speech begins three seconds after the
    // slide appears. Keep the subtitle area clear during that lead-in.
    if (stateNow.phase === "lead" || stateNow.phase === "hidden") return;

    const landscape = W > H;
    const maxLines = landscape ? 2 : 3;
    const maxWords = landscape ? 13 : 11;
    const windowed = chooseWindow(tokens, stateNow.active, maxWords);

    ctx.save();

    // CRITICAL FIX: original slide/footer drawing often leaves textAlign=right.
    // Caption measurement assumes left alignment, so set it explicitly.
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.font = `800 ${landscape ? 34 : 42}px system-ui`;

    const maxTextWidth = landscape
      ? Math.min(1120, W * .62)
      : Math.min(860, W - 160);

    const lines = makeLines(
      ctx,
      windowed.words,
      windowed.start,
      stateNow.active,
      maxTextWidth,
      maxLines
    );
    if (!lines.length) {
      ctx.restore();
      return;
    }

    const lineHeight = landscape ? 52 : 62;
    const padX = landscape ? 34 : 34;
    const padTop = landscape ? 25 : 28;
    const padBottom = landscape ? 25 : 28;
    const boxWidth = maxTextWidth + padX * 2;
    const boxHeight = padTop + padBottom + lines.length * lineHeight;

    const footerHeight = landscape ? 125 : 190;
    const overlayClearance = bottomOverlayClearance(landscape);
    const lowerGap = landscape ? 34 : 42;
    const desiredBottom = H - footerHeight - overlayClearance - lowerGap;

    // Keep subtitles in the lower-middle area rather than touching content.
    const minimumY = landscape ? 420 : 930;
    const y = Math.max(minimumY, desiredBottom - boxHeight);
    const x = (W - boxWidth) / 2;

    ctx.fillStyle = "rgba(2, 22, 36, .94)";
    ctx.beginPath();
    ctx.roundRect(x, y, boxWidth, boxHeight, landscape ? 22 : 26);
    ctx.fill();

    // Thin accent edge makes the subtitle region visually deliberate.
    ctx.strokeStyle = "rgba(255,255,255,.13)";
    ctx.lineWidth = 2;
    ctx.stroke();

    lines.forEach((line, row) => {
      const spaceWidth = ctx.measureText(" ").width;
      const lineWidth =
        line.reduce((sum, item) => sum + item.width, 0) +
        spaceWidth * Math.max(0, line.length - 1);

      let cursorX = W / 2 - lineWidth / 2;
      const baseline = y + padTop + (row + 1) * lineHeight - 10;

      line.forEach((item, index) => {
        if (item.active && stateNow.phase === "speaking") {
          ctx.fillStyle = state.accentColor || "#f59e0b";
          ctx.beginPath();
          ctx.roundRect(
            cursorX - 9,
            baseline - (landscape ? 36 : 45),
            item.width + 18,
            landscape ? 46 : 56,
            10
          );
          ctx.fill();
          ctx.fillStyle = "#082f49";
        } else {
          ctx.fillStyle = "#ffffff";
        }

        ctx.fillText(item.text, cursorX, baseline);
        cursorX += item.width + (index < line.length - 1 ? spaceWidth : 0);
      });
    });

    ctx.restore();
  }

  const originalPaint = paint;
  paint = async function paintWithClearSpokenCaptions(ctx, slide, progress = 1) {
    await originalPaint(ctx, slide, progress);
    drawKaraoke(ctx, slide, progress);
  };

  // Boundary-aware speech synthesis. The project preview waits three seconds
  // before calling this function; once called, real word boundaries drive
  // highlighting whenever the browser provides them.
  // Speak one sentence/clause at a time. Web Speech only supports
  // per-utterance rate/pitch/volume, so vary these gently between phrases.
  // The controller exposes the same onend/onerror contract as an utterance.
  function speechSegments(source) {
    const parts = [];
    const re = /[^.!?;:\n]+(?:[.!?;:\n]+|$)/g;
    let match;
    while ((match = re.exec(source))) {
      const raw = match[0];
      const value = raw.trim();
      if (!value) continue;
      const leading = raw.indexOf(value);
      parts.push({ text: value, start: match.index + leading });
    }
    // Avoid a robotic pause after every short fragment.
    const joined = [];
    for (const item of parts) {
      const last = joined[joined.length - 1];
      if (last && last.text.length < 36 && last.text.length + item.text.length < 125) {
        last.text = source.slice(last.start, item.start + item.text.length).trim();
      } else {
        joined.push({ ...item });
      }
    }
    return joined.length ? joined : [{ text: source, start: 0 }];
  }

  speakText = function speakTextWithNaturalDelivery(text, voiceName, rate = 1) {
    if (!("speechSynthesis" in window)) return null;
    const sourceText = normalizeSpeechText(text);
    if (!sourceText) return null;

    speechSynthesis.cancel();
    const style = $("speechStyle")?.value || "natural";
    const profiles = {
      natural:  { pitch: 1, rate: 1, volume: .92, variance: .045, pause: 120 },
      warm:     { pitch: 1.035, rate: .94, volume: .9, variance: .035, pause: 180 },
      energetic:{ pitch: 1.075, rate: 1.06, volume: .96, variance: .065, pause: 90 },
      calm:     { pitch: .965, rate: .88, volume: .86, variance: .025, pause: 230 }
    };
    const profile = profiles[style] || profiles.natural;
    const segments = speechSegments(sourceText);
    const voice = speechSynthesis.getVoices().find(v => v.name === voiceName);
    const baseRate = Math.max(.6, Math.min(1.5, Number(rate) || 1));
    const controller = { onend: null, onerror: null, onstart: null, onboundary: null, cancel: null };
    let index = 0;
    let stopped = false;
    let pauseTimer = 0;
    let activeUtterance = null;

    liveSpeechSlideId = current()?.id || "";
    liveSpeechText = sourceText;
    liveSpeechWord = -1;

    const clear = () => {
      liveSpeechWord = -1;
      liveSpeechSlideId = "";
      liveSpeechText = "";
      liveSpeechUtterance = null;
      drawPreview(Number($("progress")?.value || 100) / 100);
    };
    const finish = (error) => {
      if (stopped) return;
      stopped = true;
      clearTimeout(pauseTimer);
      clear();
      if (error) controller.onerror?.({ error });
      else controller.onend?.({ type: "end" });
    };
    controller.cancel = () => {
      if (stopped) return;
      stopped = true;
      clearTimeout(pauseTimer);
      speechSynthesis.cancel();
      clear();
    };

    function next() {
      if (stopped) return;
      if (index >= segments.length) return finish();
      const segment = segments[index];
      const i = index++;
      const u = new SpeechSynthesisUtterance(segment.text);
      activeUtterance = u;
      liveSpeechUtterance = u;
      if (voice) { u.voice = voice; u.lang = voice.lang; }
      const punctuation = /[?!]$/.test(segment.text);
      const emphasis = punctuation || /\b(important|remember|notice|key|warning|why|how)\b/i.test(segment.text);
      const contour = Math.sin(i * 1.75) * profile.variance;
      u.pitch = Math.max(.75, Math.min(1.3, profile.pitch + contour + (emphasis ? .035 : 0)));
      u.rate = Math.max(.6, Math.min(1.5, baseRate * profile.rate * (emphasis ? .96 : 1) * (1 - contour * .25)));
      u.volume = Math.max(.45, Math.min(1, profile.volume + contour * .6 + (emphasis ? .035 : 0)));
      u.onstart = event => {
        if (stopped) return;
        liveSpeechWord = wordFromChar(sourceText, segment.start);
        controller.onstart?.(event);
        drawPreview(Number($("progress")?.value || 0) / 100);
      };
      u.onboundary = event => {
        if (stopped || !Number.isFinite(event.charIndex)) return;
        const charIndex = segment.start + event.charIndex;
        liveSpeechWord = wordFromChar(sourceText, charIndex);
        controller.onboundary?.({ ...event, charIndex });
        drawPreview(Number($("progress")?.value || 0) / 100);
      };
      u.onend = () => {
        if (stopped) return;
        const pause = i + 1 < segments.length ? profile.pause + (punctuation ? 110 : 0) : 0;
        if (pause) pauseTimer = setTimeout(next, pause);
        else next();
      };
      u.onerror = event => finish(event?.error || "synthesis failed");
      try { speechSynthesis.speak(u); }
      catch (error) { finish(error?.message || "synthesis failed"); }
    }
    next();
    return controller;
  };

  const ttsPreviewButton = $("previewTtsNarrationBtn");
  if (ttsPreviewButton) {
    ttsPreviewButton.onclick = () => {
      const slide = current();
      if (!slide) return;
      const text = $("narrationText").value.trim() || slide.narrationText || slide.content || "";
      speakText(text, $("ttsNarrationVoice").value, Number($("ttsNarrationRate").value || 1));
    };
  }

  const slideSpeechButton = $("testSpeechBtn");
  if (slideSpeechButton) {
    slideSpeechButton.onclick = () => {
      const slide = current();
      if (!slide) return;
      speakText(
        slide.narrationText || slide.content || "",
        slide.speechVoice || "",
        Number(slide.speechRate || 1)
      );
    };
  }

  window.addEventListener("beforeunload", () => {
    liveSpeechWord = -1;
    liveSpeechSlideId = "";
    liveSpeechText = "";
    liveSpeechUtterance = null;
  });
})();
