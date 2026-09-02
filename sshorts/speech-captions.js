"use strict";

/*
 * Karaoke-style narration captions for EduShorts Maker.
 *
 * - Spoken words are visible while narration is active.
 * - The current word is highlighted.
 * - Browser speechSynthesis uses real word-boundary events when available.
 * - Recorded narration, including recorded synthesized speech, is highlighted
 *   from the audio/slide timing during preview and export.
 */

(() => {
  let liveSpeechWord = -1;
  let liveSpeechSlideId = "";
  let liveSpeechText = "";
  let liveSpeechUtterance = null;

  function tokensFor(text) {
    const value = String(text || "").replaceAll("<br/>", " ").replace(/\s+/g, " ").trim();
    if (!value) return [];

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

  function approximateWord(slide, progress, wordCount) {
    if (!wordCount) return -1;

    const slideDuration = Math.max(0.001, Number(slide.duration || 1));
    const spokenDuration = Math.max(
      0.001,
      Number(slide.narrationDuration || slideDuration)
    );
    const elapsed = clamp01(progress) * slideDuration;

    // Keep the words visible after speech has ended, but stop highlighting.
    if (slide.narrationAudio && elapsed > spokenDuration + 0.15) return -1;

    const fraction = clamp01(elapsed / spokenDuration);
    return Math.min(wordCount - 1, Math.floor(fraction * wordCount));
  }

  function activeWordFor(slide, progress, text, wordCount) {
    if (
      slide &&
      liveSpeechSlideId === slide.id &&
      liveSpeechText === String(text || "") &&
      liveSpeechWord >= 0
    ) {
      return Math.min(wordCount - 1, liveSpeechWord);
    }

    return approximateWord(slide, progress, wordCount);
  }

  function captionShouldShow(slide, text) {
    if (!slide || !String(text || "").trim()) return false;

    return (
      slide.type === "spoken" ||
      !!slide.narrationAudio ||
      liveSpeechSlideId === slide.id
    );
  }

  function overlayBottomClearance(landscape) {
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
      return height + (landscape ? 45 : 60);
    } catch (error) {
      return 0;
    }
  }

  function chooseVisibleWords(tokens, activeIndex, maxWords) {
    if (tokens.length <= maxWords) return { start: 0, words: tokens };

    let start;
    if (activeIndex < 0) {
      start = Math.max(0, tokens.length - maxWords);
    } else {
      start = Math.max(0, activeIndex - Math.floor(maxWords * 0.42));
      start = Math.min(start, tokens.length - maxWords);
    }
    return { start, words: tokens.slice(start, start + maxWords) };
  }

  function layoutCaptionLines(ctx, visible, startIndex, activeIndex, maxWidth) {
    const lines = [];
    let line = [];
    let lineWidth = 0;
    const space = ctx.measureText(" ").width;

    visible.forEach((token, localIndex) => {
      const globalIndex = startIndex + localIndex;
      const width = ctx.measureText(token.text).width;
      const extra = line.length ? space + width : width;

      if (line.length && lineWidth + extra > maxWidth) {
        lines.push(line);
        line = [];
        lineWidth = 0;
      }

      line.push({
        text: token.text,
        width,
        globalIndex,
        active: globalIndex === activeIndex
      });
      lineWidth += line.length > 1 ? space + width : width;
    });

    if (line.length) lines.push(line);
    return lines.slice(0, 3);
  }

  function drawNarrationKaraoke(ctx, slide, progress) {
    const text = String(slide?.narrationText || (slide?.type === "spoken" ? slide.content : "") || "");
    if (!captionShouldShow(slide, text)) return;

    const tokens = tokensFor(text);
    if (!tokens.length) return;

    const landscape = W > H;
    const activeIndex = activeWordFor(slide, progress, text, tokens.length);
    const maxWords = landscape ? 14 : 11;
    const selection = chooseVisibleWords(tokens, activeIndex, maxWords);

    ctx.save();
    ctx.font = `800 ${landscape ? 32 : 40}px system-ui`;
    ctx.textBaseline = "alphabetic";

    const maxWidth = landscape ? Math.min(W - 320, 1300) : Math.min(W - 120, 900);
    const lines = layoutCaptionLines(
      ctx,
      selection.words,
      selection.start,
      activeIndex,
      maxWidth
    );
    if (!lines.length) {
      ctx.restore();
      return;
    }

    const lineHeight = landscape ? 48 : 58;
    const padX = landscape ? 28 : 30;
    const padY = landscape ? 22 : 26;
    const boxHeight = padY * 2 + lines.length * lineHeight;
    const footerHeight = landscape ? 125 : 190;
    const clearOverlay = overlayBottomClearance(landscape);
    const bottom = H - footerHeight - (landscape ? 24 : 28) - clearOverlay;
    const y = Math.max(landscape ? 185 : 330, bottom - boxHeight);
    const boxWidth = maxWidth + padX * 2;
    const x = (W - boxWidth) / 2;

    // Strong contrast so captions remain readable over photographs and code.
    ctx.fillStyle = "rgba(3, 24, 39, 0.92)";
    ctx.beginPath();
    ctx.roundRect(x, y, boxWidth, boxHeight, landscape ? 20 : 24);
    ctx.fill();

    lines.forEach((line, row) => {
      const space = ctx.measureText(" ").width;
      const totalWidth =
        line.reduce((sum, item) => sum + item.width, 0) +
        space * Math.max(0, line.length - 1);

      let cursorX = W / 2 - totalWidth / 2;
      const baseline = y + padY + (row + 1) * lineHeight - (landscape ? 9 : 10);

      line.forEach((item, index) => {
        if (item.active) {
          ctx.fillStyle = state.accentColor || "#f59e0b";
          ctx.beginPath();
          ctx.roundRect(
            cursorX - 8,
            baseline - (landscape ? 34 : 42),
            item.width + 16,
            landscape ? 43 : 52,
            9
          );
          ctx.fill();
          ctx.fillStyle = "#082f49";
        } else {
          ctx.fillStyle = "#ffffff";
        }

        ctx.fillText(item.text, cursorX, baseline);
        cursorX += item.width + (index < line.length - 1 ? space : 0);
      });
    });

    ctx.restore();
  }

  // Wrap the existing renderer. Because export uses the same paint() function,
  // the captions and highlighted words are burned into exported WebM frames too.
  const originalPaint = paint;
  paint = async function paintWithNarrationCaptions(ctx, slide, progress = 1) {
    await originalPaint(ctx, slide, progress);
    drawNarrationKaraoke(ctx, slide, progress);
  };

  // Replace live browser speech synthesis with a boundary-aware version.
  // Browsers that expose onboundary give exact word movement; browsers that
  // don't still get the progress-based fallback in drawNarrationKaraoke().
  speakText = function speakTextWithHighlight(text, voiceName, rate = 1) {
    if (!("speechSynthesis" in window)) return null;

    speechSynthesis.cancel();

    const sourceText = String(text || "").trim();
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
        const p = Number($("progress")?.value || 0) / 100;
        drawPreview(p);
      }
    };

    utterance.onstart = () => {
      liveSpeechWord = Math.max(0, liveSpeechWord);
      const p = Number($("progress")?.value || 0) / 100;
      drawPreview(p);
    };

    const finish = () => {
      liveSpeechWord = -1;
      liveSpeechSlideId = "";
      liveSpeechText = "";
      liveSpeechUtterance = null;
      const p = Number($("progress")?.value || 100) / 100;
      drawPreview(p);
    };

    utterance.onend = finish;
    utterance.onerror = finish;

    speechSynthesis.speak(utterance);
    return utterance;
  };

  // Make manual speech-synthesis preview use the boundary-aware implementation.
  const ttsPreviewButton = $("previewTtsNarrationBtn");
  if (ttsPreviewButton) {
    ttsPreviewButton.onclick = () => {
      const slide = current();
      if (!slide) return;
      const text = $("narrationText").value.trim() || slide.narrationText || slide.content || "";
      speakText(
        text,
        $("ttsNarrationVoice").value,
        Number($("ttsNarrationRate").value || 1)
      );
    };
  }

  // Ensure the normal "Test this slide" button also uses highlighted captions.
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

  // Stop live-word state if the browser speech engine is cancelled elsewhere.
  window.addEventListener("beforeunload", () => {
    liveSpeechWord = -1;
    liveSpeechSlideId = "";
    liveSpeechText = "";
    liveSpeechUtterance = null;
  });
})();
