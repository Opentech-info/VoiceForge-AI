/* ============================================
   PIPER TTS INITIALIZATION & USAGE
   Plug-and-play Piper integration for VoiceForge AI
   ============================================ */

import VoiceForgeEngine from "./voiceforge-engine.js";
import { log } from "./utils.js";

export class PiperIntegration {
  constructor() {
    this.engine = new VoiceForgeEngine();
    this.initialized = false;
  }

  /**
   * Initialize Piper in background (non-blocking)
   * Call this on app startup
   */
  async initialize() {
    try {
      log("🎙️ Initializing VoiceForge TTS Engine...", "info");

      // Wait for Piper to finish initializing so we never fall back unexpectedly
      const ok = await this.engine.initializePiper();
      if (!ok) {
        throw new Error("Piper failed to initialize");
      }

      this.initialized = true;
      log("✅ TTS Engine ready (Piper active)", "info");

      return true;
    } catch (error) {
      log(`Failed to initialize TTS: ${error.message}`, "error");
      throw error;
    }
  }

  /**
   * Generate speech from text
   * Automatically uses best available engine
   */
  async generateSpeech(text, options = {}) {
    if (!this.initialized) {
      throw new Error("TTS Engine not initialized. Call initialize() first.");
    }
    if (!text || text.trim().length === 0) {
      throw new Error("Text cannot be empty");
    }
    // Optionally force Piper and wait until it's ready
    if (options.forcePiper === true) {
      if (!this.engine.piperReady) {
        log("⏳ Waiting for Piper to be ready...", "info");
        let attempts = 0;
        while (!this.engine.piperReady && attempts < 25) {
          await new Promise((r) => setTimeout(r, 200));
          attempts++;
        }
      }
      if (!this.engine.piperReady) {
        throw new Error("Piper TTS engine failed to initialize");
      }
      this.engine.setPiperEnabled(true);
    }
    log(`Generating speech: "${text.substring(0, 50)}..."`, "info");
    try {
      const result = await this.engine.synthesizeToSpeech(text, options);
      log(
        `✅ Speech generated (${result.duration.toFixed(2)}s, ${
          result.isPiper ? "Piper" : "Web Speech API"
        })`,
        "info"
      );
      return result;
    } catch (error) {
      log(`Speech generation failed: ${error.message}`, "error");
      throw error;
    }
  }

  /**
   * Play generated speech
   */
  async playSpeech(result) {
    try {
      log("Playing audio...", "info");
      await this.engine.playAudio(result);
      log("✅ Playback complete", "info");
    } catch (error) {
      log(`Playback failed: ${error.message}`, "error");
      throw error;
    }
  }

  /**
   * Download speech as WAV file
   */
  downloadWav(result, filename = "voiceforge-audio.wav") {
    try {
      const wavBlob = this.engine.exportWav(result);
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      log(`✅ Downloaded: ${filename}`, "info");
    } catch (error) {
      log(`Download failed: ${error.message}`, "error");
      throw error;
    }
  }

  /**
   * Get engine status for UI display
   */
  getStatus() {
    return this.engine.getEngineStatus();
  }

  /**
   * Get available voices
   */
  async getVoices() {
    return await this.engine.getVoices();
  }

  /**
   * Switch to Piper when ready
   */
  usePiper() {
    return this.engine.setPiperEnabled(true);
  }

  /**
   * Switch to Web Speech API
   */
  useWebSpeechAPI() {
    return this.engine.setPiperEnabled(false);
  }

  /**
   * Complete pipeline: generate → play → export
   */
  async synthesizeAndPlay(text, options = {}) {
    const result = await this.generateSpeech(text, options);
    await this.playSpeech(result);
    return result;
  }

  /**
   * Cleanup
   */
  dispose() {
    this.engine.dispose();
    this.initialized = false;
  }
}

// Export singleton instance for use across app
export const voiceForge = new PiperIntegration();

export default PiperIntegration;
