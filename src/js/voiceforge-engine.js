/* ============================================
   PIPER TTS INTEGRATION MODULE
   Seamless integration between AudioEngine (Web Speech API)
   and PiperEngine (Neural TTS)
   ============================================ */

import { log } from "./utils.js";
import AudioEngine from "./audio-engine.js";
import PiperEngine from "./piper-engine.js";

export class VoiceForgeEngine {
  constructor() {
    this.audioEngine = new AudioEngine();
    this.piperEngine = new PiperEngine();
    this.usePiper = false; // Will be set to true when Piper is ready
    this.piperReady = false;
  }

  /**
   * Initialize Piper Web TTS in background
   * Non-blocking - continues with Web Speech API fallback
   * Note: Piper Web TTS API is complex and requires further research
   * For now, we rely on Web Speech API which works reliably
   */
  async initializePiper() {
    if (this.piperReady) {
      log("Piper already initialized", "info");
      return true;
    }

    try {
      log("Initializing Piper Web TTS...", "info");
      await this.piperEngine.initialize();
      this.piperReady = true;
      this.usePiper = true; // default to Piper once ready
      log(
        "✅ Piper Web TTS ready and ACTIVE (neural synthesis enabled)",
        "info"
      );
      return true;
    } catch (error) {
      log(
        `⚠️ Piper initialization failed: ${error.message}, using Web Speech API fallback`,
        "warning"
      );
      this.usePiper = false;
      this.piperReady = false;
      return false;
    }
  }

  /**
   * Generate speech with automatic engine selection
   * Tries Piper first, falls back to Web Speech API
   */
  async synthesizeToSpeech(text, options = {}) {
    if (!text || text.trim().length === 0) {
      throw new Error("Text cannot be empty");
    }

    // ✅ FORCE PIPER FIRST if available
    if (this.piperReady && this.usePiper) {
      try {
        log("🚀 Using Piper Web TTS for synthesis (ACTIVE)", "info");
        const result = await this.piperEngine.synthesizeToSpeech(text, options);

        // Convert to format compatible with existing code
        return {
          success: true,
          blob: this.piperEngine.pcmToWav(result.pcm),
          duration: result.duration,
          text,
          voiceId: result.voiceId,
          isPiper: true,
          rawAudio: result.audioBuffer,
        };
      } catch (piperError) {
        log(
          `Piper synthesis failed: ${piperError.message}, falling back to Web Speech API`,
          "warning"
        );
        this.usePiper = false;
      }
    }

    // Fallback to Web Speech API
    log("Using Web Speech API for synthesis", "info");
    return await this.audioEngine.synthesizeToSpeech(text, options);
  }

  /**
   * Play audio from synthesis result
   */
  async playAudio(result) {
    if (result.isPiper && result.rawAudio) {
      // Use Web Audio API for Piper output
      return await this.piperEngine.playAudio(result.rawAudio);
    } else if (result.blob) {
      // Use existing AudioEngine playback
      return await this.audioEngine.playAudio(result.blob);
    }
  }

  /**
   * Get available voices
   * Combines Piper and Web Speech API voices
   */
  async getVoices() {
    const voices = {
      webSpeech: this.audioEngine.isSpeechSupported()
        ? window.speechSynthesis.getVoices()
        : [],
      piper: this.piperReady ? this.piperEngine.getVoices() : [],
    };

    return voices;
  }

  /**
   * Switch between TTS engines
   */
  setPiperEnabled(enabled) {
    if (enabled && !this.piperReady) {
      log("Piper not ready yet. Initialize first.", "warning");
      return false;
    }
    this.usePiper = enabled;
    const engine = enabled ? "Piper Web TTS" : "Web Speech API";
    log(`Switched to: ${engine}`, "info");
    return true;
  }

  /**
   * Get current engine status
   */
  getEngineStatus() {
    return {
      piperInitialized: this.piperReady,
      piperActive: this.usePiper,
      webSpeechAvailable: this.audioEngine.isSpeechSupported(),
      activeEngine:
        this.usePiper && this.piperReady ? "Piper" : "Web Speech API",
    };
  }

  /**
   * Export audio as WAV
   */
  exportWav(result) {
    if (result.isPiper) {
      // Already WAV
      return result.blob;
    } else if (result.blob) {
      // Web Speech API synthetic audio (already WAV)
      return result.blob;
    }
    throw new Error("Cannot export audio: invalid result format");
  }

  /**
   * Cleanup
   */
  dispose() {
    this.audioEngine.dispose();
    this.piperEngine.dispose();
    log("VoiceForge Engine disposed", "info");
  }
}

export default VoiceForgeEngine;
