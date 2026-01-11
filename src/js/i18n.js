/* ============================================
   INTERNATIONALIZATION (i18n) MODULE
   Handles multi-language support
   ============================================ */

export class I18n {
  constructor() {
    this.currentLanguage = this.getStoredLanguage() || "en";
    this.translations = {};
    this.initialized = false;
  }

  /**
   * Initialize i18n and load translation files
   */
  async init() {
    try {
      // Load English translations
      const enResponse = await fetch("/i18n/en.json");
      this.translations.en = await enResponse.json();

      // Load Swahili translations
      const swResponse = await fetch("/i18n/sw.json");
      this.translations.sw = await swResponse.json();

      this.initialized = true;
      console.log(`[i18n] Initialized with language: ${this.currentLanguage}`);

      // Dispatch event when ready
      window.dispatchEvent(
        new CustomEvent("i18nReady", {
          detail: { language: this.currentLanguage },
        })
      );

      return true;
    } catch (error) {
      console.error("[i18n] Failed to initialize:", error);
      return false;
    }
  }

  /**
   * Get translation for a key
   */
  t(key, defaultValue = key) {
    const parts = key.split(".");
    let value = this.translations[this.currentLanguage];

    for (const part of parts) {
      if (value && typeof value === "object" && part in value) {
        value = value[part];
      } else {
        return defaultValue;
      }
    }

    return value || defaultValue;
  }

  /**
   * Set language and update UI
   */
  setLanguage(lang) {
    if (!this.translations[lang]) {
      console.warn(`[i18n] Language ${lang} not available`);
      return false;
    }

    this.currentLanguage = lang;
    localStorage.setItem("voiceforge-language", lang);

    // Dispatch language change event
    window.dispatchEvent(
      new CustomEvent("languageChanged", { detail: { language: lang } })
    );

    // Update all translatable elements
    this.updatePageTranslations();

    console.log(`[i18n] Language changed to: ${lang}`);
    return true;
  }

  /**
   * Get current language
   */
  getLanguage() {
    return this.currentLanguage;
  }

  /**
   * Get stored language preference
   */
  getStoredLanguage() {
    return localStorage.getItem("voiceforge-language");
  }

  /**
   * Get all available languages
   */
  getAvailableLanguages() {
    return {
      en: { name: "English", flag: "🇺🇸" },
      sw: { name: "Swahili", flag: "🇹🇿" },
    };
  }

  /**
   * Update all translatable elements on page
   */
  updatePageTranslations() {
    // Update text nodes with data-i18n attribute
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const key = element.getAttribute("data-i18n");
      const translation = this.t(key);

      if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
        if (element.getAttribute("data-i18n-placeholder")) {
          element.placeholder = translation;
        } else {
          element.value = translation;
        }
      } else {
        element.textContent = translation;
      }
    });

    // Update placeholder attributes (data-i18n-placeholder without data-i18n)
    document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
      const key = element.getAttribute("data-i18n-placeholder");
      const translation = this.t(key);
      element.setAttribute("placeholder", translation);
    });

    // Update option values
    document.querySelectorAll("option[data-i18n]").forEach((option) => {
      const key = option.getAttribute("data-i18n");
      option.textContent = this.t(key);
    });
  }
}

// Create global instance
export const i18n = new I18n();

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    i18n.init();
  });
} else {
  i18n.init();
}

export default i18n;
