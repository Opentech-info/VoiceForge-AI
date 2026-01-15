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
import { ICONS } from "./icons.js";

export class UIController {
  constructor() {
    this.voiceList = [...VOICES];
    this.selectedVoiceId = this.voiceList[0]?.id || "en_US-lessac-high";
    this.currentAudioBlob = null;
    this.currentAudioDuration = 0;
    this.isGenerating = false;
    this.isPreviewMode = false;
    this.history = [];
    this.previewAudioElement = new Audio(); // Dedicated preview player

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

    // Initialize Icons
    this.updateIcons();

    // Prefill with sample text for instant preview
    if (this.textInput) {
      this.textInput.value = SAMPLE_TEXT;
      this.updateCharCount(SAMPLE_TEXT.length);
    }

    log("UI Elements initialized", "info");
  }

  updateIcons() {
    // Top Bar
    if(this.themeToggle) this.themeToggle.innerHTML = ICONS.themeDark;
    
    // Buttons
    if(this.previewBtn) {
        const span = this.previewBtn.querySelector(".btn-icon");
        if(span) span.innerHTML = ICONS.play; // Default to play
    }
    if(this.generateBtn) {
        const span = this.generateBtn.querySelector(".btn-icon");
        if(span) span.innerHTML = ICONS.generate;
    }
    if(this.playBtn) {
         // Play button inside audio section
         this.playBtn.innerHTML = `${ICONS.play} <span data-i18n="buttons.play">Play</span>`;
    }
    if(this.downloadBtn) {
        this.downloadBtn.innerHTML = `${ICONS.download} <span data-i18n="buttons.download">Download</span>`;
    }
    if(this.shareBtn) {
        this.shareBtn.innerHTML = `${ICONS.share} <span data-i18n="buttons.share">Share</span>`;
    }
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

    // Preview button (NOW HANDLES PAUSE)
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
      this.playBtn.innerHTML = `${ICONS.pause} <span>Pause</span>`;
    });

    this.audioPlayer.addEventListener("pause", () => {
      this.playBtn.innerHTML = `${ICONS.play} <span>Play</span>`;
    });
    
    this.audioPlayer.addEventListener("ended", () => {
      this.playBtn.innerHTML = `${ICONS.play} <span>Play</span>`;
    });

    // Preview Audio Player Events
    this.previewAudioElement.addEventListener("ended", () => {
        this.resetPreviewButton();
    });

    this.previewAudioElement.addEventListener("pause", () => {
        this.resetPreviewButton();
    });
    
    this.previewAudioElement.addEventListener("play", () => {
       this.setPreviewButtonPlaying();
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

      // Use SVG icon if available, else emoji fallback
      const paramIcon = voice.type === 'Neural' ? ICONS.voice : '🗣️';

      card.innerHTML = `
        <div class="voice-icon">${paramIcon}</div>
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
    document.querySelectorAll(".voice-card").forEach((card) => {
      card.classList.remove("selected");
    });

    const activeCard = document.querySelector(`[data-voice-id="${voiceId}"]`);
    if(activeCard) activeCard.classList.add("selected");

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
      this.themeToggle.innerHTML = ICONS.themeDark; 
    } else {
      document.body.classList.add("light-mode");
      this.themeToggle.innerHTML = ICONS.themeLight;
    }

    this.themeToggle.addEventListener("click", () => {
      const isLightMode = document.body.classList.toggle("light-mode");
      localStorage.setItem("darkMode", !isLightMode);
      this.themeToggle.innerHTML = isLightMode ? ICONS.themeLight : ICONS.themeDark;
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
   * Handle Preview Button Click (Play/Pause)
   */
  onPreviewClick() {
    // If currently playing preview, PAUSE it
    if (!this.previewAudioElement.paused && this.previewAudioElement.src) {
        this.previewAudioElement.pause();
        return;
    }
    
    // If paused but has content, RESUME it
    if(this.previewAudioElement.paused && this.previewAudioElement.src && this.previewAudioElement.currentTime > 0) {
        this.previewAudioElement.play().catch(e => {
             log("Resume failed, regenerating...", "warning");
             this.startNewPreview();
        });
        return;
    }

    // Otherwise start NEW preview
    this.startNewPreview();
  }

  startNewPreview() {
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

  setPreviewButtonPlaying() {
      const icon = this.previewBtn.querySelector(".btn-icon");
      const text = this.previewBtn.querySelector(".btn-text");
      if(icon) icon.innerHTML = ICONS.pause;
      if(text) text.textContent = "Pause"; // Or use i18n
      this.previewBtn.classList.add("playing");
  }

  resetPreviewButton() {
      const icon = this.previewBtn.querySelector(".btn-icon");
      const text = this.previewBtn.querySelector(".btn-text");
      if(icon) icon.innerHTML = ICONS.play; // Back to play icon
      if(text) text.textContent = "Preview Voice"; // Back to original text
      this.previewBtn.classList.remove("playing");
      this.previewBtn.disabled = false;
      this.previewLoader.classList.add("hidden");
  }


  /**
   * Display Generated Audio
   */
  displayAudio(blob, duration, text, isPreview = false) {
    if (isPreview) {
        // Special handling for preview: play immediately in background player
        try {
            const url = URL.createObjectURL(blob);
            this.previewAudioElement.src = url;
            const playPromise = this.previewAudioElement.play();
            
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    log("Preview playback failed (likely autoplay policy): " + error.message, "error");
                    // If blocked, just show the normal player so they can click play manually
                    this.displayAudio(blob, duration, text, false); 
                    showToast("Preview auto-play blocked. Please click Play.", "info");
                });
            }
        } catch(e) {
            log("Error setting up preview: " + e.message, "error");
        }
        
        this.hidePreviewState(); 
        return;
    }

    // Normal Full Generation handling
    this.currentAudioBlob = blob;
    this.currentAudioDuration = duration;
    this.isPreviewMode = false;

    this.audioSection.classList.remove("hidden");
    const url = URL.createObjectURL(blob);
    this.audioPlayer.src = url;

    this.drawWaveform();
    this.addToHistory(text, this.selectedVoiceId, duration);
    this.resetGenerateButton();

    log(`Audio displayed.`, "info");
  }

  /**
   * Draw Waveform
   */
  drawWaveform() {
    const canvas = this.waveformCanvas;
    const ctx = canvas.getContext("2d");

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    ctx.fillStyle = "var(--bg-main)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "var(--wave-active)";
    ctx.lineWidth = 2;
    ctx.beginPath();

    const barWidth = canvas.width / 128;
    const centerY = canvas.height / 2;

    for (let i = 0; i < 128; i++) {
        const x = i * barWidth;
        const amplitude = Math.random() * (canvas.height / 3);
        const y = centerY - (amplitude / 2);
        
        // Rounded bars
        ctx.moveTo(x, centerY - amplitude);
        ctx.lineTo(x, centerY + amplitude);
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
      this.playBtn.innerHTML = `${ICONS.pause} <span>Pause</span>`;
    } else {
      this.audioPlayer.pause();
      this.playBtn.innerHTML = `${ICONS.play} <span>Play</span>`;
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

      if (format !== "wav" && this.currentAudioBlob.type === "audio/wav") {
        showToast(`Converting to ${format.toUpperCase()}...`, "info", 2000);

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

      if (!downloadBlob || downloadBlob.size === 0) {
        showToast("Audio file is empty. Please regenerate.", "error");
        return;
      }

      const url = URL.createObjectURL(downloadBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      this.downloadStatus.classList.remove("hidden");
      this.downloadMessage.textContent = `✓ Downloaded: ${filename} (${(
        downloadBlob.size / 1024
      ).toFixed(1)} KB)`;

      setTimeout(() => {
        this.downloadStatus.classList.add("hidden");
      }, 3000);

      log(`Audio downloaded: ${filename}`, "info");
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
    this.previewLoader.classList.add("hidden");
    // Don't enable yet if it's playing, depends on logic
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
