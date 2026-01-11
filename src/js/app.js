/* ============================================
   VOICEFORGE AI - MAIN APPLICATION
   Orchestrates UI and Audio Engine
   ============================================ */

import { voiceForge } from "./piper-integration.js";
import UIController from "./ui-controller.js";
import { log, showToast, VOICES } from "./utils.js";
import { i18n } from "./i18n.js";

class VoiceForgeApp {
  constructor() {
    this.voiceEngine = voiceForge; // NEW: Use Piper integration
    this.uiController = null;
    this.isReady = false;

    this.setupSplashScreen();
    this.initialize();
  }

  /**
   * Setup Splash Screen
   */
  setupSplashScreen() {
    const splashScreen = document.getElementById("splashScreen");
    const getStartedBtn = document.getElementById("getStartedBtn");

    if (!getStartedBtn || !splashScreen) return;

    getStartedBtn.addEventListener("click", () => {
      splashScreen.classList.add("hide");
      // Remove from DOM after animation completes
      setTimeout(() => {
        splashScreen.style.display = "none";
      }, 600);

      log("Splash screen dismissed", "info");
    });
  }

  /**
   * Initialize Application
   */
  async initialize() {
    try {
      log("🚀 VoiceForge AI starting up...", "info");

      // Wait for i18n to be ready
      await new Promise((resolve) => {
        if (i18n.initialized) {
          resolve();
        } else {
          window.addEventListener("i18nReady", resolve, { once: true });
        }
      });

      // Initialize Piper TTS Engine (NEW!)
      log("🎙️ Initializing neural TTS engine...", "info");
      try {
        await this.voiceEngine.initialize();
        const status = this.voiceEngine.getStatus();
        log(`✅ TTS Engine Status: ${JSON.stringify(status)}`, "info");
      } catch (ttsError) {
        log(`⚠️ TTS initialization warning: ${ttsError.message}`, "warning");
        // Continue - Web Speech API will work as fallback
      }

      // Initialize UI
      this.uiController = new UIController();

      // Attach event listeners
      this.attachEventListeners();

      // Setup language switcher
      this.setupLanguageSwitcher();

      // Load voices (wait for them before marking ready)
      await this.loadVoices();
      // Give Piper extra time to initialize (3-5 seconds)
      log(
        "⏳ Allowing Piper neural TTS to initialize (3-5 seconds)...",
        "info"
      );
      await new Promise((r) => setTimeout(r, 4000));

      this.isReady = true;
      log("✅ VoiceForge AI ready - Piper neural TTS should be active", "info");
      if (
        this.voiceEngine?.engine?.piperReady &&
        this.voiceEngine?.engine?.usePiper
      ) {
        showToast("🎙️ Neural TTS Ready!", "success");
      } else {
        showToast(i18n.t("messages.ready"), "success");
      }

      // Ready state handled above with Piper status toast
    } catch (error) {
      log(`❌ Failed to initialize app: ${error.message}`, "error");
      showToast(i18n.t("messages.initialization_error"), "error");
    }
  }

  /**
   * Setup Language Switcher
   */
  setupLanguageSwitcher() {
    const languageBtn = document.getElementById("languageToggle");
    const languageMenu = document.getElementById("languageMenu");
    const currentLanguageFlag = document.getElementById("currentLanguageFlag");
    const languageOptions = document.querySelectorAll(".language-option");

    if (!languageBtn) return;

    // Toggle menu
    languageBtn.addEventListener("click", () => {
      languageMenu.classList.toggle("hidden");
    });

    // Close menu when clicking outside
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".language-switcher")) {
        languageMenu.classList.add("hidden");
      }
    });

    // Language option selection
    languageOptions.forEach((option) => {
      option.addEventListener("click", () => {
        const lang = option.getAttribute("data-lang");
        i18n.setLanguage(lang);

        // Update UI
        languageMenu.classList.add("hidden");
        const availableLangs = i18n.getAvailableLanguages();
        if (availableLangs[lang]) {
          currentLanguageFlag.textContent = availableLangs[lang].flag;
        }

        // Update active state
        languageOptions.forEach((opt) => {
          opt.classList.remove("active");
        });
        option.classList.add("active");

        log(`Language switched to: ${lang}`, "info");
      });
    });

    // Set initial active language
    const currentLang = i18n.getLanguage();
    languageOptions.forEach((option) => {
      if (option.getAttribute("data-lang") === currentLang) {
        option.classList.add("active");
      }
    });

    // Set initial flag
    const availableLangs = i18n.getAvailableLanguages();
    if (availableLangs[currentLang]) {
      currentLanguageFlag.textContent = availableLangs[currentLang].flag;
    }

    // Listen for language changes and update UI
    window.addEventListener("languageChanged", () => {
      this.uiController.updateUI();
    });
  }

  /**
   * Attach Event Listeners
   */
  attachEventListeners() {
    // Listen for generate audio event from UI
    window.addEventListener("generateAudio", (e) => {
      this.generateAudio(e.detail);
    });

    // Listen for preview audio event from UI
    window.addEventListener("previewAudio", (e) => {
      this.previewAudio(e.detail);
    });

    // Listen for audio format conversion request
    window.addEventListener("convertAudioFormat", async (e) => {
      const { blob, targetFormat } = e.detail;
      // Audio format is already WAV from Piper, just pass through
      log(`Audio format conversion requested: ${targetFormat}`, "info");
      window.dispatchEvent(
        new CustomEvent("audioFormatConverted", {
          detail: { blob: blob }, // Already in correct format
        })
      );
    });

    // Handle keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      // Ctrl/Cmd + Enter to generate
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        this.uiController.onGenerateClick();
      }
    });

    log("Event listeners attached", "info");
  }

  /**
   * Preview voice without saving/download
   */
  async previewAudio(options) {
    try {
      const { text, voiceId, speed, pitch } = options;

      log(`🔊 Previewing voice: ${voiceId}`, "info");

      // Generate preview audio with new engine
      const result = await this.voiceEngine.generateSpeech(text, {
        voiceId,
        rate: speed,
        pitch,
        forcePiper: true,
      });

      if (result.success) {
        log(
          `✅ Preview audio generated (${result.duration.toFixed(
            2
          )}s), ready to play`,
          "info"
        );

        // Display audio and let user click play button instead of auto-playing
        this.uiController.displayAudio(
          result.blob,
          result.duration,
          text,
          true // isPreview flag
        );

        // Show message that preview is ready
        showToast("Preview ready! Click play to listen", "success");
      }
    } catch (error) {
      log(`Error previewing audio: ${error.message}`, "error");
      showToast(`${i18n.t("messages.error")}: ${error.message}`, "error");
    } finally {
      this.uiController.hidePreviewState();
    }
  }

  /**
   * Load Available Voices (mobile-friendly)
   */
  async loadVoices() {
    try {
      log("🎤 Loading available voices...", "info");

      // Wait for Piper to be ready if initializing
      let attempts = 0;
      while (attempts < 30) {
        const voices = await this.voiceEngine.getVoices();
        const displayVoices = this.buildVoiceList(voices);
        this.uiController.setVoices(displayVoices);

        // If we have Piper voices, we're ready
        if (voices.piper && voices.piper.length > 0) {
          log(`✅ Piper voices loaded on attempt ${attempts + 1}`, "info");
          return this.logVoiceInfo(voices);
        }

        // If Piper is initialized but no voices yet, wait and retry
        if (this.voiceEngine.engine && this.voiceEngine.engine.piperReady) {
          log(
            `⏳ Waiting for Piper voices... (attempt ${attempts + 1}/30)`,
            "info"
          );
          await new Promise((resolve) => setTimeout(resolve, 200));
          attempts++;
          continue;
        }

        // Piper not ready yet, log and use Web Speech API
        log(
          `⚠️ Piper not yet initialized, using Web Speech API (attempt ${
            attempts + 1
          })`,
          "info"
        );
        return this.logVoiceInfo(voices);
      }

      // If we get here, log what we have
      const finalVoices = await this.voiceEngine.getVoices();
      const displayVoices = this.buildVoiceList(finalVoices);
      this.uiController.setVoices(displayVoices);
      this.logVoiceInfo(finalVoices);
    } catch (error) {
      log(`Error loading voices: ${error.message}`, "warning");
    }
  }

  /**
   * Build voice list for UI from engine voices
   */
  buildVoiceList(voices = {}) {
    const piperVoices = Array.isArray(voices.piper)
      ? voices.piper.map((voice) => {
          const preset = VOICES.find((v) => v.id === voice.id);
          return {
            id: voice.id,
            name: preset?.name || voice.name || voice.id,
            type: "Neural",
            icon: preset?.icon || "🧠",
            description: preset?.description || "Neural TTS voice",
            lang: preset?.lang || voice.lang || "en-US",
          };
        })
      : [];

    if (piperVoices.length > 0) {
      return piperVoices;
    }

    return VOICES;
  }

  /**
   * Log voice information
   */
  logVoiceInfo(voices) {
    log(`=== Voice Debug Info ===`, "info");
    log(`Piper voices: ${voices.piper ? voices.piper.length : 0}`, "info");
    log(
      `Web Speech voices: ${voices.webSpeech ? voices.webSpeech.length : 0}`,
      "info"
    );

    // Log Piper voices
    if (voices.piper && voices.piper.length > 0) {
      log(`🧠 Piper Neural Voices:`, "info");
      voices.piper.forEach((voice, index) => {
        log(`  ${index + 1}. ${voice.name} [${voice.id}]`, "info");
      });
    } else {
      log(
        `🧠 Piper Neural Voices: NOT YET LOADED (still initializing)`,
        "info"
      );
    }

    // Log Web Speech voices (first 5)
    if (voices.webSpeech && voices.webSpeech.length > 0) {
      log(`🔊 Web Speech API Voices (first 5):`, "info");
      voices.webSpeech.slice(0, 5).forEach((voice, index) => {
        log(`  ${index + 1}. ${voice.name} [${voice.lang}]`, "info");
      });
    }

    // Setup voice change listener for dynamic loading
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        const updatedVoices = window.speechSynthesis.getVoices();
        log(`Voices updated: ${updatedVoices.length} now available`, "info");

        // Dispatch event to update UI if needed
        window.dispatchEvent(
          new CustomEvent("voicesUpdated", {
            detail: { count: updatedVoices.length },
          })
        );
      };
    }
  }

  /**
   * Generate Audio from Text
   */
  async generateAudio(options) {
    try {
      const { text, voiceId, speed, pitch } = options;

      log(`🎙️ Generating audio: "${text.substring(0, 50)}..."`, "info");
      log(`Voice: ${voiceId}, Speed: ${speed}, Pitch: ${pitch}`, "info");
      this.uiController.showLoadingState();

      // Generate speech with NEW Piper engine
      const result = await this.voiceEngine.generateSpeech(text, {
        voiceId: voiceId,
        rate: speed,
        pitch: pitch,
        forcePiper: true,
      });

      log(
        `✅ Generation complete: ${result.duration.toFixed(2)}s (${
          result.isPiper ? "Piper" : "Web Speech"
        })`,
        "info"
      );

      if (result.success) {
        // Display audio
        this.uiController.displayAudio(
          result.blob,
          result.duration,
          result.text
        );

        showToast("✓ " + i18n.t("messages.success"), "success");
        log("✅ Audio generation completed successfully", "info");
      } else {
        throw new Error("Audio generation failed");
      }
    } catch (error) {
      log(`Error generating audio: ${error.message}`, "error");
      showToast(`${i18n.t("messages.error")}: ${error.message}`, "error");
    } finally {
      this.uiController.hideLoadingState();
    }
  }

  /**
   * Get Application Status
   */
  getStatus() {
    const engineStatus = this.voiceEngine ? this.voiceEngine.getStatus() : {};
    return {
      ready: this.isReady,
      voiceEngineReady: true,
      piperActive: engineStatus.piperInitialized || false,
      activeEngine: engineStatus.activeEngine || "Unknown",
      uiReady: !!this.uiController,
      language: i18n.getLanguage(),
    };
  }

  /**
   * Cleanup on Page Unload
   */
  dispose() {
    try {
      if (this.voiceEngine && this.voiceEngine.engine) {
        this.voiceEngine.engine.dispose();
      }
      log("Application disposed", "info");
    } catch (error) {
      log(`Error during cleanup: ${error.message}`, "error");
    }
  }
}

// Initialize app when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    window.voiceforgeApp = new VoiceForgeApp();
  });
} else {
  window.voiceforgeApp = new VoiceForgeApp();
}

// Cleanup on unload
window.addEventListener("beforeunload", () => {
  if (window.voiceforgeApp) {
    window.voiceforgeApp.dispose();
  }
});

export default VoiceForgeApp;
