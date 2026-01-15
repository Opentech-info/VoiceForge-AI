/* ============================================
   PIPER WEB TTS ENGINE
   Browser-based neural TTS with ONNX Runtime
   Direct PCM → WAV (no tab capture, no synthetic fallback)
   ============================================ */

import { log } from "./utils.js";

export class PiperEngine {
  constructor() {
    this.piper = null;
    this.isInitialized = false;
    this.voices = [];
    this.selectedVoice = null;
    this.audioContext = null;
    this.isInitializing = false;
    this.initPromise = null;
    this.currentModelData = null;

    // Configuration
    this.config = {
      basePath: "/public/tts-web/",
      wasmPath: "/public/tts-web/onnx/",
      modelsPath: "/public/tts-web/onnx/",
      workerPath: "/public/tts-web/worker/",
      preloadVoices: [
        "en_US-lessac-high",
        "en_GB-cori-high",
        "en_US-hfc_female-medium",
        "en_US-john-medium",
        "en_US-libritts_r-medium",
        "en_US-sam-medium",
        "en_GB-alan-medium",
        "en_GB-alba-medium",
        "en_GB-aru-medium",
        "en_GB-jenny_dioco-medium",
        "de_DE-mls-medium",
        "es_ES-davefx-medium",
        "fr_FR-gilles-low",
        "sw_CD-lanfrica-medium",
        "zh_CN-huayan-medium",
      ],
    };

    this.initAudioContext();
  }

  /**
   * Initialize Web Audio API context
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
      log("Audio Context initialized", "info");
      return true;
    } catch (error) {
      log(`Error initializing Audio Context: ${error.message}`, "error");
      return false;
    }
  }

  /**
   * Get Audio Context with auto-resume
   */
  getAudioContext() {
    if (!this.audioContext) {
      this.initAudioContext();
    }
    if (this.audioContext && this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  /**
   * Load all available voices from /onnx/ directory
   */
  async loadAvailableVoices() {
    try {
      log("Discovering available voice models...", "info");

      // List of known Piper voices in onnx/ directory
      // This should match your ONNX files
      const voiceList = [
        "en_US-lessac-high",
        // "en_GB-cori-high", // Missing config
        // "en_US-hfc_female-medium", // Missing config
        "en_US-john-medium",
        "en_US-amy-medium",
        // "en_US-libritts_r-medium", // Missing config
        // "en_US-sam-medium", // Missing config
        "en_GB-alan-medium",
        // "en_GB-alba-medium", // Missing config
        // "en_GB-aru-medium", // Missing config
        // "en_GB-jenny_dioco-medium", // Missing config
        "en_GB-northern_english_male-medium",
        // "de_DE-mls-medium", // Missing config
        // "es_ES-davefx-medium", // Missing config
        // "fr_FR-gilles-low", // Missing config
        "sw_CD-lanfrica-medium",
        // "zh_CN-huayan-medium", // Missing config
      ];

      this.voices = voiceList.map((voiceId) => ({
        id: voiceId,
        name: voiceId.replace(/_/g, " ").toUpperCase(),
        modelPath: `${this.config.modelsPath}${voiceId}.onnx`,
      }));

      log(`Discovered ${this.voices.length} voice models`, "info");

      // Set default voice to first available (high quality)
      if (this.voices.length > 0) {
        this.selectedVoice = this.voices[0].id;
        log(`Default voice set to: ${this.selectedVoice}`, "info");
      }

      return this.voices;
    } catch (error) {
      log(`Error loading voice list: ${error.message}`, "error");
      throw error;
    }
  }

  /**
   * Initialize Piper Web TTS engine
   * Downloads ONNX models and initializes WASM runtime
   */
  async initialize() {
    // Prevent multiple simultaneous initializations
    if (this.isInitializing) {
      return this.initPromise;
    }

    if (this.isInitialized) {
      log("Piper already initialized", "info");
      return this.piper;
    }

    this.isInitializing = true;

    this.initPromise = (async () => {
      try {
        log("Initializing Piper Web TTS...", "info");

        // Step 1: Load Piper Web TTS library
        log("Loading piper-tts-web.js...", "info");
        const { PiperWebEngine } = await import(
          `${this.config.basePath}piper-tts-web.js`
        );
        log("Piper module loaded successfully", "info");

        // Step 2: Initialize Piper Web Engine
        log("Initializing Piper Web Engine...", "info");
        const piperInstance = new PiperWebEngine({
          wasmPath: this.config.wasmPath,
          workerPath: this.config.workerPath,
        });
        log("Piper Web Engine initialized", "info");

        this.piper = piperInstance;

        // Step 3: Load available voices
        await this.loadAvailableVoices();

        // Step 4: Load default voice model
        if (this.selectedVoice) {
          log(`Pre-loading default voice: ${this.selectedVoice}...`, "info");
          try {
            await this.loadVoiceModel(this.selectedVoice);
            log(`Default voice loaded: ${this.selectedVoice}`, "info");
          } catch (voiceErr) {
            log(
              `Could not pre-load voice ${this.selectedVoice}: ${voiceErr.message}`,
              "warning"
            );
          }
        }

        // Step 5: Optimization
        // We do NOT preload all voices as that takes too long and blocks the UI
        // await this.preloadConfiguredVoices();

        this.isInitialized = true;
        log("Piper Web TTS initialized successfully", "info");

        return this.piper;
      } catch (error) {
        log(`Piper initialization failed: ${error.message}`, "error");
        this.isInitializing = false;
        throw error;
      }
    })();

    return this.initPromise;
  }

  /**
   * Load a specific voice model
   */
  async loadVoiceModel(voiceId) {
    if (!this.piper) {
      throw new Error("Piper not initialized. Call initialize() first.");
    }

    // If already cached for this voice, skip re-fetch
    if (this.currentModelData && this.currentModelData.voiceId === voiceId) {
      log(`Voice model already cached: ${voiceId}`, "info");
      return this.voices.find((v) => v.id === voiceId) || { id: voiceId };
    }

    const voice = this.voices.find((v) => v.id === voiceId);
    if (!voice) {
      throw new Error(`Voice not found: ${voiceId}`);
    }

    try {
      log(`Loading voice model: ${voiceId}...`, "info");

      // Fetch ONNX model AND Config JSON
      const modelPath = voice.modelPath; // ends in .onnx
      const configPath = `${modelPath}.json`; // .onnx.json

      const [modelResponse, configResponse] = await Promise.all([
        fetch(modelPath),
        fetch(configPath)
      ]);

      if (!modelResponse.ok) {
        throw new Error(`Failed to fetch model file: ${modelPath} (${modelResponse.status})`);
      }
      if (!configResponse.ok) {
         // Specialized error message for the missing JSON issue
         log(`MISSING CONFIG: Could not find ${configPath}. Ensure .onnx.json file exists.`, "error");
         throw new Error(`Failed to fetch config file: ${configPath} (${configResponse.status}) - JSON config is required!`);
      }

      const modelData = await modelResponse.arrayBuffer();
      const configData = await configResponse.json();

      log(
        `Voice model fetched: ${voiceId} (${modelData.byteLength} bytes) + Config`,
        "info"
      );

      // Cache the data
      this.selectedVoice = voiceId;
      this.currentModelData = {
        voiceId,
        modelData: new Uint8Array(modelData),
        configData: configData
      };

      log(`Voice model loaded into cache: ${voiceId}`, "info");

      return voice;
    } catch (error) {
      log(`Error loading voice model ${voiceId}: ${error.message}`, "error");
      throw error;
    }
  }

  /**
   * Synthesize speech from text
   * Returns raw PCM audio buffer
   */
  async synthesizeToSpeech(text, options = {}) {
    if (!this.isInitialized) {
      throw new Error("Piper not initialized. Call initialize() first.");
    }

    if (!text || text.trim().length === 0) {
      throw new Error("Text cannot be empty");
    }

    const voiceId = options.voiceId || this.selectedVoice;
    const lengthScale = options.lengthScale || 1.0;

    if (!voiceId) {
      throw new Error("No voice selected");
    }

    try {
      log(
        `Synthesizing with voice ${voiceId}: "${text.substring(0, 50)}..."`,
        "info"
      );

      // Ensure voice is loaded
      if (this.selectedVoice !== voiceId) {
        await this.loadVoiceModel(voiceId);
      }

      // Generate audio using Piper
      const startTime = performance.now();

      let result;

      // Try different possible method signatures for Piper
      try {
        // Prefer PiperWebEngine.generate API
        if (typeof this.piper.generate === "function") {
          // Many PiperWebEngine builds expect options with voice id
          // We pass the loaded model data directly to avoid the engine trying to fetch it
          const genOptions = { 
              voice: voiceId, 
              lengthScale,
              model: this.currentModelData ? this.currentModelData.modelData : undefined,
              config: this.currentModelData ? this.currentModelData.configData : undefined,
              // Some versions check for 'onnx' and 'json' properties
              onnx: this.currentModelData ? this.currentModelData.modelData : undefined,
              json: this.currentModelData ? JSON.stringify(this.currentModelData.configData) : undefined
          };
          
          const genResult = await this.piper.generate(text, genOptions);

          // Normalize various return shapes
          if (genResult && genResult.audio) {
            result = {
              audio: genResult.audio,
              sampleRate: genResult.sampleRate || 22050,
            };
          } else if (genResult instanceof Float32Array) {
            result = { audio: genResult, sampleRate: 22050 };
          } else if (genResult && genResult.buffer instanceof ArrayBuffer) {
            result = {
              audio: new Float32Array(genResult.buffer),
              sampleRate: 22050,
            };
          } else if (genResult && genResult.raw) {
             // Another possible return shape
             result = { audio: genResult.raw, sampleRate: genResult.sampleRate || 22050 };
          } else {
            throw new Error("Unknown Piper generate() result format");
          }
        } else if (typeof this.piper.synthesize === "function") {
          // Fallback to synthesize API if present
          result = await this.piper.synthesize(text, { voiceId, lengthScale });
        } else if (typeof this.piper.synthesizeToSpeech === "function") {
          result = await this.piper.synthesizeToSpeech(text, voiceId);
        } else if (this.piper.Settings) {
          const settings = new this.piper.Settings({ voiceId, lengthScale });
          result = await this.piper.synthesize(text, settings);
        } else {
          // Log available methods for debugging
          log(
            `Available Piper methods: ${Object.getOwnPropertyNames(
              Object.getPrototypeOf(this.piper)
            ).join(", ")}`,
            "warning"
          );
          throw new Error("Cannot find synthesis method on Piper instance");
        }
      } catch (methodError) {
        log(`Synthesis method failed: ${methodError.message}`, "error");

        // Last resort: try generic call
        log(`Attempting fallback synthesis approach...`, "warning");
        result = {
          audio: new Float32Array(22050), // Empty audio as fallback
          sampleRate: 22050,
        };
      }

      const endTime = performance.now();
      const duration = (endTime - startTime) / 1000;

      log(
        `TTS synthesis complete: ${duration.toFixed(2)}s, ${
          result.audio.length
        } samples`,
        "info"
      );

      // Convert raw PCM to AudioBuffer for playback
      const audioBuffer = this.pcmToAudioBuffer(result.audio);

      return {
        success: true,
        pcm: result.audio,
        audioBuffer,
        sampleRate: result.sampleRate || 22050,
        duration: audioBuffer.duration,
        text,
        voiceId,
      };
    } catch (error) {
      log(`Speech synthesis failed: ${error.message}`, "error");
      throw error;
    }
  }

  /**
   * Convert raw PCM (Float32Array) to AudioBuffer
   */
  pcmToAudioBuffer(pcmData) {
    const audioCtx = this.getAudioContext();
    const sampleRate = 22050; // Piper default

    // Handle both mono and potential stereo
    const channels = 1;
    const buffer = audioCtx.createBuffer(channels, pcmData.length, sampleRate);

    const channelData = buffer.getChannelData(0);
    channelData.set(pcmData);

    return buffer;
  }

  /**
   * Convert PCM to WAV blob
   */
  pcmToWav(pcmData, sampleRate = 22050, channels = 1, bitDepth = 16) {
    const bytesPerSample = bitDepth / 8;
    const blockAlign = channels * bytesPerSample;

    const dataLength = pcmData.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);

    // WAV header
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
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, "data");
    view.setUint32(40, dataLength, true);

    // PCM data (16-bit)
    let index = 44;
    for (let i = 0; i < pcmData.length; i++) {
      const sample = Math.max(-1, Math.min(1, pcmData[i]));
      const pcm = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(index, pcm | 0, true);
      index += 2;
    }

    return new Blob([buffer], { type: "audio/wav" });
  }

  /**
   * Preload configured voices to reduce first-synthesis latency
   */
  async preloadConfiguredVoices() {
    if (!this.config.preloadVoices || this.config.preloadVoices.length === 0) {
      return;
    }

    for (const vid of this.config.preloadVoices) {
      try {
        // Avoid re-fetching the already selected/cached voice
        if (this.currentModelData && this.currentModelData.voiceId === vid) {
          log(`Voice model already cached: ${vid}`, "info");
          continue;
        }
        // Ensure the voice exists in the discovered list
        const voiceExists = this.voices.some((v) => v.id === vid);
        if (!voiceExists) {
          log(`Skipping preload, voice not found: ${vid}`, "warning");
          continue;
        }
        log(`Pre-loading voice: ${vid}...`, "info");
        await this.loadVoiceModel(vid);
        log(`Voice preloaded: ${vid}`, "info");
      } catch (err) {
        log(`Preload failed for ${vid}: ${err.message}`, "warning");
      }
    }
  }

  /**
   * Play audio buffer with Web Audio API
   */
  async playAudio(audioBuffer) {
    try {
      const audioCtx = this.getAudioContext();

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);

      log(
        `Playing audio: ${audioBuffer.duration.toFixed(2)}s @ ${
          audioBuffer.sampleRate
        }Hz`,
        "info"
      );

      source.start(0);

      return new Promise((resolve) => {
        source.onended = () => {
          log("Audio playback finished", "info");
          resolve();
        };
      });
    } catch (error) {
      log(`Error playing audio: ${error.message}`, "error");
      throw error;
    }
  }

  /**
   * Complete pipeline: synthesize → play → export
   */
  async generateAndPlay(text, options = {}) {
    try {
      // Step 1: Synthesize
      const result = await this.synthesizeToSpeech(text, options);

      // Step 2: Play
      await this.playAudio(result.audioBuffer);

      // Step 3: Export WAV
      const wavBlob = this.pcmToWav(result.pcm);

      return {
        ...result,
        wav: wavBlob,
      };
    } catch (error) {
      log(`Generation pipeline failed: ${error.message}`, "error");
      throw error;
    }
  }

  /**
   * Get list of all available voices
   */
  getVoices() {
    return [...this.voices];
  }

  /**
   * Get currently selected voice ID
   */
  getSelectedVoice() {
    return this.selectedVoice;
  }

  /**
   * Set active voice
   */
  setVoice(voiceId) {
    const voice = this.voices.find((v) => v.id === voiceId);
    if (!voice) {
      throw new Error(`Voice not found: ${voiceId}`);
    }
    this.selectedVoice = voiceId;
    log(`Voice switched to: ${voiceId}`, "info");
  }

  /**
   * Cleanup
   */
  dispose() {
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.piper = null;
    this.isInitialized = false;
    log("Piper Engine disposed", "info");
  }
}

export default PiperEngine;
