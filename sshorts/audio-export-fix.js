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
    const stride = Math.max(1, Math.floor(buffer.length / 100000));
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

  function chooseWebmMime(hasAudio) {
    if (hasAudio) {
      const audioChoices = [
        "video/webm;codecs=vp8,opus",
        "video/webm;codecs=vp9,opus",
        "video/webm"
      ];
      return audioChoices.find(type => MediaRecorder.isTypeSupported(type)) || "";
    }

    const videoChoices = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm"
    ];
    return videoChoices.find(type => MediaRecorder.isTypeSupported(type)) || "";
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

    const narrationSlides = state.slides.filter(slide => !!slide.narrationAudio).length;
    const hasAudio = !!musicData || narrationSlides > 0;
    const mime = chooseWebmMime(hasAudio);
    if (!mime) {
      return status(hasAudio
        ? "This browser cannot record WebM with an audio-capable format. Try current Chrome or Edge."
        : "No supported WebM recorder was found.");
    }

    const selectedSlide = state.current;
    const videoButton = $("videoBtn");
    const preview = $("preview");
    const previewCtx = preview.getContext("2d");
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    let audioCtx = null;
    let destination = null;
    let masterGain = null;
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
        status("Decoding narration and checking for real audio samples…");

        if (musicData) {
          musicBuffer = await decodeAudio(audioCtx, musicData);
          if (bufferRms(musicBuffer) < 0.00005) throw new Error("Background music contains no usable audio samples");
        }

        for (let i = 0; i < state.slides.length; i++) {
          const narration = state.slides[i].narrationAudio;
          if (!narration) continue;
          const buffer = await decodeAudio(audioCtx, narration);
          if (bufferRms(buffer) < 0.00005) {
            throw new Error(`Narration on slide ${i + 1} is silent. Record that narration again.`);
          }
          narrationBuffers.set(i, buffer);
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

      const canvasStream = canvas.captureStream(FPS);
      const videoTrack = canvasStream.getVideoTracks()[0];
      if (!videoTrack) throw new Error("Could not create the canvas video track");

      const combinedTracks = [videoTrack];

      if (audioCtx) {
        destination = audioCtx.createMediaStreamDestination();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = 1;
        masterGain.connect(destination);

        // Keep the Web Audio graph actively rendered in Chromium while the
        // MediaStreamDestination is being consumed by MediaRecorder.
        const monitorGain = audioCtx.createGain();
        monitorGain.gain.value = 0;
        masterGain.connect(monitorGain);
        monitorGain.connect(audioCtx.destination);

        const audioTrack = destination.stream.getAudioTracks()[0];
        if (!audioTrack) throw new Error("Could not create the narration audio track");
        audioTrack.enabled = true;
        combinedTracks.push(audioTrack);

        if (musicBuffer) {
          musicSource = audioCtx.createBufferSource();
          musicSource.buffer = musicBuffer;
          musicSource.loop = true;
          const musicGain = audioCtx.createGain();
          musicGain.gain.value = Number($("musicVolume").value || 0.2);
          musicSource.connect(musicGain);
          musicGain.connect(masterGain);
        }
      }

      // Do not mutate canvas.captureStream(). Build a new stream containing
      // exactly one video track and, when required, exactly one audio track.
      const stream = new MediaStream(combinedTracks);

      if (stream.getVideoTracks().length !== 1) throw new Error("Export stream has no video track");
      if (hasAudio && stream.getAudioTracks().length !== 1) {
        throw new Error("Export stream has no audio track; video was not exported");
      }

      const chunks = [];
      const recorderOptions = {
        mimeType: mime,
        videoBitsPerSecond: W > H ? 8000000 : 6500000
      };
      if (hasAudio) recorderOptions.audioBitsPerSecond = 192000;

      recorder = new MediaRecorder(stream, recorderOptions);

      if (hasAudio && recorder.stream.getAudioTracks().length !== 1) {
        throw new Error("MediaRecorder rejected the audio track");
      }

      recorder.ondataavailable = event => event.data.size && chunks.push(event.data);
      const recorderError = new Promise((_, reject) => {
        recorder.addEventListener("error", event => reject(event.error || new Error("WebM recorder error")), { once: true });
      });

      recorder.start(250);
      await new Promise(resolve => setTimeout(resolve, 120));
      if (recorder.state !== "recording") throw new Error("WebM recorder did not start");

      if (musicSource) musicSource.start();

      const actualMime = recorder.mimeType || mime;
      const audioTrack = stream.getAudioTracks()[0];
      if (hasAudio) {
        status(`Audio track ready (${actualMime}). Rendering ${narrationSlides} narrated slide${narrationSlides === 1 ? "" : "s"}…`);
        if (!audioTrack || audioTrack.readyState !== "live" || !audioTrack.enabled) {
          throw new Error("Narration audio track is not live");
        }
      }

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
        if (narrationBuffer && masterGain) {
          slideSource = audioCtx.createBufferSource();
          slideSource.buffer = narrationBuffer;
          const narrationGain = audioCtx.createGain();
          narrationGain.gain.value = 1;
          slideSource.connect(narrationGain);
          narrationGain.connect(masterGain);
          slideSource.start(audioCtx.currentTime + 0.03);
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

          status(`Rendering slide ${i + 1}/${state.slides.length} — ${Math.round((i + frame / frames) / state.slides.length * 100)}%${narrationBuffer ? " — narration playing into recorder" : ""}`);
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

      // Give MediaRecorder enough time to flush the final Opus packet.
      await new Promise(resolve => setTimeout(resolve, 180));
      const stopped = new Promise(resolve => recorder.addEventListener("stop", resolve, { once: true }));
      recorder.stop();
      await stopped;

      if (!chunks.length) throw new Error("The WebM recorder produced no data");

      if (audioCtx) {
        await audioCtx.close();
        audioCtx = null;
      }

      const outputMime = recorder.mimeType || mime;
      const formatName = W > H ? "fullscreen-1920x1080" : "vertical-1080x1920";
      const suffix = hasAudio ? "audio-track-verified" : "silent";
      download(new Blob(chunks, { type: outputMime }), `${slug(state.projectTitle)}-${formatName}-${suffix}.webm`);
      status(hasAudio
        ? `Video ready with one verified audio track: ${outputMime}.`
        : `Video ready: ${W} × ${H}.`);
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
