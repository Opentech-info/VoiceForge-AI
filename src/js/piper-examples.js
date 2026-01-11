/* ============================================
   PIPER TTS - QUICK INTEGRATION EXAMPLE
   Drop this into your app.js or main controller
   ============================================ */

// Step 1: Import the integration
import { voiceForge } from "./js/piper-integration.js";
import { log } from "./js/utils.js";

/**
 * Initialize TTS engines on app startup
 * Call this in your app initialization function
 */
export async function initializeTTS() {
  try {
    log("Initializing text-to-speech engines...", "info");

    // Initialize (Web Speech API starts immediately, Piper loads in background)
    await voiceForge.initialize();

    // Get status
    const status = voiceForge.getStatus();
    log(`TTS Status: ${JSON.stringify(status)}`, "info");

    log("✅ TTS engines ready", "info");
    return true;
  } catch (error) {
    log(`⚠️ TTS initialization error: ${error.message}`, "error");
    // App continues with Web Speech API fallback
    return false;
  }
}

/**
 * Generate and play speech
 * Use this in your UI handlers
 */
export async function generateAndPlayVoice(text, options = {}) {
  try {
    if (!text || text.trim().length === 0) {
      log("Text is empty", "warning");
      return null;
    }

    log(`Generating voice: "${text.substring(0, 50)}..."`, "info");

    // Generate speech
    const result = await voiceForge.generateSpeech(text, options);

    log(
      `✅ Generated: ${result.duration.toFixed(2)}s (${
        result.isPiper ? "Piper" : "Web Speech API"
      })`,
      "info"
    );

    // Play immediately
    await voiceForge.playSpeech(result);

    return result;
  } catch (error) {
    log(`Voice generation failed: ${error.message}`, "error");
    throw error;
  }
}

/**
 * Generate voice and download as WAV
 */
export async function generateAndDownloadVoice(
  text,
  filename = null,
  options = {}
) {
  try {
    // Generate
    const result = await voiceForge.generateSpeech(text, options);

    // Download
    const downloadName = filename || `voiceforge-${Date.now()}.wav`;
    voiceForge.downloadWav(result, downloadName);

    log(`✅ Downloaded: ${downloadName}`, "info");
    return result;
  } catch (error) {
    log(`Download failed: ${error.message}`, "error");
    throw error;
  }
}

/**
 * Example: Connect to your UI
 *
 * In your HTML/UI controller:
 *
 *   <button onclick="generateVoiceFromUI()">
 *     Generate Voice
 *   </button>
 *
 *   <script>
 *     async function generateVoiceFromUI() {
 *       const text = document.getElementById("textInput").value;
 *       const voiceSelect = document.getElementById("voiceSelect");
 *
 *       try {
 *         await generateAndPlayVoice(text, {
 *           voiceId: voiceSelect.value
 *         });
 *       } catch (error) {
 *         alert("Error: " + error.message);
 *       }
 *     }
 *   </script>
 */

/**
 * Example: Populate voice selector
 */
export async function populateVoiceSelector(selectElement) {
  try {
    const voices = await voiceForge.getVoices();

    // Add Piper voices
    if (voices.piper && voices.piper.length > 0) {
      const piperGroup = document.createElement("optgroup");
      piperGroup.label = "🧠 Piper Web TTS";

      voices.piper.forEach((voice) => {
        const option = document.createElement("option");
        option.value = voice.id;
        option.textContent = voice.name;
        piperGroup.appendChild(option);
      });

      selectElement.appendChild(piperGroup);
    }

    // Add Web Speech API voices
    if (voices.webSpeech && voices.webSpeech.length > 0) {
      const speechGroup = document.createElement("optgroup");
      speechGroup.label = "🔊 Web Speech API";

      voices.webSpeech.forEach((voice, index) => {
        const option = document.createElement("option");
        option.value = `web-speech-${index}`;
        option.textContent = voice.name || `Voice ${index}`;
        speechGroup.appendChild(option);
      });

      selectElement.appendChild(speechGroup);
    }

    log("✅ Voice selector populated", "info");
  } catch (error) {
    log(`Failed to populate voices: ${error.message}`, "error");
  }
}

/**
 * Example: Integration point in your app
 *
 * In your main app.js init function:
 *
 *   async function initApp() {
 *     // ... existing initialization ...
 *
 *     // Initialize TTS
 *     await initializeTTS();
 *
 *     // Populate voice selector
 *     const voiceSelect = document.getElementById("voiceSelect");
 *     if (voiceSelect) {
 *       await populateVoiceSelector(voiceSelect);
 *     }
 *
 *     // ... rest of app ...
 *   }
 */

/**
 * Check if generated audio is silent (quality validation)
 * Returns true if audio is silent/broken, false if valid
 */
export function isSilent(result, threshold = 0.001) {
  try {
    // Check if result has audio data
    if (!result || !result.audioBuffer) {
      log("⚠️ No audio buffer in result", "warning");
      return true;
    }

    const audioBuffer = result.audioBuffer;
    const channelData = audioBuffer.getChannelData(0); // Get first channel

    // Calculate RMS (Root Mean Square) of audio signal
    let sumSquares = 0;
    let peakAmplitude = 0;

    for (let i = 0; i < channelData.length; i++) {
      const sample = Math.abs(channelData[i]);
      sumSquares += sample * sample;
      if (sample > peakAmplitude) {
        peakAmplitude = sample;
      }
    }

    const rms = Math.sqrt(sumSquares / channelData.length);

    log(
      `🔊 Audio Analysis: RMS=${rms.toFixed(4)}, Peak=${peakAmplitude.toFixed(
        4
      )}, Duration=${audioBuffer.duration.toFixed(2)}s`,
      "info"
    );

    // Audio is silent if RMS is below threshold
    const isSilent = rms < threshold;

    if (isSilent) {
      log("❌ Audio is SILENT (no speech detected)", "error");
    } else {
      log("✅ Audio is VALID (speech detected)", "info");
    }

    return isSilent;
  } catch (error) {
    log(`Error checking audio silence: ${error.message}`, "error");
    return true; // Assume silent on error
  }
}

/**
 * Generate voice with silence detection
 * Automatically retries if silent audio is detected
 */
export async function generateWithValidation(
  text,
  options = {},
  maxRetries = 2
) {
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      log(`🎤 Generation attempt ${attempt + 1}/${maxRetries}...`, "info");

      // Generate speech
      const result = await voiceForge.generateSpeech(text, options);

      // Check if silent
      if (isSilent(result)) {
        log(
          `⚠️ Attempt ${attempt + 1} produced silent audio, retrying...`,
          "warning"
        );
        attempt++;
        continue;
      }

      // Success! Audio is valid
      log("✅ Valid audio generated successfully", "info");
      return result;
    } catch (error) {
      log(`❌ Attempt ${attempt + 1} failed: ${error.message}`, "error");
      attempt++;

      if (attempt >= maxRetries) {
        throw new Error(
          `Failed to generate valid audio after ${maxRetries} attempts: ${error.message}`
        );
      }
    }
  }

  throw new Error(
    "Failed to generate valid audio (all attempts produced silence)"
  );
}

/**
 * Complete usage example with validation
 *
 * BASIC USAGE:
 * ============
 * import { initializeTTS, generateAndPlayVoice } from "./piper-examples.js";
 *
 * await initializeTTS();
 * const result = await generateAndPlayVoice("Hello world");
 *
 *
 * WITH SILENCE DETECTION:
 * =======================
 * import { generateWithValidation, isSilent } from "./piper-examples.js";
 *
 * const result = await generateWithValidation("Hello world");
 * if (!isSilent(result)) {
 *   await voiceForge.playSpeech(result);
 *   voiceForge.downloadWav(result);
 * }
 *
 *
 * COMPLETE PIPELINE:
 * ==================
 * async function generateVoice() {
 *   const text = document.getElementById("textInput").value;
 *
 *   try {
 *     // Generate with automatic validation
 *     const result = await generateWithValidation(text, {
 *       voiceId: "zh_CN-huayan-medium" // Chinese
 *     });
 *
 *     // Play
 *     await voiceForge.playSpeech(result);
 *
 *     // Download
 *     voiceForge.downloadWav(result, "chinese-voice.wav");
 *
 *     alert("✅ Success!");
 *   } catch (error) {
 *     alert("❌ Error: " + error.message);
 *   }
 * }
 *
 *
 * MANUAL VALIDATION:
 * ==================
 * const result = await voiceForge.generateSpeech("Hello");
 *
 * if (isSilent(result)) {
 *   console.error("Generated audio is silent!");
 *   // Retry or show error
 * } else {
 *   console.log("Audio is valid!");
 *   // Play or download
 * }
 */

export { voiceForge };
