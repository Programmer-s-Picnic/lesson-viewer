"use strict";

(() => {
  const SETTINGS_KEY = "edushorts-tts-recorder-settings-v2";
  let capture = null;

  const el = id => document.getElementById(id);
  const sayStatus = message => {
    if (typeof status === "function") status(message);
    else if (el("status")) el("status").textContent = message;
  };

  function settings() {
    try {
      return { voice: "", rate: 1, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") };
    } catch (error) {
      return { voice: "", rate: 1 };
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({
        voice: el("ttsNarrationVoice")?.value || "",
        rate: Number(el("ttsNarrationRate")?.value || 1)
      }));
    } catch (error) {}
  }

  function textForNarration() {
    const typed = el("narrationText")?.value?.trim();
    if (typed) return typed;
    try {
      return current()?.narrationText?.trim() || current()?.content?.trim() || "";
    } catch (error) {
      return "";
    }
  }

  function chosenVoice() {
    const name = el("ttsNarrationVoice")?.value || "";
    return speechSynthesis.getVoices().find(v => v.name === name) || null;
  }

  function makeUtterance(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = Number(el("ttsNarrationRate")?.value || 1);
    const voice = chosenVoice();
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }
    return utterance;
  }

  function loadVoices() {
    const select = el("ttsNarrationVoice");
    if (!select || !("speechSynthesis" in window)) return;

    const saved = settings();
    const wanted = select.value || saved.voice || "";
    const voices = speechSynthesis.getVoices();
    select.innerHTML = '<option value="">Browser default</option>';

    voices.forEach(voice => {
      const option = document.createElement("option");
      option.value = voice.name;
      option.textContent = `${voice.name} (${voice.lang})${voice.default ? " — default" : ""}`;
      select.appendChild(option);
    });

    if ([...select.options].some(option => option.value === wanted)) select.value = wanted;
  }

  function stopSpeech() {
    if ("speechSynthesis" in window) speechSynthesis.cancel();
  }

  function previewSpeech() {
    const text = textForNarration();
    if (!text) return sayStatus("Enter narration text first.");
    if (!("speechSynthesis" in window)) return sayStatus("Speech synthesis is unavailable in this browser.");

    saveSettings();
    stopSpeech();
    const utterance = makeUtterance(text);
    utterance.onstart = () => sayStatus("Playing synthesized narration…");
    utterance.onend = () => sayStatus("Synthesized narration preview finished.");
    utterance.onerror = () => sayStatus("The selected synthesized voice could not be played.");
    speechSynthesis.speak(utterance);
  }

  function bestMime() {
    if (!window.MediaRecorder) return "";
    return [
      "audio/webm;codecs=opus",
      "audio/webm",
      "video/webm;codecs=opus",
      "video/webm"
    ].find(type => MediaRecorder.isTypeSupported(type)) || "";
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function writeAscii(view, offset, text) {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  }

  function rms(buffer) {
    let total = 0;
    let count = 0;
    const stride = Math.max(1, Math.floor(buffer.length / 120000));
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < data.length; i += stride) {
        const sample = data[i] || 0;
        total += sample * sample;
        count++;
      }
    }
    return count ? Math.sqrt(total / count) : 0;
  }

  function toWav(buffer) {
    const channels = Math.max(1, Math.min(2, buffer.numberOfChannels));
    const sampleRate = buffer.sampleRate;
    const frames = buffer.length;
    const blockAlign = channels * 2;
    const dataBytes = frames * blockAlign;
    const output = new ArrayBuffer(44 + dataBytes);
    const view = new DataView(output);

    writeAscii(view, 0, "RIFF");
    view.setUint32(4, 36 + dataBytes, true);
    writeAscii(view, 8, "WAVE");
    writeAscii(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    writeAscii(view, 36, "data");
    view.setUint32(40, dataBytes, true);

    const channelData = [];
    for (let channel = 0; channel < channels; channel++) {
      channelData.push(buffer.getChannelData(Math.min(channel, buffer.numberOfChannels - 1)));
    }

    let offset = 44;
    for (let i = 0; i < frames; i++) {
      for (let channel = 0; channel < channels; channel++) {
        const sample = Math.max(-1, Math.min(1, channelData[channel][i] || 0));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
        offset += 2;
      }
    }

    return new Blob([output], { type: "audio/wav" });
  }

  async function capturedAudioToWav(blob) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error("Web Audio is unavailable");

    const context = new AudioContextClass();
    try {
      await context.resume();
      const bytes = await blob.arrayBuffer();
      const decoded = await context.decodeAudioData(bytes.slice(0));
      if (rms(decoded) < 0.0005) throw new Error("system audio is silent");
      return toWav(decoded);
    } finally {
      await context.close().catch(() => {});
    }
  }

  function resetButton() {
    const button = el("recordTtsNarrationBtn");
    if (!button) return;
    button.disabled = false;
    button.classList.remove("recording");
    button.textContent = "◆ Record synthesized speech";
  }

  function cleanup() {
    if (capture?.stream) {
      try { capture.stream.getTracks().forEach(track => track.stop()); } catch (error) {}
    }
    capture = null;
    resetButton();
  }

  async function recordSpeech() {
    const text = textForNarration();
    if (!text) return sayStatus("Enter narration text first.");
    if (!("speechSynthesis" in window)) return sayStatus("Speech synthesis is unavailable in this browser.");
    if (!navigator.mediaDevices?.getDisplayMedia || !window.MediaRecorder) {
      return sayStatus("System-audio recording is unavailable in this browser. Use desktop Chrome or Edge.");
    }
    if (capture) return;

    saveSettings();
    stopSpeech();

    const button = el("recordTtsNarrationBtn");
    button.disabled = true;
    button.classList.add("recording");
    button.textContent = "Choose Entire Screen…";

    let stream;
    try {
      sayStatus("IMPORTANT: choose Entire Screen, then enable Share system audio. Do not choose This Tab or Window.");

      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "monitor" },
        audio: true,
        systemAudio: "include",
        monitorTypeSurfaces: "include",
        preferCurrentTab: false,
        selfBrowserSurface: "include",
        surfaceSwitching: "exclude"
      });

      const videoTrack = stream.getVideoTracks()[0];
      const displaySurface = videoTrack?.getSettings?.().displaySurface || "";

      if (displaySurface && displaySurface !== "monitor") {
        stream.getTracks().forEach(track => track.stop());
        resetButton();
        return sayStatus("Wrong share type. Record again and choose Entire Screen — not This Tab or Window — then enable Share system audio.");
      }

      const audioTracks = stream.getAudioTracks();
      if (!audioTracks.length) {
        stream.getTracks().forEach(track => track.stop());
        resetButton();
        return sayStatus("No system-audio track was shared. Record again, choose Entire Screen, and turn on Share system audio.");
      }

      const audioStream = new MediaStream(audioTracks);
      const mime = bestMime();
      const recorder = mime ? new MediaRecorder(audioStream, { mimeType: mime }) : new MediaRecorder(audioStream);
      const chunks = [];
      const utterance = makeUtterance(text);
      const voice = chosenVoice();
      const voiceName = voice?.name || "browser default voice";

      capture = { stream, recorder, utterance };
      button.textContent = "◆ Recording system audio…";

      recorder.ondataavailable = event => {
        if (event.data?.size) chunks.push(event.data);
      };

      recorder.onerror = () => {
        stopSpeech();
        sayStatus("The browser could not record system audio.");
        cleanup();
      };

      const stopRecorder = () => {
        if (recorder.state !== "inactive") recorder.stop();
      };

      recorder.onstop = async () => {
        try {
          const type = recorder.mimeType || mime || "audio/webm";
          const capturedBlob = new Blob(chunks, { type });
          if (!capturedBlob.size) throw new Error("empty system-audio recording");

          button.textContent = "Checking captured speech…";
          sayStatus("Checking the captured system audio…");

          const wavBlob = await capturedAudioToWav(capturedBlob);
          const data = await blobToDataUrl(wavBlob);
          if (typeof attachNarration !== "function") throw new Error("narration attachment is unavailable");

          await attachNarration(data, `speech synthesis system audio — ${voiceName}`);
          sayStatus(`Synthesized narration captured from system audio with ${voiceName} and attached to this slide.`);
        } catch (error) {
          const message = String(error?.message || "");
          if (/silent/i.test(message)) {
            sayStatus("System audio was captured but the synthesized voice was still silent. Confirm Entire Screen + Share system audio. If that option is unavailable, this browser/OS cannot capture its speechSynthesis voice; use microphone/uploaded narration instead.");
          } else {
            sayStatus(`Synthesized narration could not be attached: ${message || "capture failed"}.`);
          }
        } finally {
          cleanup();
        }
      };

      stream.getTracks().forEach(track => {
        track.addEventListener("ended", () => {
          stopSpeech();
          stopRecorder();
        }, { once: true });
      });

      utterance.onstart = () => sayStatus("Recording synthesized voice from system audio…");
      utterance.onend = () => setTimeout(stopRecorder, 450);
      utterance.onerror = () => {
        sayStatus("Speech synthesis stopped before recording finished.");
        setTimeout(stopRecorder, 150);
      };

      recorder.start(100);
      // Give the operating-system audio capture path time to become active.
      setTimeout(() => speechSynthesis.speak(utterance), 700);
    } catch (error) {
      try { stream?.getTracks().forEach(track => track.stop()); } catch (stopError) {}
      cleanup();
      if (error?.name === "NotAllowedError") {
        sayStatus("Screen sharing was cancelled. Record again and choose Entire Screen with Share system audio enabled.");
      } else {
        sayStatus(`System-audio capture could not start: ${error?.message || "unsupported browser configuration"}.`);
      }
    }
  }

  function addStyles() {
    if (el("ttsRecorderStyles")) return;
    const style = document.createElement("style");
    style.id = "ttsRecorderStyles";
    style.textContent = `
      .tts-recorder-box{margin:14px 0;padding:12px;border:1px solid #c7dceb;border-radius:12px;background:#fff}
      .tts-recorder-title{font-weight:900;color:#075985;margin:0 0 4px}
      .tts-recorder-warning{margin:8px 0;padding:9px 10px;border-radius:9px;background:#fff7ed;color:#9a3412;font-weight:750;line-height:1.35}
      .tts-recorder-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:9px}
      .tts-recorder-actions button{font-size:12px;padding:9px}
      #recordTtsNarrationBtn{background:#6d28d9}
      #recordTtsNarrationBtn.recording{background:#7e22ce;animation:pulse 1.2s infinite}
      @media(max-width:520px){.tts-recorder-actions{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function addControls() {
    const narrationBox = document.querySelector(".narration-box");
    const narrationActions = narrationBox?.querySelector(".narration-actions");
    if (!narrationBox || !narrationActions || el("ttsRecorderBox")) return;

    addStyles();
    const saved = settings();
    const box = document.createElement("div");
    box.id = "ttsRecorderBox";
    box.className = "tts-recorder-box";
    box.innerHTML = `
      <p class="tts-recorder-title">Speech synthesis narration</p>
      <div class="two">
        <label>Voice
          <select id="ttsNarrationVoice"><option value="">Browser default</option></select>
        </label>
        <label>Speed <output id="ttsNarrationRateOut">${Number(saved.rate || 1).toFixed(1).replace(".0", "")}×</output>
          <input id="ttsNarrationRate" type="range" min=".6" max="1.5" step=".1" value="${Number(saved.rate || 1)}">
        </label>
      </div>
      <p class="tts-recorder-warning"><strong>For recording:</strong> choose <strong>Entire Screen</strong> and enable <strong>Share system audio</strong>. Do not choose This Tab.</p>
      <div class="tts-recorder-actions">
        <button type="button" class="secondary" id="previewTtsNarrationBtn">🔊 Test synthesized speech</button>
        <button type="button" id="recordTtsNarrationBtn">◆ Record synthesized speech</button>
      </div>
      <p class="help">Some browser voices are produced by the operating system and are not present in browser-tab audio. System-audio capture is therefore used for synthesized narration.</p>
    `;

    narrationBox.insertBefore(box, narrationActions);

    el("ttsNarrationRate").oninput = () => {
      el("ttsNarrationRateOut").value = `${Number(el("ttsNarrationRate").value).toFixed(1).replace(".0", "")}×`;
      saveSettings();
    };
    el("ttsNarrationVoice").onchange = saveSettings;
    el("previewTtsNarrationBtn").onclick = previewSpeech;
    el("recordTtsNarrationBtn").onclick = recordSpeech;

    loadVoices();
    if (saved.voice) el("ttsNarrationVoice").value = saved.voice;
  }

  addControls();

  if ("speechSynthesis" in window) {
    const previous = speechSynthesis.onvoiceschanged;
    speechSynthesis.onvoiceschanged = event => {
      if (typeof previous === "function") previous.call(speechSynthesis, event);
      loadVoices();
    };
  }

  window.addEventListener("beforeunload", () => {
    stopSpeech();
    cleanup();
  });
})();