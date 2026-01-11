/* ============================================
   VOICEFORGE AI - UI CONTROLLER
   Manages all UI interactions and state
   ============================================ */

import {
  log,
  VOICES,
  showToast,
  getDurationString,
  SAMPLE_TEXT,
  HISTORY_STORAGE_KEY,
  getFromStorage,
  saveToStorage,
} from "./utils.js";

export class UIController {
  constructor() {
    this.voiceList = [...VOICES];
    this.selectedVoiceId = this.voiceList[0]?.id || "en_US-lessac-high";
    this.currentAudioBlob = null;
    this.currentAudioDuration = 0;
    this.isGenerating = false;
    this.isPreviewMode = false; // Track if in preview mode
    this.history = [];

    this.initializeElements();
    this.attachEventListeners();
    this.loadHistory();
    this.setVoices(this.voiceList);
    this.setupThemeToggle();
  }

  /**
   * Initialize DOM Elements
   */
  initializeElements() {
    this.textInput = document.getElementById("textInput");
    this.charCount = document.getElementById("charCount");
    this.voiceGrid = document.getElementById("voiceGrid");
    this.generateBtn = document.getElementById("generateBtn");
    this.generateLoader = document.getElementById("generateLoader");
    this.previewBtn = document.getElementById("previewBtn");
    this.previewLoader = document.getElementById("previewLoader");
    this.audioSection = document.getElementById("audioSection");
    this.audioPlayer = document.getElementById("audioPlayer");
    this.playBtn = document.getElementById("playBtn");
    this.downloadBtn = document.getElementById("downloadBtn");
    this.shareBtn = document.getElementById("shareBtn");
    this.downloadStatus = document.getElementById("downloadStatus");
    this.downloadMessage = document.getElementById("downloadMessage");
    this.speedSlider = document.getElementById("speedSlider");
    this.pitchSlider = document.getElementById("pitchSlider");
    this.speedValue = document.getElementById("speedValue");
    this.pitchValue = document.getElementById("pitchValue");
    this.themeToggle = document.getElementById("themeToggle");
    this.waveformCanvas = document.getElementById("waveformCanvas");
    this.historySection = document.getElementById("historySection");
    this.historyList = document.getElementById("historyList");
    this.errorToast = document.getElementById("errorToast");
    this.formatSelect = document.getElementById("formatSelect");
    // Prefill with sample text for instant preview
    if (this.textInput) {
      this.textInput.value = SAMPLE_TEXT;
      this.updateCharCount(SAMPLE_TEXT.length);
    }

    log("UI Elements initialized", "info");
  }

  /**
   * Attach Event Listeners
   */
  attachEventListeners() {
    // Text input
    this.textInput.addEventListener("input", (e) => {
      this.updateCharCount(e.target.value.length);
    });

    // Generate button
    this.generateBtn.addEventListener("click", () => {
      this.onGenerateClick();
    });

    // Preview button
    this.previewBtn.addEventListener("click", () => {
      this.onPreviewClick();
    });

    // Play button
    this.playBtn.addEventListener("click", () => {
      this.playAudio();
    });

    // Download button
    this.downloadBtn.addEventListener("click", async () => {
      await this.downloadAudio();
    });

    // Share button
    this.shareBtn.addEventListener("click", () => {
      this.shareAudio();
    });

    // Speed slider
    this.speedSlider.addEventListener("input", (e) => {
      this.speedValue.textContent = parseFloat(e.target.value).toFixed(1) + "x";
    });

    // Pitch slider
    this.pitchSlider.addEventListener("input", (e) => {
      this.pitchValue.textContent = parseFloat(e.target.value).toFixed(1) + "x";
    });

    // Audio player events
    this.audioPlayer.addEventListener("play", () => {
      this.playBtn.textContent = "⏸️ Pause";
    });

    this.audioPlayer.addEventListener("pause", () => {
      this.playBtn.textContent = "▶️ Play";
    });

    log("Event listeners attached", "info");
  }

  /**
   * Load persisted history
   */
  loadHistory() {
    const stored = getFromStorage(HISTORY_STORAGE_KEY, []);
    if (Array.isArray(stored) && stored.length > 0) {
      this.history = stored;
      this.historySection.classList.remove("hidden");
      this.renderHistory();
      log(`Loaded ${stored.length} history items`, "info");
    }
  }

  /**
   * Update available voices and re-render grid
   */
  setVoices(voices = []) {
    const list = Array.isArray(voices) && voices.length > 0 ? voices : VOICES;
    this.voiceList = list;
    if (!list.some((v) => v.id === this.selectedVoiceId) && list[0]) {
      this.selectedVoiceId = list[0].id;
    }
    this.renderVoiceGrid();
  }

  /**
   * Render Voice Selection Grid
   */
  renderVoiceGrid() {
    this.voiceGrid.innerHTML = "";

    this.voiceList.forEach((voice) => {
      const card = document.createElement("div");
      card.className = `voice-card ${
        voice.id === this.selectedVoiceId ? "selected" : ""
      }`;
      card.dataset.voiceId = voice.id;

      card.innerHTML = `
        <div class="voice-icon">${voice.icon}</div>
        <div class="voice-name">${voice.name}</div>
        <div class="voice-type">${voice.type}</div>
      `;

      card.addEventListener("click", () => {
        this.selectVoice(voice.id);
      });

      this.voiceGrid.appendChild(card);
    });

    log("Voice grid rendered", "info");
  }

  /**
   * Select Voice
   */
  selectVoice(voiceId) {
    // Update selected state in UI
    document.querySelectorAll(".voice-card").forEach((card) => {
      card.classList.remove("selected");
    });

    document
      .querySelector(`[data-voice-id="${voiceId}"]`)
      .classList.add("selected");

    this.selectedVoiceId = voiceId;
    log(`Voice selected: ${voiceId}`, "info");
  }

  /**
   * Update Character Count
   */
  updateCharCount(count) {
    this.charCount.textContent = count;

    if (count >= 1900) {
      this.charCount.style.color = "var(--warning)";
    } else if (count >= 1500) {
      this.charCount.style.color = "var(--accent-primary)";
    } else {
      this.charCount.style.color = "var(--text-muted)";
    }
  }

  /**
   * Setup Theme Toggle
   */
  setupThemeToggle() {
    const isDarkMode = localStorage.getItem("darkMode") !== "false";
    if (isDarkMode) {
      document.body.classList.remove("light-mode");
      this.themeToggle.textContent = "☀️";
    } else {
      document.body.classList.add("light-mode");
      this.themeToggle.textContent = "🌙";
    }

    this.themeToggle.addEventListener("click", () => {
      const isLightMode = document.body.classList.toggle("light-mode");
      localStorage.setItem("darkMode", !isLightMode);
      this.themeToggle.textContent = isLightMode ? "🌙" : "☀️";
    });
  }

  /**
   * Handle Generate Button Click
   */
  async onGenerateClick() {
    const text = this.textInput.value.trim();

    // Validate
    if (!text) {
      showToast("Please enter some text to generate voice", "warning");
      return;
    }

    if (text.length < 2) {
      showToast("Text must be at least 2 characters", "warning");
      return;
    }

    // Disable button and show loading
    this.generateBtn.disabled = true;
    this.generateLoader.classList.remove("hidden");
    this.isGenerating = true;

    try {
      // Dispatch custom event for app.js to handle
      const event = new CustomEvent("generateAudio", {
        detail: {
          text: text,
          voiceId: this.selectedVoiceId,
          speed: parseFloat(this.speedSlider.value),
          pitch: parseFloat(this.pitchSlider.value),
        },
      });

      window.dispatchEvent(event);
    } catch (error) {
      log(`Error in onGenerateClick: ${error.message}`, "error");
      showToast("Failed to generate audio", "error");
      this.resetGenerateButton();
    }
  }

  /**
   * Handle Preview Button Click
   */
  onPreviewClick() {
    const inputText = this.textInput.value.trim();
    const text = inputText || SAMPLE_TEXT;

    this.previewBtn.disabled = true;
    this.previewLoader.classList.remove("hidden");

    const event = new CustomEvent("previewAudio", {
      detail: {
        text,
        voiceId: this.selectedVoiceId,
        speed: parseFloat(this.speedSlider.value),
        pitch: parseFloat(this.pitchSlider.value),
      },
    });

    window.dispatchEvent(event);
  }

  /**
   * Display Generated Audio
   */
  displayAudio(blob, duration, text, isPreview = false) {
    this.currentAudioBlob = blob;
    this.currentAudioDuration = duration;
    this.isPreviewMode = isPreview; // Track if this is preview mode

    // Show audio section
    this.audioSection.classList.remove("hidden");

    // Set audio source
    const url = URL.createObjectURL(blob);
    this.audioPlayer.src = url;

    // Draw waveform
    this.drawWaveform();

    // Add to history (only for full generates, not previews)
    if (!isPreview) {
      this.addToHistory(text, this.selectedVoiceId, duration);
    }

    // Reset button state
    this.resetGenerateButton();

    const mode = isPreview ? "preview" : "full generation";
    log(
      `Audio displayed in ${mode} mode (ready to play, no auto-play)`,
      "info"
    );
  }

  /**
   * Draw Waveform
   */
  drawWaveform() {
    const canvas = this.waveformCanvas;
    const ctx = canvas.getContext("2d");

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Clear
    ctx.fillStyle = "var(--bg-main)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw waveform
    ctx.strokeStyle = "var(--wave-active)";
    ctx.lineWidth = 2;
    ctx.beginPath();

    const barWidth = canvas.width / 128;
    const centerY = canvas.height / 2;

    for (let i = 0; i < 128; i++) {
      const x = i * barWidth;
      const y = Math.random() * canvas.height;

      if (i === 0) {
        ctx.moveTo(x, centerY);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();

    log("Waveform drawn", "info");
  }

  /**
   * Play/Stop Audio Toggle
   */
  playAudio() {
    if (this.audioPlayer.paused) {
      this.audioPlayer.play();
      log("▶️ Playing audio", "info");

      // Update button visual
      if (this.playBtn) {
        this.playBtn.textContent = "⏸ Stop";
      }
    } else {
      this.audioPlayer.pause();
      log("⏸ Audio paused", "info");

      // Update button visual
      if (this.playBtn) {
        this.playBtn.textContent = "▶ Play";
      }
    }
  }

  /**
   * Download Audio
   */
  async downloadAudio() {
    if (!this.currentAudioBlob) {
      showToast("No audio to download", "warning");
      return;
    }

    try {
      const format = this.formatSelect?.value || "wav";
      const timestamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/:/g, "-");
      const filename = `voiceforge-${timestamp}.${format}`;

      let downloadBlob = this.currentAudioBlob;

      // Convert format if needed
      if (format !== "wav" && this.currentAudioBlob.type === "audio/wav") {
        showToast(`Converting to ${format.toUpperCase()}...`, "info", 2000);

        // Dispatch conversion event to app.js which has access to audio engine
        const conversionEvent = new CustomEvent("convertAudioFormat", {
          detail: {
            blob: this.currentAudioBlob,
            targetFormat: format,
          },
        });

        const conversionPromise = new Promise((resolve) => {
          const handler = (e) => {
            window.removeEventListener("audioFormatConverted", handler);
            resolve(e.detail.blob);
          };
          window.addEventListener("audioFormatConverted", handler);
        });

        window.dispatchEvent(conversionEvent);
        downloadBlob = await conversionPromise;
      }

      // Ensure blob has data
      if (!downloadBlob || downloadBlob.size === 0) {
        showToast("Audio file is empty. Please regenerate.", "error");
        return;
      }

      // Create download link
      const url = URL.createObjectURL(downloadBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Show success message
      this.downloadStatus.classList.remove("hidden");
      this.downloadMessage.textContent = `✓ Downloaded: ${filename} (${(
        downloadBlob.size / 1024
      ).toFixed(1)} KB)`;

      setTimeout(() => {
        this.downloadStatus.classList.add("hidden");
      }, 3000);

      log(`Audio downloaded: ${filename} (${downloadBlob.size} bytes)`, "info");
      showToast("Audio downloaded successfully!", "success");
    } catch (error) {
      log(`Error downloading audio: ${error.message}`, "error");
      showToast("Failed to download audio", "error");
    }
  }

  /**
   * Share Audio
   */
  async shareAudio() {
    if (!this.currentAudioBlob) {
      showToast("No audio to share", "warning");
      return;
    }

    try {
      if (navigator.share) {
        const file = new File([this.currentAudioBlob], "voiceforge-audio.wav", {
          type: "audio/wav",
        });

        await navigator.share({
          title: "VoiceForge Audio",
          text: "Check out this audio generated by VoiceForge AI!",
          files: [file],
        });

        log("Audio shared", "info");
      } else {
        showToast("Web Share API not available on this device", "warning");
        // Fallback: download
        this.downloadAudio();
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        log(`Error sharing audio: ${error.message}`, "error");
        showToast("Failed to share audio", "error");
      }
    }
  }

  /**
   * Add to History
   */
  addToHistory(text, voiceId, duration) {
    const voice = VOICES.find((v) => v.id === voiceId);
    const item = {
      id: `${Date.now()}`,
      text: text.substring(0, 100),
      voiceName: voice?.name || "Unknown",
      duration: duration,
      timestamp: new Date().toLocaleTimeString(),
    };

    this.history.unshift(item);
    if (this.history.length > 10) {
      this.history.pop();
    }

    if (this.history.length > 0) {
      this.historySection.classList.remove("hidden");
      this.renderHistory();
    }

    saveToStorage(HISTORY_STORAGE_KEY, this.history);

    log("Added to history", "info");
  }

  /**
   * Render History
   */
  renderHistory() {
    this.historyList.innerHTML = "";

    this.history.forEach((item) => {
      const historyItem = document.createElement("div");
      historyItem.className = "history-item";

      historyItem.innerHTML = `
        <div style="flex: 1;">
          <div class="history-item-voice">${item.voiceName}</div>
          <div class="history-item-text">${item.text}...</div>
          <small style="color: var(--text-hint);">${
            item.timestamp
          } • ${getDurationString(item.duration)}</small>
        </div>
        <button class="history-item-delete" title="Delete">✕</button>
      `;

      historyItem
        .querySelector(".history-item-delete")
        .addEventListener("click", (e) => {
          e.stopPropagation();
          this.history = this.history.filter((h) => h.id !== item.id);
          this.renderHistory();
          saveToStorage(HISTORY_STORAGE_KEY, this.history);
        });

      this.historyList.appendChild(historyItem);
    });

    if (this.history.length === 0) {
      this.historySection.classList.add("hidden");
    }
  }

  /**
   * Reset Generate Button
   */
  resetGenerateButton() {
    this.generateBtn.disabled = false;
    this.generateLoader.classList.add("hidden");
    this.isGenerating = false;
  }

  /**
   * Hide preview loading state
   */
  hidePreviewState() {
    this.previewBtn.disabled = false;
    this.previewLoader.classList.add("hidden");
  }

  /**
   * Show Loading State
   */
  showLoadingState() {
    this.generateBtn.disabled = true;
    this.generateLoader.classList.remove("hidden");
    this.isGenerating = true;
  }

  /**
   * Hide Loading State
   */
  hideLoadingState() {
    this.resetGenerateButton();
  }
}

export default UIController;
