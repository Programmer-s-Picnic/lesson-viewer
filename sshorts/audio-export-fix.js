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

  function bufferRms(buffer) {
    let sum = 0;
    let count = 0;
    const stride = Math.max(1, Math.floor(buffer.length / 120000));
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < data.length; i += stride) {
        const sample = data[i] || 0;
        sum += sample * sample;
        count++;
      }
    }
    return count ? Math.sqrt(sum / count) : 0;
  }

  function totalProjectDuration() {
    return state.slides.reduce((sum, slide) => sum + Math.max(0, Number(slide.duration || 0)), 0);
  }

  function chooseWebmMime() {
    const choices = [
      "video/webm",
      "video/webm;codecs=vp8,opus",
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8",
      "video/webm;codecs=vp9"
    ];
    return choices.find(type => MediaRecorder.isTypeSupported(type)) || "";
  }

  async function buildAudioTimeline() {
    const narrationCount = state.slides.filter(slide => !!slide.narrationAudio).length;
    const hasAudio = !!musicData || narrationCount > 0;
    if (!hasAudio) return { hasAudio: false, narrationCount: 0, buffer: null };

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const OfflineAudioContextClass = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!AudioContextClass || !OfflineAudioContextClass) {
      throw new Error("This browser does not provide the audio engine required for export");
    }

    const decodeContext = new AudioContextClass();
    await decodeContext.resume();

    try {
      status("Preparing one continuous audio timeline…");
      const narrations = new Map();
      let musicBuffer = null;

      if (musicData) {
        musicBuffer = await decodeAudio(decodeContext, musicData);
        if (bufferRms(musicBuffer) < 0.00005) {
          throw new Error("Background music is silent");
        }
      }

      for (let i = 0; i < state.slides.length; i++) {
        const source = state.slides[i].narrationAudio;
        if (!source) continue;
        const buffer = await decodeAudio(decodeContext, source);
        if (bufferRms(buffer) < 0.00005) {
          throw new Error(`Narration on slide ${i + 1} contains no usable sound`);
        }
        narrations.set(i, buffer);
      }

      const sampleRate = 48000;
      const duration = Math.max(0.25, totalProjectDuration());
      const offline = new OfflineAudioContextClass(2, Math.ceil(duration * sampleRate), sampleRate);
      const master = offline.createGain();
      master.gain.value = 1;
      master.connect(offline.destination);

      if (musicBuffer) {
        const source = offline.createBufferSource();
        source.buffer = musicBuffer;
        source.loop = true;
        const gain = offline.createGain();
        gain.gain.value = Number($("musicVolume").value || 0.2);
        source.connect(gain);
        gain.connect(master);
        source.start(0);
        source.stop(duration);
      }

      let offset = 0;
      for (let i = 0; i < state.slides.length; i++) {
        const narration = narrations.get(i);
        const slideDuration = Math.max(0, Number(state.slides[i].duration || 0));
        if (narration) {
          const source = offline.createBufferSource();
          source.buffer = narration;
          const gain = offline.createGain();
          gain.gain.value = 1;
          source.connect(gain);
          gain.connect(master);
          source.start(offset);
          source.stop(Math.min(duration, offset + Math.min(narration.duration, slideDuration || narration.duration)));
        }
        offset += slideDuration;
      }

      const mixed = await offline.startRendering();
      const rms = bufferRms(mixed);
      if (!Number.isFinite(rms) || rms < 0.00005) {
        throw new Error("The complete mixed audio timeline is silent");
      }

      return { hasAudio: true, narrationCount, buffer: mixed, rms, duration };
    } finally {
      await decodeContext.close().catch(() => {});
    }
  }

  async function exportVideoWithReliableAudio() {
    stopSpeech();
    stopNarration();

    if (exporting) return status("A video export is already running.");
    if (!state.slides.length) return status("Add slides before exporting.");
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
      return status("Video export is not supported in this browser.");
    }

    const mime = chooseWebmMime();
    if (!mime) return status("This browser cannot create a WebM recording.");

    const selectedSlide = state.current;
    const videoButton = $("videoBtn");
    const preview = $("preview");
    const previewCtx = preview.getContext("2d");
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    let audioCtx = null;
    let destination = null;
    let timelineSource = null;
    let recorder = null;

    exporting = true;
    videoButton.disabled = true;
    videoButton.textContent = "Exporting…";
    cancelAnimationFrame(webcamAnimationId);
    webcamAnimationId = 0;

    try {
      await preloadProjectImages();
      const audioTimeline = await buildAudioTimeline();

      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");

      const frameCanvas = document.createElement("canvas");
      frameCanvas.width = W;
      frameCanvas.height = H;
      const frameCtx = frameCanvas.getContext("2d");

      // Paint the first frame before capture starts so the WebM never begins
      // with a blank canvas.
      await paint(frameCtx, state.slides[0], 0);
      ctx.drawImage(frameCanvas, 0, 0);

      const canvasStream = canvas.captureStream(FPS);
      const videoTrack = canvasStream.getVideoTracks()[0];
      if (!videoTrack) throw new Error("Could not create the video track");

      const tracks = [videoTrack];

      if (audioTimeline.hasAudio) {
        if (!AudioContextClass) throw new Error("Web Audio is unavailable");
        audioCtx = new AudioContextClass({ sampleRate: audioTimeline.buffer.sampleRate });
        await audioCtx.resume();
        if (audioCtx.state !== "running") throw new Error("Audio engine did not start");

        destination = audioCtx.createMediaStreamDestination();
        const audioTrack = destination.stream.getAudioTracks()[0];
        if (!audioTrack) throw new Error("Could not create the WebM audio track");
        audioTrack.enabled = true;
        tracks.push(audioTrack);

        timelineSource = audioCtx.createBufferSource();
        timelineSource.buffer = audioTimeline.buffer;
        const exportGain = audioCtx.createGain();
        exportGain.gain.value = 1;
        timelineSource.connect(exportGain);
        exportGain.connect(destination);

        // Chromium may suspend a graph that is connected only to a
        // MediaStreamDestination. A zero-volume monitor keeps the graph pulled
        // without playing duplicate sound through the speakers.
        const monitor = audioCtx.createGain();
        monitor.gain.value = 0;
        exportGain.connect(monitor);
        monitor.connect(audioCtx.destination);
      }

      const stream = new MediaStream(tracks);
      if (stream.getVideoTracks().length !== 1) throw new Error("Export stream has no video track");
      if (audioTimeline.hasAudio && stream.getAudioTracks().length !== 1) {
        throw new Error("Export stream has no audio track");
      }

      const chunks = [];
      const options = {
        mimeType: mime,
        videoBitsPerSecond: W > H ? 8000000 : 6500000
      };
      if (audioTimeline.hasAudio) options.audioBitsPerSecond = 192000;

      recorder = new MediaRecorder(stream, options);
      recorder.ondataavailable = event => event.data.size && chunks.push(event.data);

      const recorderError = new Promise((_, reject) => {
        recorder.addEventListener("error", event => reject(event.error || new Error("WebM recorder error")), { once: true });
      });

      recorder.start(250);
      await new Promise(resolve => setTimeout(resolve, 100));
      if (recorder.state !== "recording") throw new Error("WebM recorder did not start");

      if (audioTimeline.hasAudio) {
        const recorderAudioTrack = recorder.stream.getAudioTracks()[0];
        if (!recorderAudioTrack || recorderAudioTrack.readyState !== "live" || !recorderAudioTrack.enabled) {
          throw new Error("MediaRecorder does not have a live audio track");
        }
      }

      const leadInMs = 120;
      const timelineStart = performance.now() + leadInMs;
      if (timelineSource) timelineSource.start(audioCtx.currentTime + leadInMs / 1000);
      await new Promise(resolve => setTimeout(resolve, leadInMs));

      let elapsedBeforeSlide = 0;

      for (let i = 0; i < state.slides.length; i++) {
        const slide = state.slides[i];
        const slideDuration = Math.max(0.001, Number(slide.duration || 0));
        const frames = Math.max(1, Math.round(slideDuration * FPS));
        state.current = i;
        renderList();
        loadEditor();
        $("slidePosition").textContent = `Exporting slide ${i + 1} of ${state.slides.length}`;

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

          status(`Rendering slide ${i + 1}/${state.slides.length} — ${Math.round((i + frame / frames) / state.slides.length * 100)}%${slide.narrationAudio ? " — mixed narration active" : ""}`);

          const targetMs = timelineStart + (elapsedBeforeSlide + Math.min(slideDuration, (frame + 1) / FPS)) * 1000;
          const sleep = Math.max(0, targetMs - performance.now());
          await Promise.race([
            new Promise(resolve => setTimeout(resolve, sleep)),
            recorderError
          ]);
        }

        elapsedBeforeSlide += slideDuration;
      }

      // Allow the final Opus packet to be written before stopping.
      await new Promise(resolve => setTimeout(resolve, 220));
      const stopped = new Promise(resolve => recorder.addEventListener("stop", resolve, { once: true }));
      recorder.stop();
      await stopped;

      if (!chunks.length) throw new Error("The WebM recorder produced no data");

      if (timelineSource) {
        try { timelineSource.stop(); } catch (error) {}
      }
      if (audioCtx) {
        await audioCtx.close();
        audioCtx = null;
      }

      const outputMime = recorder.mimeType || mime;
      const formatName = W > H ? "fullscreen-1920x1080" : "vertical-1080x1920";
      const suffix = audioTimeline.hasAudio ? "premixed-audio" : "silent";
      download(new Blob(chunks, { type: outputMime }), `${slug(state.projectTitle)}-${formatName}-${suffix}.webm`);

      status(audioTimeline.hasAudio
        ? `Video ready with pre-mixed narration (${audioTimeline.narrationCount} narrated slide${audioTimeline.narrationCount === 1 ? "" : "s"}).`
        : `Video ready: ${W} × ${H}.`);
    } catch (error) {
      if (timelineSource) {
        try { timelineSource.stop(); } catch (stopError) {}
      }
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
