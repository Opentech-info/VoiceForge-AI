/* ============================================
   VOICEFORGE AI - UTILITY FUNCTIONS
   ============================================ */

/**
 * Voice Data - 10 AI voices with diverse characteristics
 */
export const SAMPLE_TEXT =
  "Hello! This is VoiceForge AI delivering studio-quality voice offline. Let's create something great together.";

export const HISTORY_STORAGE_KEY = "voiceforge-history";

export const VOICES = [
  // English (US)
  {
    id: "en_US-lessac-high",
    name: "Lessac",
    type: "Male",
    icon: "🇺🇸",
    description: "Clear, professional, high quality",
    lang: "en-US",
  },
  {
    id: "en_US-hfc_female-medium",
    name: "HFC Female",
    type: "Female",
    icon: "👩",
    description: "Bright, friendly, natural",
    lang: "en-US",
  },
  {
    id: "en_US-john-medium",
    name: "John",
    type: "Male",
    icon: "👨",
    description: "Warm, conversational, friendly",
    lang: "en-US",
  },
  {
    id: "en_US-libritts_r-medium",
    name: "LibriTTS",
    type: "Neutral",
    icon: "🎙️",
    description: "Natural, balanced, clear",
    lang: "en-US",
  },
  {
    id: "en_US-sam-medium",
    name: "Sam",
    type: "Male",
    icon: "👨‍💼",
    description: "Professional, confident, clear",
    lang: "en-US",
  },
  // English (UK)
  {
    id: "en_GB-cori-high",
    name: "Cori (UK)",
    type: "Female",
    icon: "🇬🇧",
    description: "British accent, professional",
    lang: "en-GB",
  },
  {
    id: "en_GB-alan-medium",
    name: "Alan",
    type: "Male",
    icon: "🇬🇧",
    description: "British, warm, traditional",
    lang: "en-GB",
  },
  {
    id: "en_GB-alba-medium",
    name: "Alba",
    type: "Female",
    icon: "🇬🇧",
    description: "Scottish accent, friendly",
    lang: "en-GB",
  },
  {
    id: "en_GB-aru-medium",
    name: "Aru",
    type: "Female",
    icon: "🇬🇧",
    description: "British, expressive, natural",
    lang: "en-GB",
  },
  {
    id: "en_GB-jenny_dioco-medium",
    name: "Jenny",
    type: "Female",
    icon: "🇬🇧",
    description: "British, clear, pleasant",
    lang: "en-GB",
  },
  // Other Languages
  {
    id: "de_DE-mls-medium",
    name: "Deutsch",
    type: "Neutral",
    icon: "🇩🇪",
    description: "German language, natural",
    lang: "de-DE",
  },
  {
    id: "es_ES-davefx-medium",
    name: "Español",
    type: "Male",
    icon: "🇪🇸",
    description: "Spanish language, expressive",
    lang: "es-ES",
  },
  {
    id: "fr_FR-gilles-low",
    name: "Français",
    type: "Male",
    icon: "🇫🇷",
    description: "French language, natural",
    lang: "fr-FR",
  },
  {
    id: "sw_CD-lanfrica-medium",
    name: "Swahili",
    type: "Female",
    icon: "🇨🇩",
    description: "Swahili language, clear",
    lang: "sw-CD",
  },
  {
    id: "zh_CN-huayan-medium",
    name: "中文 (Chinese)",
    type: "Female",
    icon: "🇨🇳",
    description: "Mandarin Chinese, natural",
    lang: "zh-CN",
  },
];

/**
 * Format seconds to HH:MM:SS
 */
export function formatTime(seconds) {
  if (!isFinite(seconds)) return "0:00";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const pad = (num) => String(num).padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(secs)}`;
  }
  return `${minutes}:${pad(secs)}`;
}

/**
 * Show Toast Notification
 */
export function showToast(message, type = "error", duration = 3000) {
  const toast = document.getElementById("errorToast");
  const messageEl = document.getElementById("toastMessage");

  messageEl.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.remove("hidden");

  setTimeout(() => {
    toast.classList.add("hidden");
  }, duration);
}

/**
 * Validate Text Input
 */
export function validateTextInput(text) {
  if (!text || text.trim().length === 0) {
    return {
      valid: false,
      error: "Please enter some text to convert to speech.",
    };
  }

  if (text.length > 2000) {
    return {
      valid: false,
      error: "Text is too long. Maximum 2000 characters allowed.",
    };
  }

  return { valid: true };
}

/**
 * Debounce Function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle Function
 */
export function throttle(func, limit) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Generate Unique ID
 */
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Safe Local Storage Get
 */
export function getFromStorage(key, defaultValue = null) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : defaultValue;
  } catch (error) {
    console.error(`Error reading from localStorage: ${key}`, error);
    return defaultValue;
  }
}

/**
 * Safe Local Storage Set
 */
export function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error writing to localStorage: ${key}`, error);
    return false;
  }
}

/**
 * Remove from Local Storage
 */
export function removeFromStorage(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing from localStorage: ${key}`, error);
    return false;
  }
}

/**
 * Download Blob as File
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copy Text to Clipboard
 */
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      return true;
    }
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    return false;
  }
}

/**
 * Share Audio (if Web Share API available)
 */
export async function shareAudio(blob, filename) {
  try {
    if (navigator.share) {
      const file = new File([blob], filename, { type: "audio/wav" });
      await navigator.share({
        title: "VoiceForge Audio",
        text: "Check out this audio generated by VoiceForge AI!",
        files: [file],
      });
      return true;
    } else {
      showToast("Web Share API not available on this device", "warning");
      return false;
    }
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error("Error sharing audio:", error);
      showToast("Failed to share audio", "error");
    }
    return false;
  }
}

/**
 * Get Voice by ID
 */
export function getVoiceById(voiceId) {
  return VOICES.find((v) => v.id === voiceId);
}

/**
 * Get Random Voice
 */
export function getRandomVoice() {
  return VOICES[Math.floor(Math.random() * VOICES.length)];
}

/**
 * Check Browser Support for Features
 */
export const BrowserSupport = {
  audioContext: () => {
    return (
      typeof AudioContext !== "undefined" ||
      typeof webkitAudioContext !== "undefined"
    );
  },

  webWorker: () => {
    return typeof Worker !== "undefined";
  },

  localStorage: () => {
    try {
      const test = "__localStorage_test__";
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  },

  webAssembly: () => {
    return typeof WebAssembly !== "undefined";
  },

  audioWorklet: () => {
    return (
      typeof AudioContext !== "undefined" &&
      AudioContext.prototype.hasOwnProperty("audioWorklet")
    );
  },
};

/**
 * Log with Timestamp
 */
export function log(message, level = "info") {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
}

/**
 * Clamp Number
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear Interpolation
 */
export function lerp(a, b, t) {
  return a + (b - a) * clamp(t, 0, 1);
}

/**
 * Check if Mobile Device
 */
export function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Check if Online
 */
export function isOnline() {
  return navigator.onLine;
}

/**
 * Setup Online/Offline Listeners
 */
export function setupConnectivityListeners(onOnline, onOffline) {
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);

  return () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
  };
}

/**
 * Convert Seconds to Readable Duration
 */
export function getDurationString(seconds) {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${minutes}m ${secs}s`;
}

export default {
  VOICES,
  formatTime,
  showToast,
  validateTextInput,
  debounce,
  throttle,
  generateId,
  getFromStorage,
  saveToStorage,
  removeFromStorage,
  downloadBlob,
  copyToClipboard,
  shareAudio,
  getVoiceById,
  getRandomVoice,
  BrowserSupport,
  log,
  clamp,
  lerp,
  isMobileDevice,
  isOnline,
  setupConnectivityListeners,
  getDurationString,
};
