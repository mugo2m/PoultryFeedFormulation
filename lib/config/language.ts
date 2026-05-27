// lib/config/language.ts
// Country to Language Code Mapping for Voice

export interface CountryLanguage {
  code: string;           // Language code (en-US, fr-FR, sw-KE, etc.)
  name: string;           // Language name for display
  ttsSupported: boolean;  // Whether text-to-speech supports this language
}

export const COUNTRY_LANGUAGE_MAP: Record<string, CountryLanguage> = {
  // ===== EAST AFRICA =====
  kenya: { code: 'en-GB', name: 'English (UK)', ttsSupported: true },  // CHANGED: Kenya uses British English
  uganda: { code: 'en-GB', name: 'English (UK)', ttsSupported: true }, // CHANGED
  tanzania: { code: 'en-GB', name: 'English (UK)', ttsSupported: true }, // CHANGED
  rwanda: { code: 'fr-FR', name: 'French', ttsSupported: true },
  burundi: { code: 'fr-FR', name: 'French', ttsSupported: true },
  ethiopia: { code: 'am-ET', name: 'Amharic', ttsSupported: true },

  // ===== WEST AFRICA =====
  nigeria: { code: 'en-GB', name: 'English (UK)', ttsSupported: true }, // CHANGED: Nigeria uses British English
  benin: { code: 'fr-FR', name: 'French', ttsSupported: true },
  burkina_faso: { code: 'fr-FR', name: 'French', ttsSupported: true },
  cameroon: { code: 'fr-FR', name: 'French', ttsSupported: true },
  central_african_republic: { code: 'fr-FR', name: 'French', ttsSupported: true },
  chad: { code: 'fr-FR', name: 'French', ttsSupported: true },
  comoros: { code: 'fr-FR', name: 'French', ttsSupported: true },
  congo: { code: 'fr-FR', name: 'French', ttsSupported: true },
  democratic_republic_of_congo: { code: 'fr-FR', name: 'French', ttsSupported: true },
  cote_divoire: { code: 'fr-FR', name: 'French', ttsSupported: true },
  djibouti: { code: 'fr-FR', name: 'French', ttsSupported: true },
  equatorial_guinea: { code: 'fr-FR', name: 'French', ttsSupported: true },
  gabon: { code: 'fr-FR', name: 'French', ttsSupported: true },
  guinea: { code: 'fr-FR', name: 'French', ttsSupported: true },
  madagascar: { code: 'fr-FR', name: 'French', ttsSupported: true },
  mali: { code: 'fr-FR', name: 'French', ttsSupported: true },
  mauritania: { code: 'fr-FR', name: 'French', ttsSupported: true },
  mauritius: { code: 'fr-FR', name: 'French', ttsSupported: true },
  niger: { code: 'fr-FR', name: 'French', ttsSupported: true },
  senegal: { code: 'fr-FR', name: 'French', ttsSupported: true },
  seychelles: { code: 'fr-FR', name: 'French', ttsSupported: true },
  togo: { code: 'fr-FR', name: 'French', ttsSupported: true },

  // ===== NORTH AFRICA (French widely spoken) =====
  egypt: { code: 'ar-EG', name: 'Arabic (Egypt)', ttsSupported: true },
  morocco: { code: 'fr-FR', name: 'French', ttsSupported: true },
  algeria: { code: 'fr-FR', name: 'French', ttsSupported: true },
  tunisia: { code: 'fr-FR', name: 'French', ttsSupported: true },
  libya: { code: 'ar-LY', name: 'Arabic (Libya)', ttsSupported: true },
  sudan: { code: 'ar-SA', name: 'Arabic', ttsSupported: true },

  // ===== EUROPE =====
  france: { code: 'fr-FR', name: 'French', ttsSupported: true },
  belgium: { code: 'fr-FR', name: 'French', ttsSupported: true },
  switzerland: { code: 'fr-FR', name: 'French', ttsSupported: true },
  luxembourg: { code: 'fr-FR', name: 'French', ttsSupported: true },
  monaco: { code: 'fr-FR', name: 'French', ttsSupported: true },
  spain: { code: 'es-ES', name: 'Spanish', ttsSupported: true },
  germany: { code: 'de-DE', name: 'German', ttsSupported: true },
  italy: { code: 'it-IT', name: 'Italian', ttsSupported: true },
  netherlands: { code: 'nl-NL', name: 'Dutch', ttsSupported: true },
  greece: { code: 'el-GR', name: 'Greek', ttsSupported: true },
  portugal: { code: 'pt-PT', name: 'Portuguese', ttsSupported: true },
  russia: { code: 'ru-RU', name: 'Russian', ttsSupported: true },
  ukraine: { code: 'ru-UA', name: 'Russian', ttsSupported: true },
  belarus: { code: 'ru-BY', name: 'Russian', ttsSupported: true },
  kazakhstan: { code: 'ru-KZ', name: 'Russian', ttsSupported: true },
  uk: { code: 'en-GB', name: 'English (UK)', ttsSupported: true },

  // ===== NORTH AMERICA =====
  canada: { code: 'en-US', name: 'English (US)', ttsSupported: true }, // Canada uses US English voice
  haiti: { code: 'fr-FR', name: 'French', ttsSupported: true },
  usa: { code: 'en-US', name: 'English (US)', ttsSupported: true },

  // ===== CARIBBEAN & SOUTH AMERICA (French territories) =====
  guadeloupe: { code: 'fr-FR', name: 'French', ttsSupported: true },
  martinique: { code: 'fr-FR', name: 'French', ttsSupported: true },
  french_guiana: { code: 'fr-FR', name: 'French', ttsSupported: true },

  // ===== PACIFIC (French territories) =====
  french_polynesia: { code: 'fr-FR', name: 'French', ttsSupported: true },
  new_caledonia: { code: 'fr-FR', name: 'French', ttsSupported: true },

  // ===== SOUTH ASIA =====
  india: { code: 'en-GB', name: 'English (UK)', ttsSupported: true }, // India uses British English
  pakistan: { code: 'ur-PK', name: 'Urdu', ttsSupported: true },
  bangladesh: { code: 'bn-BD', name: 'Bengali', ttsSupported: true },

  // ===== EAST ASIA =====
  china: { code: 'zh-CN', name: 'Chinese (Simplified)', ttsSupported: true },

  // ===== SOUTHEAST ASIA =====
  vietnam: { code: 'vi-VN', name: 'Vietnamese', ttsSupported: true },
  thailand: { code: 'th-TH', name: 'Thai', ttsSupported: true },
  indonesia: { code: 'id-ID', name: 'Indonesian', ttsSupported: true },

  // ===== MIDDLE EAST =====
  saudi: { code: 'ar-SA', name: 'Arabic (Saudi Arabia)', ttsSupported: true },
  uae: { code: 'ar-AE', name: 'Arabic (UAE)', ttsSupported: true },
  iraq: { code: 'ar-IQ', name: 'Arabic (Iraq)', ttsSupported: true },
  jordan: { code: 'ar-JO', name: 'Arabic (Jordan)', ttsSupported: true },
  lebanon: { code: 'ar-LB', name: 'Arabic (Lebanon)', ttsSupported: true },
  palestine: { code: 'ar-PS', name: 'Arabic (Palestine)', ttsSupported: true },
  syria: { code: 'ar-SY', name: 'Arabic (Syria)', ttsSupported: true },
  yemen: { code: 'ar-YE', name: 'Arabic (Yemen)', ttsSupported: true },
  qatar: { code: 'ar-QA', name: 'Arabic (Qatar)', ttsSupported: true },
  kuwait: { code: 'ar-KW', name: 'Arabic (Kuwait)', ttsSupported: true },
  oman: { code: 'ar-OM', name: 'Arabic (Oman)', ttsSupported: true },
  bahrain: { code: 'ar-BH', name: 'Arabic (Bahrain)', ttsSupported: true },

  // ===== WESTERN COUNTRIES =====
  australia: { code: 'en-GB', name: 'English (UK)', ttsSupported: true } // Australia uses British English
};

// Default language if country not found
export const DEFAULT_LANGUAGE = 'en-GB'; // CHANGED: Default to British English

// Helper function to get language code from country
export function getLanguageFromCountry(country: string): string {
  return COUNTRY_LANGUAGE_MAP[country]?.code || DEFAULT_LANGUAGE;
}

// Helper function to get language name from country
export function getLanguageNameFromCountry(country: string): string {
  return COUNTRY_LANGUAGE_MAP[country]?.name || 'English (UK)';
}

// Language options for the language bar - UPDATED with TWO English options
export const LANGUAGE_OPTIONS = [
  // ===== ENGLISH OPTIONS (SPLIT INTO TWO) =====
  { code: 'en-GB', label: '🇬🇧 ENGLISH (UK)', flag: '🇬🇧', name: 'English (UK)' },
  { code: 'en-US', label: '🇺🇸 ENGLISH (US)', flag: '🇺🇸', name: 'English (US)' },

  // Other languages
  { code: 'fr', label: '🇫🇷 FRANÇAIS', flag: '🇫🇷', name: 'Français' },
  { code: 'es', label: '🇪🇸 ESPAÑOL', flag: '🇪🇸', name: 'Español' },
  { code: 'sw', label: '🇰🇪 KISWAHILI', flag: '🇰🇪', name: 'Kiswahili' },
  { code: 'hi', label: '🇮🇳 हिन्दी', flag: '🇮🇳', name: 'Hindi' },
  { code: 'zh', label: '🇨🇳 中文', flag: '🇨🇳', name: 'Chinese' },
  { code: 'ar', label: '🇸🇦 العربية', flag: '🇸🇦', name: 'Arabic' },
  { code: 'pt', label: '🇵🇹 PORTUGUÊS', flag: '🇵🇹', name: 'Portuguese' },
  { code: 'ru', label: '🇷🇺 РУССКИЙ', flag: '🇷🇺', name: 'Russian' },
  { code: 'de', label: '🇩🇪 DEUTSCH', flag: '🇩🇪', name: 'German' },
  { code: 'it', label: '🇮🇹 ITALIANO', flag: '🇮🇹', name: 'Italian' },
  { code: 'nl', label: '🇳🇱 NEDERLANDS', flag: '🇳🇱', name: 'Dutch' },
  { code: 'el', label: '🇬🇷 ΕΛΛΗΝΙΚΑ', flag: '🇬🇷', name: 'Greek' },
  { code: 'th', label: '🇹🇭 ภาษาไทย', flag: '🇹🇭', name: 'Thai' },
  { code: 'vi', label: '🇻🇳 TIẾNG VIỆT', flag: '🇻🇳', name: 'Vietnamese' },
  { code: 'id', label: '🇮🇩 BAHASA INDONESIA', flag: '🇮🇩', name: 'Indonesian' },
  { code: 'am', label: '🇪🇹 አማርኛ', flag: '🇪🇹', name: 'Amharic' },
  { code: 'bn', label: '🇧🇩 বাংলা', flag: '🇧🇩', name: 'Bengali' }
];