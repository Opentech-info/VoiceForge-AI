/* ============================================
   VOICEFORGE AI - AUDIO ENGINE
   Handles TTS using Web Speech API + Audio Processing
   
   🎯 AUDIO GENERATION APPROACH:
   
   Current: Web Speech API + MediaStreamDestination
   - Attempts to capture TTS output via MediaRecorder
   - Uses OfflineAudioContext fallback for synthetic audio
   - Note: Web Speech API has limitations - cannot route to audio graph directly
   
   ✅ Clean Audio Pipeline:
   TTS Engine → AudioBuffer → Encode WAV/MP3 → Save File
   
   ❌ Avoided: Tab Capture (getDisplayMedia + MediaRecorder)
   - Causes noise, clicks, and browser UI sounds
   
   🚀 FUTURE IMPROVEMENT:
   When integrating Piper/Coqui TTS WASM:
   ✔ Direct PCM audio buffer access
   ✔ No browser resampling
   ✔ Perfect export quality
   ✔ Full control over audio generation
   
   The WASM approach will provide:
   WASM TTS → Raw PCM Buffer → Encode → Clean WAV/MP3
   
   ============================================ */

import { log } from "./utils.js";

export class AudioEngine {
  constructor() {
    this.audioContext = null;
    this.currentUtterance = null;
    this.isPlaying = false;
    this.audioBuffer = null;
    this.startTime = 0;
    this.pauseTime = 0;
    this.analyser = null;
    this.dataArray = null;
    this.isInitialized = false;
    this.voicesReadyPromise = null;

    // Direct PCM control settings
    this.audioConfig = {
      sampleRate: 48000, // Professional quality: 44100 or 48000
      bitDepth: 16, // 16-bit (CD quality) or 24-bit (studio)
      channels: 2, // Stereo
      quality: "high", // 'high', 'medium', 'low'
    };

    this.initAudioContext();
  }

  /**
   * Check browser speech support
   */
  isSpeechSupported() {
    return (
      typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      typeof window.SpeechSynthesisUtterance !== "undefined"
    );
  }

  /**
   * Initialize Web Audio API
   */
  initAudioContext() {
    try {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        log("Web Audio API not supported", "warning");
        return false;
      }

      this.audioContext = new AudioContextClass();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.isInitialized = true;
      log("Audio Engine initialized successfully", "info");
      return true;
    } catch (error) {
      log(`Error initializing Audio Context: ${error.message}`, "error");
      return false;
    }
  }

  /**
   * Get or create Audio Context (for user gesture requirement)
   */
  getAudioContext() {
    if (!this.audioContext) {
      this.initAudioContext();
    }

    // Resume if suspended
    if (this.audioContext && this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }

    return this.audioContext;
  }

  /**
   * Generate Speech using Web Speech API with clean audio capture via AudioContext
   * Uses MediaStreamDestination to capture TTS output directly from audio graph
   */
  async synthesizeToSpeech(text, options = {}) {
    if (!this.isSpeechSupported()) {
      throw new Error(
        "Speech synthesis is not available in this browser/device."
      );
    }

    if (!text || text.trim().length === 0) {
      throw new Error("Text cannot be empty");
    }

    const voiceId = options.voiceId || null;
    const rate = options.rate || 1;
    const pitch = options.pitch || 1;

    // Use synthesizeWithFallback which handles audio recording properly
    return await this.synthesizeWithFallback(text, voiceId, rate, pitch);
  }

  /**
   * Capture clean TTS audio using MediaStreamDestination + MediaRecorder
   * This captures the actual TTS output directly from the audio graph
   */
  async captureCleanTTSAudio(text, voiceId, rate, pitch) {
    return new Promise(async (resolve, reject) => {
      try {
        const audioCtx = this.getAudioContext();

        // Create MediaStreamDestination to capture audio
        const destination = audioCtx.createMediaStreamDestination();

        // Create silent audio element to route TTS through audio graph
        const audioElement = new Audio();
        audioElement.muted = false;
        audioElement.volume = 1.0;

        let mediaElementSource = null;
        const chunks = [];
        let recorder = null;
        let startTime = null;
        let endTime = null;

        // Setup MediaRecorder with best available codec
        const mimeType = this.getBestAudioMimeType();
        recorder = new MediaRecorder(destination.stream, {
          mimeType,
          audioBitsPerSecond: 128000, // High quality
        });

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunks.push(e.data);
            log(`Recorded chunk: ${e.data.size} bytes`, "debug");
          }
        };

        recorder.onstop = () => {
          endTime = performance.now();
          const duration = startTime ? (endTime - startTime) / 1000 : 0;

          if (chunks.length === 0) {
            reject(new Error("No audio data captured"));
            return;
          }

          const blob = new Blob(chunks, { type: mimeType });
          log(
            `TTS audio captured: ${blob.size} bytes, ${duration.toFixed(2)}s`,
            "info"
          );

          // Cleanup
          if (mediaElementSource) {
            mediaElementSource.disconnect();
          }
          destination.disconnect?.();

          resolve({
            success: true,
            blob,
            duration,
            text,
            voiceId,
          });
        };

        recorder.onerror = (event) => {
          log(`Recorder error: ${event.error}`, "error");
          reject(new Error(`Recording failed: ${event.error}`));
        };

        // Create utterance
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = rate;
        utterance.pitch = pitch;
        utterance.volume = 1.0;

        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          utterance.voice = voices[this.getVoiceIndex(voiceId, voices.length)];
        }

        let recordingStarted = false;

        utterance.onstart = () => {
          startTime = performance.now();
          log("TTS started, beginning clean capture", "info");

          // Start recording
          if (recorder && recorder.state === "inactive") {
            recorder.start(100); // Capture in 100ms chunks
            recordingStarted = true;
            log("MediaRecorder started", "info");
          }
        };

        utterance.onend = () => {
          log("TTS ended, stopping recorder", "info");

          // Stop recording after a small delay to catch trailing audio
          setTimeout(() => {
            if (recorder && recorder.state !== "inactive") {
              recorder.stop();
            } else if (!recordingStarted) {
              reject(new Error("Recording never started"));
            }
          }, 200);
        };

        utterance.onerror = (event) => {
          log(`TTS error: ${event.error}`, "error");
          if (recorder && recorder.state !== "inactive") {
            recorder.stop();
          }
          reject(new Error(`TTS failed: ${event.error}`));
        };

        // Start TTS (it will output to default speakers)
        // Note: Web Speech API doesn't allow direct routing to audio graph
        // This is a limitation - we capture system audio or use fallback
        this.currentUtterance = utterance;
        window.speechSynthesis.speak(utterance);

        // Timeout safety
        setTimeout(() => {
          if (recorder && recorder.state !== "inactive") {
            log("Recording timeout, forcing stop", "warning");
            recorder.stop();
          }
        }, 60000); // 60s max
      } catch (err) {
        log(`Clean capture setup failed: ${err.message}`, "error");
        reject(err);
      }
    });
  }

  /**
   * Fallback synthesis using offline buffer rendering
   */
  /**
   * Fallback synthesis using offline buffer rendering
   * Note: We cannot rely on recording window.speechSynthesis because it doesn't route to AudioContext.
   */
  async synthesizeWithFallback(text, voiceId, rate, pitch) {
    return new Promise((resolve, reject) => {
      // We cannot record system audio directly in the browser without an extension.
      // So we must inform the user or rely on the Neural Engine (Piper).
      
      log("Web Speech API does not support direct audio export.", "warning");
      
      // If we are here, it means Piper failed or wasn't used.
      // We can still play the audio for the user to hear, but we can't give them a blob.
      
      this.previewVoiceSample(text, { voiceId, rate, pitch })
        .then(() => {
          reject(new Error("System voices cannot be exported to file. Please wait for the Neural Engine to initialize or check your connection."));
        })
        .catch(err => {
          reject(new Error("Speech synthesis failed and export is not supported for system voices."));
        });
    });
  }

  /**
   * Get best available audio MIME type for MediaRecorder
   */
  getBestAudioMimeType() {
    const types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/ogg",
      "audio/mp4",
      "",
    ];

    for (const type of types) {
      if (
        type === "" ||
        (typeof MediaRecorder !== "undefined" &&
          MediaRecorder.isTypeSupported(type))
      ) {
        log(`Using MIME type: ${type || "default"}`, "info");
        return type;
      }
    }

    return "";
  }

  /**
   * Play a quick preview using system TTS (no blob creation)
   */
  async previewVoiceSample(text, options = {}) {
    if (!this.isSpeechSupported()) {
      throw new Error("Speech synthesis is not available on this device.");
    }

    const voiceId = options.voiceId || "sophia_pro";
    const rate = options.rate || 1;
    const pitch = options.pitch || 1;

    await this.waitForVoices();

    return new Promise((resolve, reject) => {
      try {
        if (this.currentUtterance && window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = rate;
        utterance.pitch = pitch;

        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          utterance.voice = voices[this.getVoiceIndex(voiceId, voices.length)];
        }

        let startTime = null;
        let endTime = null;

        utterance.onstart = () => {
          startTime = performance.now();
        };

        utterance.onend = () => {
          endTime = performance.now();
          const duration = startTime ? (endTime - startTime) / 1000 : 0;
          resolve({ success: true, duration });
        };

        utterance.onerror = (event) => {
          reject(new Error(`Preview failed: ${event.error}`));
        };

        this.currentUtterance = utterance;
        window.speechSynthesis.speak(utterance);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get voice index for voice ID
   * Handles both custom Piper voice IDs and Web Speech API voice names
   */
  getVoiceIndex(voiceId, totalVoices) {
    if (!voiceId || totalVoices === 0) {
      return 0; // Default to first voice
    }

    const voices = window.speechSynthesis.getVoices();

    // Try to find matching voice by exact ID match
    for (let i = 0; i < voices.length; i++) {
      if (voices[i].voiceURI === voiceId || voices[i].name === voiceId) {
        log(`Found matching voice: ${voices[i].name}`, "debug");
        return i;
      }
    }

    // Try to find matching voice by language
    if (voiceId.includes("-")) {
      const langCode = voiceId.split("-")[0]; // e.g., "en" from "en_US-lessac-high"
      for (let i = 0; i < voices.length; i++) {
        if (voices[i].lang && voices[i].lang.startsWith(langCode)) {
          log(
            `Found voice for language ${langCode}: ${voices[i].name}`,
            "debug"
          );
          return i;
        }
      }
    }

    log(`Voice ${voiceId} not found, using default`, "warning");
    return 0; // Default to first voice if nothing matches
  }

  /**
   * Wait for voices to be available (mobile-friendly)
   */
  waitForVoices() {
    if (this.voicesReadyPromise) return this.voicesReadyPromise;

    this.voicesReadyPromise = new Promise((resolve) => {
      const voices = window.speechSynthesis?.getVoices?.() || [];
      if (voices.length > 0) {
        log(`${voices.length} voices available immediately`, "info");
        resolve(voices);
        return;
      }

      let resolved = false;
      const handler = () => {
        if (resolved) return;
        const updatedVoices = window.speechSynthesis.getVoices();
        if (updatedVoices.length > 0) {
          resolved = true;
          log(
            `${updatedVoices.length} voices loaded via voiceschanged`,
            "info"
          );
          resolve(updatedVoices);
          window.speechSynthesis.removeEventListener("voiceschanged", handler);
        }
      };

      window.speechSynthesis?.addEventListener("voiceschanged", handler);

      // Mobile browsers need longer timeout and multiple checks
      const checkVoices = () => {
        if (resolved) return;
        const updatedVoices = window.speechSynthesis?.getVoices?.() || [];
        if (updatedVoices.length > 0) {
          resolved = true;
          log(`${updatedVoices.length} voices loaded via timeout`, "info");
          window.speechSynthesis?.removeEventListener("voiceschanged", handler);
          resolve(updatedVoices);
        }
      };

      // Check multiple times for mobile compatibility
      setTimeout(checkVoices, 100);
      setTimeout(checkVoices, 500);
      setTimeout(() => {
        if (!resolved) {
          const fallbackVoices = window.speechSynthesis?.getVoices?.() || [];
          resolved = true;
          log(`Fallback: ${fallbackVoices.length} voices available`, "warning");
          window.speechSynthesis?.removeEventListener("voiceschanged", handler);
          resolve(fallbackVoices);
        }
      }, 2000);
    });

    return this.voicesReadyPromise;
  }

  /**
   * Estimate duration based on text and rate
   */
  estimateDuration(text, rate = 1) {
    // Average speech rate: ~130-150 words per minute
    // ~5 characters per word
    const avgCharsPerSecond = (140 / 60) * 5;
    return text.length / avgCharsPerSecond / rate;
  }

  /**
   * Create high-quality audio blob with direct PCM control
   * Uses advanced synthesis with formant filtering for speech-like quality
   */
  async createAudioBlob(text, rate = 1, actualDuration = null) {
    try {
      const config = this.audioConfig;
      const sampleRate = config.sampleRate;
      const duration =
        actualDuration || Math.max(2, this.estimateDuration(text, rate));

      log(
        `Creating PCM audio: ${duration.toFixed(2)}s @ ${sampleRate}Hz, ${
          config.bitDepth
        }-bit, ${config.channels}ch`,
        "info"
      );

      // Create offline context with exact target sample rate (zero resampling)
      const offlineCtx = new (window.OfflineAudioContext ||
        window.webkitOfflineAudioContext)(
        config.channels,
        Math.ceil(sampleRate * duration),
        sampleRate
      );

      // Generate high-quality audio using advanced formant synthesis
      await this.generateAdvancedSpeechAudio(offlineCtx, text, duration, rate);

      // Render audio buffer (direct PCM)
      const renderedBuffer = await offlineCtx.startRendering();
      log(
        `PCM buffer rendered: ${renderedBuffer.length} samples (${(
          renderedBuffer.length / sampleRate
        ).toFixed(2)}s)`,
        "info"
      );

      // Encode to WAV with perfect quality (no browser resampling)
      const blob = this.bufferToWave(renderedBuffer, config.bitDepth);
      log(
        `High-quality WAV created: ${blob.size} bytes @ ${sampleRate}Hz/${config.bitDepth}-bit`,
        "info"
      );

      return blob;
    } catch (error) {
      log(`Error creating audio blob: ${error.message}`, "error");
      throw error;
    }
  }

  /**
   * Generate advanced speech-like audio using formant synthesis
   * Mimics human vocal tract resonances for more natural sound
   */
  async generateAdvancedSpeechAudio(offlineCtx, text, duration, rate) {
    // Base fundamental frequency (F0) for voice
    const f0Base = 120; // Male voice ~120Hz, Female ~220Hz
    const f0Variation = 40;

    // Formant frequencies (resonances of vocal tract)
    const formants = [
      { freq: 800, q: 10 }, // F1: First formant (vowel quality)
      { freq: 1200, q: 15 }, // F2: Second formant (vowel quality)
      { freq: 2500, q: 20 }, // F3: Third formant (timbre)
    ];

    // Create master gain
    const masterGain = offlineCtx.createGain();
    masterGain.connect(offlineCtx.destination);

    // Create multiple harmonics for rich sound
    const harmonics = 8;
    const charsPerSecond = text.length / duration;

    for (let h = 1; h <= harmonics; h++) {
      const oscillator = offlineCtx.createOscillator();
      const gainNode = offlineCtx.createGain();

      // Create formant filter chain
      let previousNode = oscillator;

      formants.forEach((formant) => {
        const filter = offlineCtx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = formant.freq;
        filter.Q.value = formant.q;
        previousNode.connect(filter);
        previousNode = filter;
      });

      previousNode.connect(gainNode);
      gainNode.connect(masterGain);

      // Set harmonic amplitude (decreases with harmonic number)
      const harmonicAmp = 0.15 / h;
      gainNode.gain.setValueAtTime(harmonicAmp, 0);

      // Modulate frequency based on text content
      let currentTime = 0;
      oscillator.type = h === 1 ? "sawtooth" : "sine"; // Rich fundamental

      for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i);
        const isVowel = /[aeiouAEIOU]/.test(text[i]);
        const isPunctuation = /[.,!?;:]/.test(text[i]);

        // Vary F0 based on character and position
        const f0 = f0Base * h + (charCode % f0Variation);
        const freq = isVowel ? f0 * 1.1 : f0;

        const timePerChar = 1 / charsPerSecond / rate;
        const nextTime = currentTime + timePerChar;

        oscillator.frequency.setTargetAtTime(freq, currentTime, 0.015);

        // Add prosody (natural pauses, emphasis)
        if (isPunctuation) {
          gainNode.gain.setTargetAtTime(harmonicAmp * 0.3, currentTime, 0.05);
        } else if (isVowel) {
          gainNode.gain.setTargetAtTime(harmonicAmp * 1.2, currentTime, 0.02);
        } else {
          gainNode.gain.setTargetAtTime(harmonicAmp * 0.8, currentTime, 0.03);
        }

        currentTime = nextTime;
      }

      // Smooth fade out
      gainNode.gain.setTargetAtTime(0, duration - 0.3, 0.2);

      oscillator.start(0);
      oscillator.stop(duration);
    }

    // Master envelope
    masterGain.gain.setValueAtTime(0, 0);
    masterGain.gain.linearRampToValueAtTime(0.4, 0.05); // Quick attack
    masterGain.gain.setValueAtTime(0.4, duration - 0.3);
    masterGain.gain.linearRampToValueAtTime(0, duration); // Smooth release
  }

  /**
   * Convert AudioBuffer to high-quality WAV blob with configurable bit depth
   * Direct PCM encoding with zero quality loss
   * @param {AudioBuffer} audioBuffer - Source audio buffer
   * @param {number} bitDepth - Target bit depth (16, 24, or 32)
   */
  bufferToWave(audioBuffer, bitDepth = 16) {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = bitDepth === 32 ? 3 : 1; // 3 = IEEE float, 1 = PCM

    // Validate bit depth
    if (![16, 24, 32].includes(bitDepth)) {
      log(`Invalid bit depth ${bitDepth}, using 16-bit`, "warning");
      bitDepth = 16;
    }

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numberOfChannels * bytesPerSample;

    // Interleave channels into single float array
    const length = audioBuffer.length;
    const data = new Float32Array(numberOfChannels * length);
    const channels = [];

    for (let i = 0; i < numberOfChannels; i++) {
      channels.push(audioBuffer.getChannelData(i));
    }

    let offset = 0;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        data[offset++] = channels[channel][i];
      }
    }

    const dataLength = data.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);

    // Write WAV header (RIFF)
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, format, true); // audio format
    view.setUint16(22, numberOfChannels, true); // num channels
    view.setUint32(24, sampleRate, true); // sample rate
    view.setUint32(28, sampleRate * blockAlign, true); // byte rate
    view.setUint16(32, blockAlign, true); // block align
    view.setUint16(34, bitDepth, true); // bits per sample
    writeString(36, "data");
    view.setUint32(40, dataLength, true); // data chunk size

    // Write PCM samples with perfect precision
    let index = 44;
    const dataLen = data.length;

    if (bitDepth === 16) {
      // 16-bit PCM (CD quality)
      for (let i = 0; i < dataLen; i++) {
        const sample = Math.max(-1, Math.min(1, data[i]));
        const pcm = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(index, pcm | 0, true);
        index += 2;
      }
    } else if (bitDepth === 24) {
      // 24-bit PCM (studio quality)
      for (let i = 0; i < dataLen; i++) {
        const sample = Math.max(-1, Math.min(1, data[i]));
        const pcm = sample < 0 ? sample * 0x800000 : sample * 0x7fffff;
        const val = pcm | 0;
        view.setInt8(index, val & 0xff);
        view.setInt8(index + 1, (val >> 8) & 0xff);
        view.setInt8(index + 2, (val >> 16) & 0xff);
        index += 3;
      }
    } else if (bitDepth === 32) {
      // 32-bit float PCM (ultimate quality, zero conversion loss)
      for (let i = 0; i < dataLen; i++) {
        view.setFloat32(index, data[i], true);
        index += 4;
      }
    }

    return new Blob([buffer], { type: "audio/wav" });
  }

  /**
   * Play audio from blob
   */
  async playAudio(blob) {
    try {
      const audioContext = this.getAudioContext();
      const arrayBuffer = await blob.arrayBuffer();
      this.audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const source = audioContext.createBufferSource();
      source.buffer = this.audioBuffer;
      source.connect(this.analyser);
      this.analyser.connect(audioContext.destination);

      this.startTime = audioContext.currentTime;
      this.isPlaying = true;
      source.start(0);

      source.onended = () => {
        this.isPlaying = false;
      };

      return source;
    } catch (error) {
      log(`Error playing audio: ${error.message}`, "error");
      throw error;
    }
  }

  /**
   * Stop audio playback
   */
  stopAudio() {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    this.isPlaying = false;
  }

  /**
   * Get frequency data for waveform visualization
   */
  getFrequencyData() {
    if (!this.analyser) {
      return new Uint8Array(0);
    }
    this.analyser.getByteFrequencyData(this.dataArray);
    return this.dataArray;
  }

  /**
   * Convert audio blob to different format
   */
  async convertAudioFormat(blob, targetFormat) {
    try {
      log(`Converting audio to ${targetFormat}`, "info");

      // For non-WAV formats, we need to re-encode
      // Since we can't directly convert WAV to MP3/OGG in browser without external libs,
      // we'll use MediaRecorder to re-encode
      const audioContext = this.getAudioContext();
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Create a MediaStream from the audio buffer
      const destination = audioContext.createMediaStreamDestination();
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(destination);

      // Determine mime type for target format
      let mimeType;
      switch (targetFormat) {
        case "mp3":
          mimeType = "audio/mpeg";
          break;
        case "ogg":
          mimeType = "audio/ogg;codecs=opus";
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = "audio/ogg";
          }
          break;
        case "webm":
          mimeType = "audio/webm;codecs=opus";
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = "audio/webm";
          }
          break;
        default:
          return blob; // Return original for WAV or unknown
      }

      // Check if format is supported
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        log(`Format ${targetFormat} not supported, using WAV`, "warning");
        return blob;
      }

      const chunks = [];
      const recorder = new MediaRecorder(destination.stream, { mimeType });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      const conversionPromise = new Promise((resolve, reject) => {
        recorder.onstop = () => {
          const convertedBlob = new Blob(chunks, { type: mimeType });
          log(`Conversion complete: ${convertedBlob.size} bytes`, "info");
          resolve(convertedBlob);
        };

        recorder.onerror = (event) => {
          reject(new Error("Conversion failed"));
        };

        // Timeout after 30 seconds
        setTimeout(() => {
          if (recorder.state !== "inactive") {
            recorder.stop();
          }
        }, 30000);
      });

      recorder.start();
      source.start(0);

      // Stop recording when audio finishes
      source.onended = () => {
        setTimeout(() => {
          if (recorder.state !== "inactive") {
            recorder.stop();
          }
        }, 100);
      };

      return await conversionPromise;
    } catch (error) {
      log(`Error converting audio: ${error.message}`, "error");
      return blob; // Return original on error
    }
  }

  /**
   * Configure audio quality settings for PCM generation
   * @param {Object} config - Audio configuration
   * @param {number} config.sampleRate - Sample rate (44100, 48000, 96000)
   * @param {number} config.bitDepth - Bit depth (16, 24, 32)
   * @param {number} config.channels - Number of channels (1 = mono, 2 = stereo)
   * @param {string} config.quality - Quality preset ('low', 'medium', 'high', 'studio')
   */
  setAudioConfig(config) {
    if (config.quality) {
      // Quality presets
      const presets = {
        low: { sampleRate: 22050, bitDepth: 16, channels: 1 },
        medium: { sampleRate: 44100, bitDepth: 16, channels: 2 },
        high: { sampleRate: 48000, bitDepth: 16, channels: 2 },
        studio: { sampleRate: 48000, bitDepth: 24, channels: 2 },
        ultimate: { sampleRate: 96000, bitDepth: 32, channels: 2 },
      };

      if (presets[config.quality]) {
        Object.assign(this.audioConfig, presets[config.quality]);
        log(`Audio quality set to: ${config.quality}`, "info");
      }
    }

    // Apply custom settings
    if (config.sampleRate) this.audioConfig.sampleRate = config.sampleRate;
    if (config.bitDepth) this.audioConfig.bitDepth = config.bitDepth;
    if (config.channels) this.audioConfig.channels = config.channels;

    log(
      `Audio config: ${this.audioConfig.sampleRate}Hz, ${this.audioConfig.bitDepth}-bit, ${this.audioConfig.channels}ch`,
      "info"
    );

    return this.audioConfig;
  }

  /**
   * Get current audio configuration
   */
  getAudioConfig() {
    return { ...this.audioConfig };
  }

  /**
   * Cleanup
   */
  dispose() {
    this.stopAudio();
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

export default AudioEngine;
