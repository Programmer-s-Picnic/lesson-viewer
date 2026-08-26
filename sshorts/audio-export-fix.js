"use strict";

(() => {
  function dataUrlToArrayBuffer(value) {
    if (!value) throw new Error("Missing audio data");
    if (!value.startsWith("data:")) {
      return fetch(value).then(response => {
        if (!response.ok) throw new Error("Audio file could not be loaded");
        return response.arrayBuffer();
      });
    }

    const comma = value.indexOf(",");
    if (comma < 0) throw new Error("Invalid audio data URL");
    const meta = value.slice(0, comma);
    const payload = value.slice(comma + 1);
    let bytes;

    if (/;base64/i.test(meta)) {
      const binary = atob(payload);
      bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    } else {
      const text = decodeURIComponent(payload);
      bytes = new TextEncoder().encode(text);
    }
    return Promise.resolve(bytes.buffer);
  }

  async function decodeAudio(context, source) {
    const bytes = await dataUrlToArrayBuffer(source);
    return context.decodeAudioData(bytes.slice(0));
  }

  function chooseWebmMime(hasAudio) {
    const withAudio = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm;codecs=av1,opus"
    ];
    const videoOnly = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm"
    ];
    const choices = hasAudio ? [...withAudio, ...videoOnly] : videoOnly;
    return choices.find(type => MediaRecorder.isTypeSupported(type)) || "";
  }

  function safeStop(source) {
    if (!source) return;
    try { source.stop(); } catch (error) {}
    try { source.disconnect(); } catch (error) {}
  }

  async function exportVideoWithReliableAudio() {
    stopSpeech();
    stopNarration();

    if (exporting) return status("A video export is already running.");
    if (!state.slides.length) return status("Add slides before exporting.");
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
      return status("Video export is not supported in this browser.");
    }

    const hasAudio = !!musicData || state.slides.some(slide => !!slide.narrationAudio);
    const mime = chooseWebmMime(hasAudio);
    if (!mime) return status("No supported WebM recorder was found.");

    const selectedSlide = state.current;
    const videoButton = $("videoBtn");
    const preview = $("preview");
    const previewCtx = preview.getContext("2d");
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    let audioCtx = null;
    let destination = null;
    let musicSource = null;
    let recorder = null;
    let slideSource = null;

    exporting = true;
    videoButton.disabled = true;
    videoButton.textContent = "Exporting…";
    cancelAnimationFrame(webcamAnimationId);
    webcamAnimationId = 0;

    try {
      if (hasAudio) {
        if (!AudioContextClass) throw new Error("Web Audio is unavailable in this browser");
        audioCtx = new AudioContextClass();
        await audioCtx.resume();
        if (audioCtx.state !== "running") throw new Error("Audio engine could not start");
      }

      await preloadProjectImages();

      const narrationBuffers = new Map();
      let musicBuffer = null;
      if (audioCtx) {
        status("Preparing audio for WebM export…");
        if (musicData) musicBuffer = await decodeAudio(audioCtx, musicData);
        for (let i = 0; i < state.slides.length; i++) {
          const narration = state.slides[i].narrationAudio;
          if (narration) narrationBuffers.set(i, await decodeAudio(audioCtx, narration));
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");

      const frameCanvas = document.createElement("canvas");
      frameCanvas.width = W;
      frameCanvas.height = H;
      const frameCtx = frameCanvas.getContext("2d");

      const stream = canvas.captureStream(FPS);

      if (audioCtx) {
        destination = audioCtx.createMediaStreamDestination();
        const audioTrack = destination.stream.getAudioTracks()[0];
        if (!audioTrack) throw new Error("Could not create the WebM audio track");
        stream.addTrack(audioTrack);

        if (musicBuffer) {
          musicSource = audioCtx.createBufferSource();
          musicSource.buffer = musicBuffer;
          musicSource.loop = true;
          const musicGain = audioCtx.createGain();
          musicGain.gain.value = Number($("musicVolume").value || 0.2);
          musicSource.connect(musicGain);
          musicGain.connect(destination);
        }
      }

      const chunks = [];
      recorder = new MediaRecorder(stream, {
        mimeType: mime,
        videoBitsPerSecond: W > H ? 8000000 : 6500000,
        audioBitsPerSecond: hasAudio ? 160000 : undefined
      });
      recorder.ondataavailable = event => event.data.size && chunks.push(event.data);

      const recorderError = new Promise((_, reject) => {
        recorder.addEventListener("error", event => reject(event.error || new Error("WebM recorder error")), { once: true });
      });

      recorder.start(500);
      if (musicSource) musicSource.start();
      status(`Rendering WebM with ${hasAudio ? "Opus audio" : "video only"}…`);

      for (let i = 0; i < state.slides.length; i++) {
        const slide = state.slides[i];
        const frames = Math.max(1, Math.round(slide.duration * FPS));
        state.current = i;
        renderList();
        loadEditor();
        $("slidePosition").textContent = `Exporting slide ${i + 1} of ${state.slides.length}`;

        safeStop(slideSource);
        slideSource = null;
        const narrationBuffer = narrationBuffers.get(i);
        if (narrationBuffer && destination) {
          slideSource = audioCtx.createBufferSource();
          slideSource.buffer = narrationBuffer;
          const narrationGain = audioCtx.createGain();
          narrationGain.gain.value = 1;
          slideSource.connect(narrationGain);
          narrationGain.connect(destination);
          slideSource.start();
        }

        for (let frame = 0; frame < frames; frame++) {
          if (recorder.state !== "recording") throw new Error("WebM recorder stopped unexpectedly");
          const progress = frames > 1 ? frame / (frames - 1) : 1;
          frameCtx.clearRect(0, 0, W, H);
          await paint(frameCtx, slide, progress);

          ctx.clearRect(0, 0, W, H);
          ctx.drawImage(frameCanvas, 0, 0);
          previewCtx.clearRect(0, 0, W, H);
          previewCtx.drawImage(frameCanvas, 0, 0);
          $("progress").value = progress * 100;

          status(`Rendering slide ${i + 1}/${state.slides.length} — ${Math.round((i + frame / frames) / state.slides.length * 100)}% — audio embedded`);
          await Promise.race([
            new Promise(resolve => setTimeout(resolve, 1000 / FPS)),
            recorderError
          ]);
        }

        safeStop(slideSource);
        slideSource = null;
      }

      safeStop(musicSource);
      musicSource = null;

      const stopped = new Promise(resolve => recorder.addEventListener("stop", resolve, { once: true }));
      recorder.stop();
      await stopped;

      if (!chunks.length) throw new Error("The WebM recorder produced no data");

      if (audioCtx) {
        await audioCtx.close();
        audioCtx = null;
      }

      const formatName = W > H ? "fullscreen-1920x1080" : "vertical-1080x1920";
      const suffix = hasAudio ? "with-audio" : "silent";
      download(new Blob(chunks, { type: mime }), `${slug(state.projectTitle)}-${formatName}-${suffix}.webm`);
      status(`Video ready: ${W} × ${H}${hasAudio ? " with embedded Opus audio" : ""}.`);
    } catch (error) {
      safeStop(slideSource);
      safeStop(musicSource);
      if (recorder?.state === "recording") {
        try { recorder.stop(); } catch (stopError) {}
      }
      if (audioCtx) await audioCtx.close().catch(() => {});
      status(`Video export stopped: ${error.message || "unexpected audio export error"}`);
    } finally {
      exporting = false;
      videoButton.disabled = false;
      setExportFormat();
      state.current = Math.max(0, Math.min(selectedSlide, state.slides.length - 1));
      $("progress").value = 0;
      renderList();
      loadEditor();
      await drawPreview(1);
      if (webcamStream) startWebcamPreviewLoop();
    }
  }

  const button = $("videoBtn");
  if (button) button.onclick = exportVideoWithReliableAudio;
  window.exportVideoWithReliableAudio = exportVideoWithReliableAudio;
})();
