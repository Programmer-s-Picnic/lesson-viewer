"use strict";

(() => {
  const TTS_SETTINGS_KEY = "edushorts-tts-recorder-settings-v1";
  let ttsCapture = null;

  function el(id) {
    return document.getElementById(id);
  }

  function setStatus(message) {
    if (typeof status === "function") status(message);
    else if (el("status")) el("status").textContent = message;
  }

  function escapeText(value) {
    return String(value ?? "");
  }

  function getSettings() {
    try {
      return {
        voice: "",
        rate: 1,
        ...JSON.parse(localStorage.getItem(TTS_SETTINGS_KEY) || "{}")
      };
    } catch (error) {
      return { voice: "", rate: 1 };
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(TTS_SETTINGS_KEY, JSON.stringify({
        voice: el("ttsNarrationVoice")?.value || "",
        rate: Number(el("ttsNarrationRate")?.value || 1)
      }));
    } catch (error) {}
  }

  function narrationText() {
    const typed = el("narrationText")?.value?.trim();
    if (typed) return typed;
    try {
      return current()?.narrationText?.trim() || current()?.content?.trim() || "";
    } catch (error) {
      return "";
    }
  }

  function selectedVoice() {
    const name = el("ttsNarrationVoice")?.value || "";
    return speechSynthesis.getVoices().find(voice => voice.name === name) || null;
  }

  function makeUtterance(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = Number(el("ttsNarrationRate")?.value || 1);
    const voice = selectedVoice();
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }
    return utterance;
  }

  function loadTtsVoices() {
    const select = el("ttsNarrationVoice");
    if (!select || !("speechSynthesis" in window)) return;

    const settings = getSettings();
    const previous = select.value || settings.voice || "";
    const voices = speechSynthesis.getVoices();

    select.innerHTML = "";
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Browser default";
    select.appendChild(defaultOption);

    voices.forEach(voice => {
      const option = document.createElement("option");
      option.value = voice.name;
      option.textContent = `${voice.name} (${voice.lang})${voice.default ? " — default" : ""}`;
      select.appendChild(option);
    });

    if ([...select.options].some(option => option.value === previous)) {
      select.value = previous;
    }
  }

  function stopTtsPreview() {
    if ("speechSynthesis" in window) speechSynthesis.cancel();
  }

  function previewTts() {
    const text = narrationText();
    if (!text) return setStatus("Enter narration text first.");
    if (!("speechSynthesis" in window)) return setStatus("Speech synthesis is unavailable in this browser.");

    saveSettings();
    stopTtsPreview();
    const utterance = makeUtterance(text);
    utterance.onstart = () => setStatus("Playing synthesized narration…");
    utterance.onend = () => setStatus("Synthesized narration preview finished.");
    utterance.onerror = () => setStatus("The selected speech-synthesis voice could not be played.");
    speechSynthesis.speak(utterance);
  }

  function fileDataFromBlob(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function bestAudioMimeType() {
    if (!window.MediaRecorder) return "";
    const choices = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "video/webm;codecs=opus",
      "video/webm"
    ];
    return choices.find(type => MediaRecorder.isTypeSupported(type)) || "";
  }

  function cleanupCapture() {
    if (!ttsCapture) return;
    try { ttsCapture.displayStream?.getTracks().forEach(track => track.stop()); } catch (error) {}
    ttsCapture = null;
    const button = el("recordTtsNarrationBtn");
    if (button) {
      button.disabled = false;
      button.textContent = "◆ Record synthesized speech";
      button.classList.remove("recording");
    }
  }

  async function recordSynthesizedSpeech() {
    const text = narrationText();
    if (!text) return setStatus("Enter narration text first.");
    if (!("speechSynthesis" in window)) return setStatus("Speech synthesis is unavailable in this browser.");
    if (!navigator.mediaDevices?.getDisplayMedia || !window.MediaRecorder) {
      return setStatus("Synthesized-speech recording needs a browser that supports tab-audio capture, such as desktop Chrome or Edge.");
    }
    if (ttsCapture) return;

    saveSettings();
    stopTtsPreview();

    const button = el("recordTtsNarrationBtn");
    button.disabled = true;
    button.classList.add("recording");
    button.textContent = "Preparing tab audio…";

    let displayStream;
    try {
      setStatus("Choose this browser tab and enable Share tab audio. The synthesized voice will then be recorded automatically.");
      displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
        preferCurrentTab: true,
        selfBrowserSurface: "include",
        surfaceSwitching: "exclude",
        systemAudio: "include"
      });

      const audioTracks = displayStream.getAudioTracks();
      if (!audioTracks.length) {
        displayStream.getTracks().forEach(track => track.stop());
        cleanupCapture();
        return setStatus("No shared audio was received. Try again, choose this tab, and turn on Share tab audio.");
      }

      const audioStream = new MediaStream(audioTracks);
      const mimeType = bestAudioMimeType();
      const recorder = mimeType ? new MediaRecorder(audioStream, { mimeType }) : new MediaRecorder(audioStream);
      const chunks = [];
      const utterance = makeUtterance(text);
      const voice = selectedVoice();
      const voiceName = voice?.name || "browser default voice";

      ttsCapture = { displayStream, recorder, utterance };
      button.textContent = "◆ Recording synthesized speech…";

      recorder.ondataavailable = event => {
        if (event.data?.size) chunks.push(event.data);
      };

      recorder.onerror = () => {
        stopTtsPreview();
        cleanupCapture();
        setStatus("The browser could not record the shared tab audio.");
      };

      recorder.onstop = async () => {
        try {
          const type = recorder.mimeType || mimeType || "audio/webm";
          const blob = new Blob(chunks, { type });
          if (!blob.size) throw new Error("empty recording");
          const data = await fileDataFromBlob(blob);
          if (typeof attachNarration !== "function") throw new Error("narration attachment unavailable");
          await attachNarration(data, `speech synthesis — ${voiceName}`);
          setStatus(`Synthesized narration recorded with ${voiceName} and attached to this slide.`);
        } catch (error) {
          setStatus("The synthesized speech was captured, but the audio could not be attached to the slide.");
        } finally {
          cleanupCapture();
        }
      };

      const stopRecorder = () => {
        if (recorder.state !== "inactive") recorder.stop();
      };

      displayStream.getTracks().forEach(track => {
        track.addEventListener("ended", () => {
          stopTtsPreview();
          stopRecorder();
        }, { once: true });
      });

      utterance.onstart = () => setStatus("Recording synthesized narration…");
      utterance.onend = () => setTimeout(stopRecorder, 220);
      utterance.onerror = () => {
        setStatus("Speech synthesis stopped before the recording finished.");
        setTimeout(stopRecorder, 100);
      };

      recorder.start(100);
      setTimeout(() => speechSynthesis.speak(utterance), 250);
    } catch (error) {
      try { displayStream?.getTracks().forEach(track => track.stop()); } catch (stopError) {}
      cleanupCapture();
      if (error?.name === "NotAllowedError") {
        setStatus("Tab sharing was cancelled. To record synthesized speech, share this tab and enable Share tab audio.");
      } else {
        setStatus("Synthesized-speech recording could not start in this browser.");
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
    const settings = getSettings();
    const box = document.createElement("div");
    box.id = "ttsRecorderBox";
    box.className = "tts-recorder-box";
    box.innerHTML = `
      <p class="tts-recorder-title">Speech synthesis narration</p>
      <div class="two">
        <label>Voice
          <select id="ttsNarrationVoice"><option value="">Browser default</option></select>
        </label>
        <label>Speed <output id="ttsNarrationRateOut">${Number(settings.rate || 1).toFixed(1).replace(".0", "")}×</output>
          <input id="ttsNarrationRate" type="range" min=".6" max="1.5" step=".1" value="${Number(settings.rate || 1)}">
        </label>
      </div>
      <div class="tts-recorder-actions">
        <button type="button" class="secondary" id="previewTtsNarrationBtn">🔊 Test synthesized speech</button>
        <button type="button" id="recordTtsNarrationBtn">◆ Record synthesized speech</button>
      </div>
      <p class="help">Recording uses browser tab-audio capture. When asked what to share, choose <strong>this tab</strong> and enable <strong>Share tab audio</strong>. The result is attached as normal narration and is included in video export.</p>
    `;

    narrationBox.insertBefore(box, narrationActions);
    el("ttsNarrationRate").value = Number(settings.rate || 1);
    el("ttsNarrationRate").oninput = () => {
      el("ttsNarrationRateOut").value = `${Number(el("ttsNarrationRate").value).toFixed(1).replace(".0", "")}×`;
      saveSettings();
    };
    el("ttsNarrationVoice").onchange = saveSettings;
    el("previewTtsNarrationBtn").onclick = previewTts;
    el("recordTtsNarrationBtn").onclick = recordSynthesizedSpeech;

    loadTtsVoices();
    if (settings.voice) el("ttsNarrationVoice").value = settings.voice;
  }

  addControls();
  if ("speechSynthesis" in window) {
    const previous = speechSynthesis.onvoiceschanged;
    speechSynthesis.onvoiceschanged = event => {
      if (typeof previous === "function") previous.call(speechSynthesis, event);
      loadTtsVoices();
    };
  }

  window.addEventListener("beforeunload", () => {
    stopTtsPreview();
    cleanupCapture();
  });
})();
