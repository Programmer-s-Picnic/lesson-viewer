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

      // Move captions above a bottom camera/video overlay, with breathing room.
      return height + (landscape ? 55 : 70);
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
  speakText = function speakTextWithHighlight(text, voiceName, rate = 1) {
    if (!("speechSynthesis" in window)) return null;

    speechSynthesis.cancel();

    const sourceText = normalizeSpeechText(text);
    if (!sourceText) return null;

    const utterance = new SpeechSynthesisUtterance(sourceText);
    const voice = speechSynthesis.getVoices().find(v => v.name === voiceName);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }
    utterance.rate = Number(rate || 1);

    liveSpeechUtterance = utterance;
    liveSpeechSlideId = current()?.id || "";
    liveSpeechText = sourceText;
    liveSpeechWord = 0;

    utterance.onboundary = event => {
      if (typeof event.charIndex === "number") {
        liveSpeechWord = wordFromChar(sourceText, event.charIndex);
        drawPreview(Number($("progress")?.value || 0) / 100);
      }
    };

    utterance.onstart = () => {
      liveSpeechWord = Math.max(0, liveSpeechWord);
      drawPreview(Number($("progress")?.value || 0) / 100);
    };

    const finish = () => {
      liveSpeechWord = -1;
      liveSpeechSlideId = "";
      liveSpeechText = "";
      liveSpeechUtterance = null;
      drawPreview(Number($("progress")?.value || 100) / 100);
    };

    utterance.onend = finish;
    utterance.onerror = finish;
    speechSynthesis.speak(utterance);
    return utterance;
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
