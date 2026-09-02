"use strict";

(() => {
  const LEAD_IN_SECONDS = 3;
  const HOLD_SECONDS = 5;
  const AUDIO_DRAIN_MS = 900;

  const autoEnabled = () => !!$("autoTtsExport")?.checked;

  function chooseMime() {
    return [
      "video/webm;codecs=vp8,opus",
      "video/webm;codecs=vp9,opus",
      "video/webm",
      "video/webm;codecs=vp8",
      "video/webm;codecs=vp9"
    ].find(type => MediaRecorder.isTypeSupported(type)) || "";
  }

  function narrationFor(slide) {
    return String(slide?.narrationText || slide?.content || slide?.heading || "")
      .replaceAll("<br/>", " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function voiceFor(slide) {
    return slide?.speechVoice || $("ttsNarrationVoice")?.value || "";
  }

  function rateFor(slide) {
    return Math.max(.6, Math.min(1.5,
      Number(slide?.speechRate || 0) ||
      Number($("ttsNarrationRate")?.value || 1) || 1
    ));
  }

  function stopBrowserSpeech() {
    try { speechSynthesis.cancel(); } catch (error) {}
  }

  function renderTargetProgress(phase, fraction) {
    fraction = clamp01(fraction);
    if (phase === "lead") return .18 * fraction;
    if (phase === "speech") return .18 + .62 * fraction;
    return .8 + .2 * fraction;
  }

  async function renderForDuration(frameCtx, outputCtx, previewCtx, slide, ms, phase) {
    const start = performance.now();
    const duration = Math.max(1, ms);
    while (true) {
      const fraction = clamp01((performance.now() - start) / duration);
      const progress = renderTargetProgress(phase, fraction);

      frameCtx.clearRect(0, 0, W, H);
      await paint(frameCtx, slide, progress);
      outputCtx.clearRect(0, 0, W, H);
      outputCtx.drawImage(frameCtx.canvas, 0, 0);
      previewCtx.clearRect(0, 0, W, H);
      previewCtx.drawImage(frameCtx.canvas, 0, 0);
      $("progress").value = progress * 100;

      if (fraction >= 1) return;
      await new Promise(resolve => setTimeout(resolve, 1000 / FPS));
    }
  }

  function speakAndResolve(text, voiceName, rate) {
    return new Promise(resolve => {
      const utterance = speakText(text, voiceName, rate);
      if (!utterance) {
        resolve({ ok: false, reason: "speech synthesis unavailable" });
        return;
      }

      let done = false;
      const settle = result => {
        if (done) return;
        done = true;
        resolve(result);
      };

      const priorEnd = utterance.onend;
      const priorError = utterance.onerror;

      utterance.onend = event => {
        try { priorEnd?.(event); } catch (error) {}
        settle({ ok: true });
      };
      utterance.onerror = event => {
        try { priorError?.(event); } catch (error) {}
        settle({ ok: false, reason: event?.error || "speech synthesis error" });
      };
    });
  }

  async function renderWhileSpeaking(frameCtx, outputCtx, previewCtx, slide, speechPromise) {
    let result = null;
    speechPromise.then(value => { result = value; });
    const start = performance.now();

    while (!result) {
      const elapsed = (performance.now() - start) / 1000;
      const approach = Math.min(.985, 1 - Math.exp(-elapsed / 4.5));
      const progress = .18 + .62 * approach;

      frameCtx.clearRect(0, 0, W, H);
      await paint(frameCtx, slide, progress);
      outputCtx.clearRect(0, 0, W, H);
      outputCtx.drawImage(frameCtx.canvas, 0, 0);
      previewCtx.clearRect(0, 0, W, H);
      previewCtx.drawImage(frameCtx.canvas, 0, 0);
      $("progress").value = progress * 100;

      await new Promise(resolve => setTimeout(resolve, 1000 / FPS));
    }

    return result;
  }

  async function automaticTtsExport() {
    stopNarration();
    stopBrowserSpeech();

    if (exporting) return status("A video export is already running.");
    if (!state.slides.length) return status("Add slides before exporting.");
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
      return status("Video export is not supported in this browser.");
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      return status("Automatic TTS export requires system-audio screen sharing.");
    }

    const mime = chooseMime();
    if (!mime) return status("This browser cannot create a WebM recording.");

    const selectedSlide = state.current;
    const videoButton = $("videoBtn");
    const preview = $("preview");
    const previewCtx = preview.getContext("2d");

    let shareStream = null;
    let audioCtx = null;
    let recorder = null;
    let musicSource = null;

    exporting = true;
    videoButton.disabled = true;
    videoButton.textContent = "Starting automatic TTS export…";
    cancelAnimationFrame(previewAnimationId);
    previewAnimationId = 0;

    try {
      status("Choose Entire Screen and enable Share system audio once.");

      shareStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "monitor" },
        audio: true,
        systemAudio: "include",
        monitorTypeSurfaces: "include",
        preferCurrentTab: false,
        selfBrowserSurface: "include"
      });

      const systemTracks = shareStream.getAudioTracks();
      if (!systemTracks.length) {
        throw new Error("No system audio shared. Choose Entire Screen and enable Share system audio.");
      }

      const displayTrack = shareStream.getVideoTracks()[0];
      const surface = displayTrack?.getSettings?.().displaySurface || "";
      if (surface && surface !== "monitor") {
        throw new Error("Choose Entire Screen, not This Tab or Window.");
      }
      displayTrack?.stop();

      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) throw new Error("Web Audio is unavailable.");

      audioCtx = new AC();
      await audioCtx.resume();

      const destination = audioCtx.createMediaStreamDestination();
      const systemStream = new MediaStream(systemTracks);
      const systemSource = audioCtx.createMediaStreamSource(systemStream);
      const systemGain = audioCtx.createGain();
      systemGain.gain.value = 1;
      systemSource.connect(systemGain);
      systemGain.connect(destination);

      if (musicData) {
        const musicBuffer = await decodeAudio(audioCtx, musicData);
        musicSource = audioCtx.createBufferSource();
        const musicGain = audioCtx.createGain();
        musicSource.buffer = musicBuffer;
        musicSource.loop = true;
        musicGain.gain.value = Number($("musicVolume")?.value || .2);
        musicSource.connect(musicGain);
        musicGain.connect(destination);
      }

      await preloadProjectImages();

      const outputCanvas = document.createElement("canvas");
      outputCanvas.width = W;
      outputCanvas.height = H;
      const outputCtx = outputCanvas.getContext("2d");

      const frameCanvas = document.createElement("canvas");
      frameCanvas.width = W;
      frameCanvas.height = H;
      const frameCtx = frameCanvas.getContext("2d");

      await paint(frameCtx, state.slides[0], 0);
      outputCtx.drawImage(frameCanvas, 0, 0);

      const canvasStream = outputCanvas.captureStream(FPS);
      const videoTrack = canvasStream.getVideoTracks()[0];
      const audioTrack = destination.stream.getAudioTracks()[0];

      if (!videoTrack || !audioTrack) {
        throw new Error("Could not build the export media stream.");
      }

      const exportStream = new MediaStream([videoTrack, audioTrack]);
      const chunks = [];

      recorder = new MediaRecorder(exportStream, {
        mimeType: mime,
        videoBitsPerSecond: W > H ? 8000000 : 6500000,
        audioBitsPerSecond: 192000
      });

      recorder.ondataavailable = event => {
        if (event.data?.size) chunks.push(event.data);
      };

      const recorderError = new Promise((_, reject) => {
        recorder.addEventListener(
          "error",
          event => reject(event.error || new Error("WebM recorder error")),
          { once: true }
        );
      });

      recorder.start(250);
      if (musicSource) musicSource.start(audioCtx.currentTime + .15);
      await Promise.race([
        new Promise(resolve => setTimeout(resolve, 350)),
        recorderError
      ]);

      const overlay = activeOverlayVideo();
      if (overlay && overlay.paused) {
        try { await overlay.play(); } catch (error) {}
      }

      for (let i = 0; i < state.slides.length; i++) {
        const slide = state.slides[i];
        const narration = narrationFor(slide);

        state.current = i;
        renderList();
        loadEditor();
        $("slidePosition").textContent = `Automatic TTS export — slide ${i + 1} of ${state.slides.length}`;

        status(`Slide ${i + 1}/${state.slides.length}: 3-second lead-in…`);
        await Promise.race([
          renderForDuration(
            frameCtx, outputCtx, previewCtx, slide,
            LEAD_IN_SECONDS * 1000, "lead"
          ),
          recorderError
        ]);

        if (narration) {
          status(`Slide ${i + 1}/${state.slides.length}: synthesizing narration…`);

          const speechPromise = speakAndResolve(
            narration,
            voiceFor(slide),
            rateFor(slide)
          );

          const result = await Promise.race([
            renderWhileSpeaking(
              frameCtx, outputCtx, previewCtx, slide, speechPromise
            ),
            recorderError
          ]);

          if (!result?.ok) {
            throw new Error(
              `Speech synthesis failed on slide ${i + 1}: ${result?.reason || "unknown error"}`
            );
          }

          // Protect the final audible word/phoneme after Web Speech onend.
          await new Promise(resolve => setTimeout(resolve, AUDIO_DRAIN_MS));
        }

        status(`Slide ${i + 1}/${state.slides.length}: speech complete — 5-second hold…`);
        await Promise.race([
          renderForDuration(
            frameCtx, outputCtx, previewCtx, slide,
            HOLD_SECONDS * 1000, "hold"
          ),
          recorderError
        ]);

        stopBrowserSpeech();
      }

      await new Promise(resolve => setTimeout(resolve, 300));

      const stopped = new Promise(resolve =>
        recorder.addEventListener("stop", resolve, { once: true })
      );
      recorder.stop();
      await stopped;

      if (musicSource) {
        try { musicSource.stop(); } catch (error) {}
      }

      if (!chunks.length) throw new Error("The recorder produced no WebM data.");

      const formatName = W > H
        ? "fullscreen-1920x1080"
        : "vertical-1080x1920";

      download(
        new Blob(chunks, { type: recorder.mimeType || mime }),
        `${slug(state.projectTitle)}-${formatName}-automatic-tts.webm`
      );

      status(`Automatic TTS export complete: ${state.slides.length} slides.`);
    } catch (error) {
      stopBrowserSpeech();
      if (recorder?.state === "recording") {
        try { recorder.stop(); } catch (stopError) {}
      }
      if (musicSource) {
        try { musicSource.stop(); } catch (stopError) {}
      }
      status(`Automatic TTS export stopped: ${error.message || "unexpected error"}`);
    } finally {
      stopBrowserSpeech();
      shareStream?.getTracks().forEach(track => {
        try { track.stop(); } catch (error) {}
      });
      if (audioCtx) {
        try { await audioCtx.close(); } catch (error) {}
      }

      exporting = false;
      videoButton.disabled = false;
      setCanvasFormat();
      state.current = Math.max(0, Math.min(selectedSlide, state.slides.length - 1));
      $("progress").value = 100;
      renderList();
      loadEditor();
      await drawPreview(1);
      if (activeOverlayVideo()) startOverlayPreviewLoop();
    }
  }

  const existingManualExport = $("videoBtn")?.onclick;

  if ($("videoBtn")) {
    $("videoBtn").onclick = () => {
      if (autoEnabled()) return automaticTtsExport();
      if (typeof existingManualExport === "function") return existingManualExport();
      if (typeof exportVideo === "function") return exportVideo();
    };
  }

  window.automaticTtsExport = automaticTtsExport;
})();
