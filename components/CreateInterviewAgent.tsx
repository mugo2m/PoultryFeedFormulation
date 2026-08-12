"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';
import {
  Sparkles,
  Loader2,
  Mic,
  Send,
  CheckCircle,
  Volume2,
  ChevronDown,
  Calendar,
  Home,
  MapPin,
  Globe,
} from "lucide-react";
import { useCurrency } from "@/lib/context/CurrencyContext";
import { COUNTRY_CURRENCY_MAP } from "@/lib/config/currency";

interface CreateInterviewAgentProps {
  userName: string;
  userId?: string;
  profileImage?: string;
}

// ========== DROPDOWN OPTIONS ==========
const breedOptions = [
  "Local",
  "Layers",
  "Sasso",
  "Kenbrew",
  "Kroiler",
  "Broiler",
  "Sussex"
];

const stageOptions = [
  "Starter (0–6 weeks)",
  "Grower (6–20 weeks)",
  "Layer (20+ weeks)"
];

const broilerStageOptions = [
  "Starter (0–4 weeks)",
  "Finisher (4–8 weeks)"
];

const quantityOptions = [
  "5 kg",
  "10 kg",
  "15 kg",
  "20 kg",
  "25 kg",
  "30 kg",
  "35 kg",
  "40 kg",
  "45 kg",
  "50 kg",
  "55 kg",
  "60 kg",
  "65 kg",
  "70 kg",
  "75 kg",
  "80 kg",
  "85 kg",
  "90 kg",
  "95 kg",
  "100 kg"
];

// ========== UPDATED: 17 Ingredients (5 new added) ==========
const ingredientOptions = [
  "Broken maize",
  "Soya bean meal",
  "Fish meal (omena/dagaa)",
  "Sunflower cake",
  "Wheat bran",
  "Maize bran",           // NEW
  "Wheat pollard",        // NEW
  "Cotton seed cake",     // NEW
  "Lime",
  "DCP",
  "Premix (starter/grower/layer specific)",
  "Methionine",
  "Lysine",
  "Threonine",            // NEW
  "Tryptophan",           // NEW
  "Salt",
  "Toxin binder"
];

// ========== COUNTRY LIST ==========
const countryOptions = [
  "Algeria",
  "Antigua and Barbuda",
  "Argentina",
  "Australia",
  "Bahamas",
  "Barbados",
  "Belgium",
  "Belize",
  "Benin",
  "Bolivia",
  "Botswana",
  "Burkina Faso",
  "Burundi",
  "Cameroon",
  "Canada",
  "Central African Republic",
  "Chad",
  "Chile",
  "Colombia",
  "Comoros",
  "Congo (Brazzaville)",
  "Congo (Kinshasa)",
  "Costa Rica",
  "Côte d'Ivoire",
  "Cuba",
  "Djibouti",
  "Dominica",
  "Dominican Republic",
  "Ecuador",
  "Egypt",
  "El Salvador",
  "Equatorial Guinea",
  "Eritrea",
  "Eswatini",
  "Ethiopia",
  "France",
  "Gabon",
  "Gambia",
  "Ghana",
  "Grenada",
  "Guatemala",
  "Guinea",
  "Guinea-Bissau",
  "Guyana",
  "Haiti",
  "Honduras",
  "India",
  "Ireland",
  "Jamaica",
  "Kenya",
  "Lesotho",
  "Liberia",
  "Libya",
  "Madagascar",
  "Malawi",
  "Mali",
  "Mauritania",
  "Mauritius",
  "Mexico",
  "Morocco",
  "Mozambique",
  "Namibia",
  "New Zealand",
  "Nicaragua",
  "Niger",
  "Nigeria",
  "Panama",
  "Paraguay",
  "Peru",
  "Philippines",
  "Rwanda",
  "Saint Kitts and Nevis",
  "Saint Lucia",
  "Saint Vincent and the Grenadines",
  "Senegal",
  "Seychelles",
  "Sierra Leone",
  "Singapore",
  "Somalia",
  "South Africa",
  "South Sudan",
  "Spain",
  "Sudan",
  "Suriname",
  "Tanzania",
  "Togo",
  "Trinidad and Tobago",
  "Tunisia",
  "Uganda",
  "United Kingdom",
  "United States",
  "Uruguay",
  "Venezuela",
  "Zambia",
  "Zimbabwe"
].sort((a, b) => a.localeCompare(b));

// ========== PHONE COUNTRY CODES ==========
const countryCodes = [
  { code: "+254", country: "Kenya", flag: "🇰🇪" },
  { code: "+256", country: "Uganda", flag: "🇺🇬" },
  { code: "+255", country: "Tanzania", flag: "🇹🇿" },
  { code: "+250", country: "Rwanda", flag: "🇷🇼" },
  { code: "+257", country: "Burundi", flag: "🇧🇮" },
  { code: "+27", country: "South Africa", flag: "🇿🇦" },
  { code: "+260", country: "Zambia", flag: "🇿🇲" },
  { code: "+263", country: "Zimbabwe", flag: "🇿🇼" },
  { code: "+265", country: "Malawi", flag: "🇲🇼" },
  { code: "+258", country: "Mozambique", flag: "🇲🇿" },
  { code: "+267", country: "Botswana", flag: "🇧🇼" },
  { code: "+264", country: "Namibia", flag: "🇳🇦" },
  { code: "+20", country: "Egypt", flag: "🇪🇬" },
  { code: "+234", country: "Nigeria", flag: "🇳🇬" },
  { code: "+233", country: "Ghana", flag: "🇬🇭" },
  { code: "+1", country: "USA/Canada", flag: "🇺🇸" },
  { code: "+44", country: "UK", flag: "🇬🇧" }
];

const CreateInterviewAgent = ({
  userName,
  userId,
  profileImage
}: CreateInterviewAgentProps) => {
  const { t, i18n } = useTranslation();
  const { setCountry, currency } = useCurrency();
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userTranscript, setUserTranscript] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastSubmittedAnswer, setLastSubmittedAnswer] = useState("");
  const [selectedCountryCode, setSelectedCountryCode] = useState("+254");
  const [recognitionLanguage, setRecognitionLanguage] = useState('en-US');
  const nameUsageCountRef = useRef(0);
  // ===== FIX: Prevent repeated voice ready toast =====
  const voiceReadyToastShownRef = useRef(false);

  const getSpokenCurrencyName = (): string => currency.name;
  const getDisplaySymbol = (): string => currency.symbol;

  const safeT = (key: string, params?: any): string => {
    try {
      const result = t(key, params);
      if (result && typeof result.then === 'function') {
        console.warn(`Translation for "${key}" returned a Promise`);
        return key;
      }
      return typeof result === 'string' ? result : String(result || '');
    } catch (e) {
      console.error('Translation error for key:', key, e);
      return key;
    }
  };

  const [currentStep, setCurrentStep] = useState<"idle" | "configuring" | "generating" | "redirecting" | "error">("idle");
  const [configStep, setConfigStep] = useState(0);

  const [streamingQuestion, setStreamingQuestion] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const questionWordsRef = useRef<string[]>([]);

  const voiceServiceRef = useRef<any>(null);

  // ========== FARMER DETAILS (poultry only) ==========
  const [farmerDetails, setFarmerDetails] = useState({
    country: "",
    breed: "",
    stage: "",
    quantityKg: "",
    includeCoccidiostat: "No",
    availableIngredients: [] as string[],
    ingredientPrices: {} as Record<string, number>,
    county: "",
    subCounty: "",
    ward: "",
    village: "",
  });

  const [debugInfo, setDebugInfo] = useState({
    callStatus: "INACTIVE",
    currentQuestion: 0,
    totalQuestions: 0,
    isListening: false,
    userId: userId || "MISSING",
    voiceMode: "SIMULATED" as "REAL" | "SIMULATED",
    generatedSessionId: "",
  });

  const voiceAssistantRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);
  const isRecognitionActiveRef = useRef(false);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  const mapI18nToVoiceLanguage = (i18nLang: string): string => {
    switch (i18nLang) {
      case 'sw': return 'sw-KE';
      case 'fr': return 'fr-FR';
      case 'es': return 'es-ES';
      case 'en-GB': return 'en-GB';
      case 'en-US': return 'en-US';
      case 'en': return 'en-US';
      default: return 'en-US';
    }
  };

  // ===== Sync voice language =====
  const previousLangRef = useRef<string>('');
  useEffect(() => {
    if (currentStep !== "idle") return;
    const newLang = i18n.language;
    if (!newLang) return;
    if (newLang === previousLangRef.current) return;
    previousLangRef.current = newLang;
    const voiceLang = mapI18nToVoiceLanguage(newLang);
    setRecognitionLanguage(voiceLang);
    if (recognitionRef.current) {
      recognitionRef.current.lang = voiceLang;
    }
  }, [i18n.language, currentStep]);

  // ========== QUESTION DEFINITIONS ==========
  const getQuestions = useCallback(() => {
    const isBroiler = farmerDetails.breed === "Broiler";
    const stageOpts = isBroiler ? broilerStageOptions : stageOptions;

    const baseQuestions = [
      {
        id: "country",
        questionKey: "question_country",
        type: "dropdown",
        options: countryOptions,
        sectionKey: "section_location"
      },
      {
        id: "breed",
        questionKey: "question_breed",
        type: "dropdown",
        options: breedOptions,
        sectionKey: "section_breed"
      },
      {
        id: "stage",
        questionKey: "question_stage",
        type: "dropdown",
        options: stageOpts,
        sectionKey: "section_stage"
      },
      {
        id: "quantityKg",
        questionKey: "question_quantity",
        type: "dropdown",
        options: quantityOptions,
        sectionKey: "section_quantity"
      },
      {
        id: "includeCoccidiostat",
        questionKey: "question_coccidiostat",
        type: "dropdown",
        options: ["Yes", "No"],
        sectionKey: "section_coccidiostat"
      },
      {
        id: "availableIngredients",
        questionKey: "question_available_ingredients",
        type: "multiselect",
        options: ingredientOptions,
        sectionKey: "section_ingredients"
      },
      {
        id: "ingredientPrices",
        questionKey: "question_ingredient_prices",
        type: "prices",
        sectionKey: "section_prices",
      },
      {
        id: "county",
        questionKey: "question_county",
        type: "text",
        placeholder: "e.g., Bungoma",
        sectionKey: "section_location"
      },
      {
        id: "subCounty",
        questionKey: "question_sub_county",
        type: "text",
        placeholder: "e.g., Kimilili",
        sectionKey: "section_location"
      },
      {
        id: "ward",
        questionKey: "question_ward",
        type: "text",
        placeholder: "e.g., Kimilili",
        sectionKey: "section_location"
      },
      {
        id: "village",
        questionKey: "question_village",
        type: "text",
        placeholder: "e.g., Sikulu",
        sectionKey: "section_location"
      }
    ];

    return baseQuestions;
  }, [farmerDetails.breed]);

  // Filter out the prices question if no ingredients selected
  const filterQuestions = useCallback((questions: any[]) => {
    return questions.filter(q => {
      if (q.id === "ingredientPrices" && farmerDetails.availableIngredients.length === 0) {
        return false;
      }
      return true;
    });
  }, [farmerDetails.availableIngredients]);

  const allQuestions = useMemo(() => {
    const raw = getQuestions();
    return filterQuestions(raw);
  }, [getQuestions, filterQuestions]);

  const totalQuestions = allQuestions.length;

  useEffect(() => {
    setDebugInfo(prev => ({ ...prev, totalQuestions }));
  }, [totalQuestions]);

  // ========== SPEECH RECOGNITION ==========
  useEffect(() => {
    let isMounted = true;

    const checkVoiceSupport = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window && isMounted) {
        const voices = window.speechSynthesis.getVoices();
        setDebugInfo(prev => {
          const newMode = voices.length > 0 ? "REAL" : "SIMULATED";
          if (prev.voiceMode === newMode) return prev;
          return { ...prev, voiceMode: newMode };
        });
      }
    };

    checkVoiceSupport();
    const timeoutId = setTimeout(checkVoiceSupport, 500);

    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) && !recognitionRef.current) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = recognitionLanguage;
      recognitionRef.current.timeout = 15000;

      recognitionRef.current.onresult = (event: any) => {
        retryCountRef.current = 0;
        if (isRecognitionActiveRef.current) {
          isRecognitionActiveRef.current = false;
          setDebugInfo(prev => ({ ...prev, isListening: false }));
        }
        const transcript = event.results[0][0].transcript;
        setUserTranscript(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        if (isRecognitionActiveRef.current) {
          isRecognitionActiveRef.current = false;
          setDebugInfo(prev => ({ ...prev, isListening: false }));
        }
        if (event.error === 'no-speech') {
          retryCountRef.current++;
          if (retryCountRef.current <= maxRetries) {
            toast.info(safeT('no_speech_detected', { current: retryCountRef.current, max: maxRetries }));
            setTimeout(() => safeStartListening(), 2000);
          }
        }
      };

      recognitionRef.current.onend = () => {
        if (isRecognitionActiveRef.current) {
          isRecognitionActiveRef.current = false;
          setDebugInfo(prev => ({ ...prev, isListening: false }));
        }
      };

      recognitionRef.current.onstart = () => {
        isRecognitionActiveRef.current = true;
        setDebugInfo(prev => ({ ...prev, isListening: true }));
        retryCountRef.current = 0;
      };
    }

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      if (recognitionRef.current && isRecognitionActiveRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    };
  }, [recognitionLanguage, safeT]);

  // ========== VOICE ASSISTANT REF (FIXED) ==========
  useEffect(() => {
    let isMounted = true;

    if (!voiceEnabled) {
      voiceAssistantRef.current = null;
      voiceReadyToastShownRef.current = false; // Reset so toast can be shown again when re-enabled
      return;
    }

    voiceAssistantRef.current = { speak: async (text: string) => streamQuestionWithVoice(text) };

    // Show toast only once per voice enable session
    if (isMounted && voiceEnabled && !voiceReadyToastShownRef.current) {
      toast.success(safeT('voice_ready'));
      voiceReadyToastShownRef.current = true;
    }

    return () => {
      isMounted = false;
    };
  }, [voiceEnabled, safeT, recognitionLanguage]);

  // ========== VOICE SELECTION ==========
  const getBestVoiceForLanguage = async (language: string): Promise<SpeechSynthesisVoice | null> => {
    const waitForVoices = (): Promise<SpeechSynthesisVoice[]> => {
      return new Promise((resolve) => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length) {
          resolve(voices);
          return;
        }
        const onChanged = () => {
          const newVoices = window.speechSynthesis.getVoices();
          if (newVoices.length) {
            window.speechSynthesis.onvoiceschanged = null;
            resolve(newVoices);
          }
        };
        window.speechSynthesis.onvoiceschanged = onChanged;
        setTimeout(() => {
          window.speechSynthesis.onvoiceschanged = null;
          resolve(window.speechSynthesis.getVoices());
        }, 3000);
      });
    };

    let voices = await waitForVoices();
    if (!voices.length) return null;

    const findBritishEnglishFemale = (): SpeechSynthesisVoice | null => {
      const femaleNames = ['libby','hazel','susan','maisie','sonia','kate','victoria','millie','olivia','google uk english female','microsoft libby','microsoft hazel','microsoft susan','microsoft maisie','microsoft sonia','british english female','uk english female'];
      for (const name of femaleNames) {
        const voice = voices.find(v => v.lang === 'en-GB' && v.name.toLowerCase().includes(name));
        if (voice) return voice;
      }
      const maleIndicators = ['george','ryan','thomas','david','mark','james','john','paul','michael'];
      const anyBritishFemale = voices.find(v => v.lang === 'en-GB' && !maleIndicators.some(m => v.name.toLowerCase().includes(m)));
      if (anyBritishFemale) return anyBritishFemale;
      return voices.find(v => v.lang === 'en-GB') || null;
    };

    const findAmericanEnglishFemale = (): SpeechSynthesisVoice | null => {
      const femaleNames = ['zira','samantha','victoria','jenny','aria','google us english female','microsoft jenny','microsoft zira','microsoft aria','us english female'];
      for (const name of femaleNames) {
        const voice = voices.find(v => v.lang === 'en-US' && v.name.toLowerCase().includes(name));
        if (voice) return voice;
      }
      const maleIndicators = ['david','mark','james','john','paul','michael','alex','thomas'];
      const anyFemale = voices.find(v => v.lang === 'en-US' && !maleIndicators.some(m => v.name.toLowerCase().includes(m)));
      if (anyFemale) return anyFemale;
      return voices.find(v => v.lang === 'en-US') || null;
    };

    const findFrenchVoice = (): SpeechSynthesisVoice | null => {
      let vivienne = voices.find(v => v.lang.startsWith('fr') && v.name.toLowerCase().includes('vivienne'));
      if (vivienne) return vivienne;
      const frenchFemale = voices.find(v => v.lang.startsWith('fr') && (v.name.toLowerCase().includes('denise') || v.name.toLowerCase().includes('google français female') || v.name.toLowerCase().includes('marie') || v.name.toLowerCase().includes('chloe')));
      if (frenchFemale) return frenchFemale;
      return voices.find(v => v.lang.startsWith('fr')) || null;
    };

    const findSpanishVoice = (): SpeechSynthesisVoice | null => {
      const femaleNames = ['helena','elena','ximena','maria','paloma','sofia','catalina','salome','belkys','ramona','andrea','lorena','teresa','marta','karla','dalia','yolanda','margarita','tania','camila','karina','elvira','valentina','paola','michelle','gabriela','lucia','laura','fernanda','victoria','monica','paulina','sabina','florencia','josefina','marcela','beatriz'];
      for (const name of femaleNames) {
        const voice = voices.find(v => v.lang.startsWith('es') && v.name.toLowerCase().includes(name));
        if (voice) return voice;
      }
      const nonMale = voices.find(v => v.lang.startsWith('es') && !v.name.toLowerCase().includes('alvaro') && !v.name.toLowerCase().includes('jorge') && !v.name.toLowerCase().includes('manuel') && !v.name.toLowerCase().includes('andres') && !v.name.toLowerCase().includes('carlos') && !v.name.toLowerCase().includes('juan') && !v.name.toLowerCase().includes('luis') && !v.name.toLowerCase().includes('rodrigo') && !v.name.toLowerCase().includes('javier') && !v.name.toLowerCase().includes('federico') && !v.name.toLowerCase().includes('victor') && !v.name.toLowerCase().includes('mateo') && !v.name.toLowerCase().includes('sebastian') && !v.name.toLowerCase().includes('gonzalo') && !v.name.toLowerCase().includes('lorenzo') && !v.name.toLowerCase().includes('marcelo') && !v.name.toLowerCase().includes('tomas') && !v.name.toLowerCase().includes('emilio') && !v.name.toLowerCase().includes('alonso'));
      if (nonMale) return nonMale;
      return null;
    };

    const findSwahiliVoice = (): SpeechSynthesisVoice | null => {
      let rafiki = voices.find(v => v.lang === 'sw-KE' && v.name.toLowerCase().includes('rafiki'));
      if (rafiki) return rafiki;
      return voices.find(v => v.lang === 'sw-KE') || null;
    };

    if (language === 'en-GB' || language === 'en-UK' || language.toLowerCase().includes('british')) {
      let voice = findBritishEnglishFemale();
      let attempts = 0;
      while (!voice && attempts < 5) { await new Promise(r => setTimeout(r, 1000)); voices = window.speechSynthesis.getVoices(); voice = findBritishEnglishFemale(); attempts++; }
      if (voice) return voice;
    }
    if (language === 'en-US') {
      let voice = findAmericanEnglishFemale();
      let attempts = 0;
      while (!voice && attempts < 5) { await new Promise(r => setTimeout(r, 1000)); voices = window.speechSynthesis.getVoices(); voice = findAmericanEnglishFemale(); attempts++; }
      if (voice) return voice;
    }
    if (language === 'fr-FR' || language === 'fr-CA' || language.startsWith('fr')) {
      let voice = findFrenchVoice();
      let attempts = 0;
      while (!voice && attempts < 5) { await new Promise(r => setTimeout(r, 1000)); voices = window.speechSynthesis.getVoices(); voice = findFrenchVoice(); attempts++; }
      if (voice) return voice;
    }
    if (language === 'es-ES' || language.startsWith('es')) {
      let voice = findSpanishVoice();
      let attempts = 0;
      while (!voice && attempts < 5) { await new Promise(r => setTimeout(r, 1000)); voices = window.speechSynthesis.getVoices(); voice = findSpanishVoice(); attempts++; }
      if (voice) return voice;
    }
    if (language === 'sw-KE' || language === 'sw-TZ' || language.startsWith('sw')) {
      let voice = findSwahiliVoice();
      let attempts = 0;
      while (!voice && attempts < 5) { await new Promise(r => setTimeout(r, 1000)); voices = window.speechSynthesis.getVoices(); voice = findSwahiliVoice(); attempts++; }
      if (voice) return voice;
    }

    const anyEnglish = voices.find(v => v.lang.startsWith('en') && !v.name.toLowerCase().includes('male'));
    if (anyEnglish) return anyEnglish;
    return voices[0] || null;
  };

  // ========== STREAM QUESTION WITH VOICE ==========
  const streamQuestionWithVoice = async (fullText: string) => {
    if (!voiceEnabled || !window.speechSynthesis) {
      setStreamingQuestion(fullText);
      return;
    }

    setIsStreaming(true);
    setStreamingQuestion("");
    setCurrentWordIndex(0);
    setUserTranscript("");

    const spokenCurrencyName = getSpokenCurrencyName();
    const currencySymbol = currency.symbol;
    const escapedSymbol = currencySymbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let speechText = fullText.replace(new RegExp(`${escapedSymbol}\\s`, 'g'), `${spokenCurrencyName} `);
    speechText = speechText.replace(new RegExp(`\\b${escapedSymbol}\\b`, 'g'), spokenCurrencyName);

    if (recognitionRef.current && isRecognitionActiveRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      isRecognitionActiveRef.current = false;
      setDebugInfo(prev => ({ ...prev, isListening: false }));
    }

    const words = speechText.split(' ');
    questionWordsRef.current = words;

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.rate = 1.0;
    utterance.pitch = 1.1;
    utterance.lang = recognitionLanguage;

    const bestVoice = await getBestVoiceForLanguage(recognitionLanguage);
    if (bestVoice) {
      utterance.voice = bestVoice;
    }
    setIsSpeaking(true);

    let wordIndex = 0;
    let currentText = '';
    let safetyTimeout: NodeJS.Timeout | null = setTimeout(() => {
      if (isSpeaking) {
        console.warn("⚠️ Speech took too long – forcing continue");
        if (utterance.onend) utterance.onend({} as any);
      }
    }, 20000);
    let finished = false;

    utterance.onboundary = (event) => {
      if (event.name === 'word' && wordIndex < words.length) {
        currentText += (wordIndex === 0 ? '' : ' ') + words[wordIndex];
        let displayText = currentText;
        const displaySymbol = getDisplaySymbol();
        if (displaySymbol !== currencySymbol) {
          displayText = displayText.replace(new RegExp(spokenCurrencyName, 'g'), displaySymbol);
        }
        setStreamingQuestion(displayText);
        setCurrentWordIndex(wordIndex + 1);
        wordIndex++;
      }
    };

    utterance.onend = () => {
      if (finished) return;
      finished = true;
      if (safetyTimeout) clearTimeout(safetyTimeout);
      let finalDisplay = fullText;
      const displaySymbol = getDisplaySymbol();
      if (displaySymbol !== currencySymbol) {
        finalDisplay = finalDisplay.replace(new RegExp(escapedSymbol, 'g'), displaySymbol);
      }
      setStreamingQuestion(finalDisplay);
      setIsStreaming(false);
      setIsSpeaking(false);
      setTimeout(() => safeStartListening(), 1500);
    };

    utterance.onerror = (event) => {
      if (finished) return;
      finished = true;
      if (safetyTimeout) clearTimeout(safetyTimeout);
      console.error("Speech error:", event);
      const fallbackUtterance = new SpeechSynthesisUtterance(speechText);
      fallbackUtterance.rate = 1.0;
      fallbackUtterance.pitch = 1.1;
      fallbackUtterance.lang = recognitionLanguage;
      fallbackUtterance.onend = () => {
        let finalDisplay = fullText;
        const ds = getDisplaySymbol();
        if (ds !== currencySymbol) finalDisplay = finalDisplay.replace(new RegExp(escapedSymbol, 'g'), ds);
        setStreamingQuestion(finalDisplay);
        setIsStreaming(false);
        setIsSpeaking(false);
        setTimeout(() => safeStartListening(), 1500);
      };
      fallbackUtterance.onerror = () => {
        let finalDisplay = fullText;
        const ds = getDisplaySymbol();
        if (ds !== currencySymbol) finalDisplay = finalDisplay.replace(new RegExp(escapedSymbol, 'g'), ds);
        setStreamingQuestion(finalDisplay);
        setIsStreaming(false);
        setIsSpeaking(false);
        setTimeout(() => safeStartListening(), 500);
      };
      window.speechSynthesis.speak(fallbackUtterance);
    };

    window.speechSynthesis.speak(utterance);
  };

  // ========== SPEAK ACKNOWLEDGMENT ==========
  const speakAcknowledgment = async (answer: string, fieldId: string) => {
    const spokenCurrencyName = getSpokenCurrencyName();
    const currencySymbol = currency.symbol;
    const escapedSymbol = currencySymbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let spokenAnswer = answer.replace(new RegExp(`${escapedSymbol}\\s`, 'g'), `${spokenCurrencyName} `);
    spokenAnswer = spokenAnswer.replace(new RegExp(`\\b${escapedSymbol}\\b`, 'g'), spokenCurrencyName);

    let acknowledgment = "";
    if (fieldId === "country") {
      acknowledgment = safeT('ack_country', { answer: spokenAnswer });
      setCountry(answer.toLowerCase());
    } else if (fieldId === "breed") {
      acknowledgment = safeT('ack_breed', { answer: spokenAnswer });
    } else if (fieldId === "stage") {
      acknowledgment = safeT('ack_stage', { answer: spokenAnswer });
    } else if (fieldId === "quantityKg") {
      acknowledgment = safeT('ack_quantity', { answer: spokenAnswer });
    } else if (fieldId === "includeCoccidiostat") {
      acknowledgment = safeT('ack_coccidiostat', { answer: spokenAnswer });
    } else if (fieldId === "availableIngredients") {
      acknowledgment = safeT('ack_ingredients', { answer: spokenAnswer });
    } else if (fieldId === "ingredientPrices") {
      acknowledgment = safeT('ack_prices', { answer: "Prices recorded" });
    } else if (fieldId === "county") {
      acknowledgment = safeT('ack_county', { answer: spokenAnswer });
    } else if (fieldId === "subCounty") {
      acknowledgment = safeT('ack_sub_county', { answer: spokenAnswer });
    } else if (fieldId === "ward") {
      acknowledgment = safeT('ack_ward', { answer: spokenAnswer });
    } else if (fieldId === "village") {
      acknowledgment = safeT('ack_village', { answer: spokenAnswer });
    } else {
      acknowledgment = safeT('ack_generic', { answer: spokenAnswer });
    }

    await voiceAssistantRef.current?.speak(acknowledgment);
    toast.success(safeT('recorded', { answer }));
  };

  // ========== PROCESS ANSWER ==========
  const processAnswer = async (answer: string) => {
    if (currentStep !== "configuring") return;

    const currentConfig = allQuestions[configStep];
    let cleanAnswer = answer;
    let finalValue = cleanAnswer;

    // Handle multi-select (availableIngredients)
    if (currentConfig.id === "availableIngredients") {
      const items = answer.split(',').map(s => s.trim()).filter(s => s);
      setFarmerDetails(prev => ({ ...prev, availableIngredients: items }));
      setLastSubmittedAnswer(answer);
      await speakAcknowledgment(answer, currentConfig.id);
      setUserTranscript("");
      if (configStep < allQuestions.length - 1) {
        setConfigStep(prev => prev + 1);
        setTimeout(() => askQuestion(configStep + 1), 2500);
      } else {
        setCurrentStep("generating");
        generateSession();
      }
      return;
    }

    // Handle prices question
    if (currentConfig.id === "ingredientPrices") {
      const ingredients = farmerDetails.availableIngredients;
      const allFilled = ingredients.every(ing => farmerDetails.ingredientPrices[ing] && farmerDetails.ingredientPrices[ing] > 0);
      if (!allFilled) {
        toast.warning(safeT('enter_all_prices'));
        return;
      }
      setLastSubmittedAnswer("Prices recorded");
      await speakAcknowledgment("Prices recorded", currentConfig.id);
      setUserTranscript("");
      if (configStep < allQuestions.length - 1) {
        setConfigStep(prev => prev + 1);
        setTimeout(() => askQuestion(configStep + 1), 1500);
      } else {
        setCurrentStep("generating");
        generateSession();
      }
      return;
    }

    // Special validation for coccidiostat with layer
    if (currentConfig.id === "includeCoccidiostat") {
      const isLayer = farmerDetails.stage && farmerDetails.stage.toLowerCase().includes("layer");
      if (isLayer && cleanAnswer.toLowerCase() === "yes") {
        toast.error(safeT('coccidiostat_not_allowed_layer'), {
          description: safeT('coccidiostat_layer_warning'),
          duration: 8000
        });
        cleanAnswer = "No";
        finalValue = "No";
        toast.info(safeT('forced_coccidiostat_no'));
      }
    }

    // For dropdowns
    if (currentConfig.type === "dropdown") {
      const matched = currentConfig.options.find((opt: string) => opt.toLowerCase() === cleanAnswer.toLowerCase());
      if (matched) {
        finalValue = matched;
      } else {
        finalValue = currentConfig.options[0];
      }
    } else {
      finalValue = cleanAnswer;
    }

    setFarmerDetails(prev => ({ ...prev, [currentConfig.id]: finalValue }));
    setLastSubmittedAnswer(cleanAnswer);

    await speakAcknowledgment(cleanAnswer, currentConfig.id);
    setUserTranscript("");

    if (configStep < allQuestions.length - 1) {
      setConfigStep(prev => prev + 1);
      setTimeout(() => askQuestion(configStep + 1), 2500);
    } else {
      setCurrentStep("generating");
      generateSession();
    }
  };

  // ========== SAFE START/STOP LISTENING ==========
  const safeStartListening = () => {
    if (isSpeaking || isStreaming) {
      console.log("AI is speaking, waiting to listen...");
      return;
    }
    if (!recognitionRef.current || isRecognitionActiveRef.current) return;
    if (recognitionRef.current.lang !== recognitionLanguage) {
      recognitionRef.current.lang = recognitionLanguage;
    }
    try {
      recognitionRef.current.start();
      setDebugInfo(prev => ({ ...prev, isListening: true }));
    } catch (error) {}
  };

  const safeStopListening = () => {
    if (recognitionRef.current && isRecognitionActiveRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      isRecognitionActiveRef.current = false;
      setDebugInfo(prev => ({ ...prev, isListening: false }));
    }
  };

  // ========== START VOICE SETUP ==========
  const startVoiceSetup = async () => {
    if (!voiceEnabled || !voiceAssistantRef.current) {
      toast.error(safeT('enable_voice_first'));
      return;
    }

    safeStopListening();
    setCurrentStep("configuring");
    setConfigStep(0);
    setUserTranscript("");
    setLastSubmittedAnswer("");
    nameUsageCountRef.current = 0;

    setFarmerDetails({
      country: "",
      breed: "",
      stage: "",
      quantityKg: "",
      includeCoccidiostat: "No",
      availableIngredients: [],
      ingredientPrices: {},
      county: "",
      subCounty: "",
      ward: "",
      village: "",
    });

    askQuestion(0);
  };

  const askQuestion = async (step: number) => {
    if (!voiceAssistantRef.current || step >= allQuestions.length) return;
    if (isSpeaking) await new Promise(resolve => setTimeout(resolve, 500));

    const questionKey = allQuestions[step].questionKey;
    let question = safeT(questionKey);

    setDebugInfo(prev => ({ ...prev, currentQuestion: step + 1 }));
    setUserTranscript("");
    setLastSubmittedAnswer("");

    await voiceAssistantRef.current.speak(question);

    const q = allQuestions[step];
    if (q.type !== "multiselect" && q.type !== "prices") {
      safeStartListening();
    }
  };

  // ========== GENERATE SESSION ==========
  const generateSession = async () => {
    if (!voiceAssistantRef.current) return;
    setIsLoading(true);

    await voiceAssistantRef.current.speak(safeT('creating_profile'));

    let currentUserId = userId || localStorage.getItem('userId') || `user-${Date.now()}`;
    localStorage.setItem('userId', currentUserId);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      const response = await fetch("/api/vapi/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...farmerDetails,
          userid: currentUserId,
          quantityKg: parseFloat(farmerDetails.quantityKg) || 0,
          country: farmerDetails.country.toLowerCase(),
          ingredientPrices: farmerDetails.ingredientPrices,
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`Server error: ${response.status}`);

      const data = await response.json();
      if (data.success && data.sessionId) {
        await voiceAssistantRef.current.speak(safeT('ready_redirect'));
        setTimeout(() => window.location.href = `/interview/${data.sessionId}`, 2000);
        setCurrentStep("redirecting");
      } else {
        throw new Error(data.error || "Unknown error");
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error("Generate session error:", error);
      if (error.name === 'AbortError') {
        toast.error(safeT('request_timeout') || "Request timed out. Please try again.");
      } else {
        toast.error(safeT('error_creating_profile') || "Failed to create feed plan. Please try again.");
      }
      setCurrentStep("error");
    } finally {
      setIsLoading(false);
    }
  };

  const stopEverything = () => {
    safeStopListening();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setCurrentStep("idle");
    setStreamingQuestion("");
    setIsStreaming(false);
    setUserTranscript("");
  };

  const skipQuestion = () => {
    if (currentStep === "configuring" && configStep < allQuestions.length) {
      processAnswer("not specified");
      toast.info(safeT('skipped'));
    }
  };

  const submitAnswer = () => {
    if (userTranscript.trim()) {
      processAnswer(userTranscript);
    }
  };

  // ========== RENDER INPUT ==========
  const renderInput = useCallback(() => {
    const q = allQuestions[configStep];
    if (!q) return null;

    if (q.type === "dropdown") {
      return (
        <div className="relative">
          <select
            value={userTranscript}
            onChange={(e) => setUserTranscript(e.target.value)}
            className="w-full px-4 py-3 border-2 rounded-xl appearance-none text-blue-900 font-medium focus:border-blue-600"
          >
            <option value="" className="text-gray-500">{safeT('select_option')}</option>
            {q.options?.map((opt: string, index: number) => (
              <option key={`${opt}-${index}`} value={opt} className="text-blue-900">{opt}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-3 w-5 h-5 text-blue-600" />
        </div>
      );
    }

    if (q.type === "multiselect") {
      const selected = farmerDetails.availableIngredients || [];
      return (
        <div className="space-y-2 max-h-60 overflow-y-auto p-2 border-2 rounded-xl">
          {q.options?.map((opt: string, index: number) => (
            <label key={`${opt}-${index}`} className="flex items-center gap-2 p-2 hover:bg-blue-50 rounded-lg">
              <input
                type="checkbox"
                value={opt}
                checked={selected.includes(opt)}
                onChange={(e) => {
                  const values = e.target.checked
                    ? [...selected, opt]
                    : selected.filter(item => item !== opt);
                  setFarmerDetails(prev => ({ ...prev, availableIngredients: values }));
                  setUserTranscript(values.join(', '));
                }}
                className="w-4 h-4 accent-blue-600"
              />
              <span className="text-blue-900">{opt}</span>
            </label>
          ))}
        </div>
      );
    }

    if (q.type === "prices") {
      const ingredients = farmerDetails.availableIngredients;
      if (ingredients.length === 0) {
        return <p className="text-gray-500">No ingredients selected.</p>;
      }
      return (
        <div className="space-y-3 max-h-60 overflow-y-auto p-2">
          {ingredients.map((ingredient: string) => (
            <div key={ingredient} className="flex items-center gap-2">
              <label className="w-40 text-sm font-medium text-gray-700">{ingredient}</label>
              <input
                type="number"
                step="any"
                min="0"
                placeholder={`Price per kg (${currency.symbol})`}
                value={farmerDetails.ingredientPrices[ingredient] || ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setFarmerDetails(prev => ({
                    ...prev,
                    ingredientPrices: {
                      ...prev.ingredientPrices,
                      [ingredient]: isNaN(val) ? 0 : val
                    }
                  }));
                  const priceStrings = Object.entries(farmerDetails.ingredientPrices)
                    .filter(([_, v]) => v > 0)
                    .map(([k, v]) => `${k}: ${v}`);
                  setUserTranscript(priceStrings.join(', '));
                }}
                className="flex-1 px-3 py-2 border rounded-lg text-gray-800"
              />
              <span className="text-xs text-gray-500">{currency.symbol}</span>
            </div>
          ))}
          <button
            onClick={() => {
              const allFilled = ingredients.every(ing => farmerDetails.ingredientPrices[ing] && farmerDetails.ingredientPrices[ing] > 0);
              if (!allFilled) {
                toast.warning(safeT('enter_all_prices'));
                return;
              }
              processAnswer("Prices recorded");
            }}
            className="mt-3 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {safeT('confirm_prices')}
          </button>
        </div>
      );
    }

    if (q.type === "text") {
      return (
        <input
          type="text"
          value={userTranscript}
          onChange={(e) => setUserTranscript(e.target.value)}
          placeholder={q.placeholder || safeT('type_answer')}
          className="w-full px-4 py-3 border-2 rounded-xl text-blue-900 font-medium focus:border-blue-600 placeholder-gray-400"
        />
      );
    }

    return (
      <input
        type="text"
        value={userTranscript}
        onChange={(e) => setUserTranscript(e.target.value)}
        placeholder={safeT('type_answer')}
        className="w-full px-4 py-3 border-2 rounded-xl text-blue-900 font-medium focus:border-blue-600 placeholder-gray-400"
      />
    );
  }, [configStep, allQuestions, userTranscript, farmerDetails.availableIngredients, farmerDetails.ingredientPrices, currency.symbol, safeT]);

  // ========== RENDER ==========
  const colors = {
    primary: "from-emerald-400 to-cyan-400",
    secondary: "from-purple-400 to-pink-400",
    background: "bg-gradient-to-br from-slate-50 to-white",
    card: "bg-white/80 backdrop-blur-sm",
  };

  const currentSectionKey = allQuestions[configStep]?.sectionKey;
  const currentSection = currentSectionKey ? safeT(currentSectionKey) : "";
  const wordProgress = currentWordIndex > 0 && questionWordsRef.current.length > 0
    ? `${currentWordIndex}/${questionWordsRef.current.length} ${safeT('words')}`
    : '';

  return (
    <div className={`flex flex-col gap-6 p-4 ${colors.background} rounded-2xl min-h-screen`}>
      {/* Header */}
      <div className={`${colors.card} rounded-2xl p-5 shadow-xl border`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Image src={profileImage || "/farmer-avatar.png"} alt="Farmer" width={48} height={48} className="rounded-full ring-4" />
            <div>
              <h4 className="font-bold text-xl">{userName || safeT('farmer')}</h4>
              <p className="text-sm text-gray-500">{safeT('smart_farmer_building')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl px-3 py-2 border border-white-30">
              <Mic className={`w-5 h-5 text-white ${isSpeaking ? 'animate-pulse' : ''}`} />
              <button
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className="text-white font-medium text-sm focus:outline-none"
              >
                {voiceEnabled ? safeT('voice_on') : safeT('voice_off')}
              </button>
            </div>
            <button
              onClick={startVoiceSetup}
              disabled={!voiceEnabled || currentStep !== "idle"}
              className={`px-6 py-2 rounded-xl font-bold text-sm ${
                voiceEnabled && currentStep === "idle"
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:scale-105 transition-all'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {currentStep === "idle" ? safeT('start_setup') : safeT('loading')}
            </button>
          </div>
        </div>
        {isSpeaking && (
          <div className="mt-2 text-xs text-blue-600 flex items-center gap-1">
            <Volume2 className="w-3 h-3 animate-pulse" />
            <span>{safeT('speaking')} {wordProgress}</span>
          </div>
        )}
      </div>

      {/* Question Display */}
      {currentStep === "configuring" && allQuestions.length > 0 && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-8 shadow-xl border-2 border-green-300 min-h-[300px]">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center font-bold">
              {configStep + 1}
            </span>
            <h4 className="font-bold text-xl text-emerald-800">
              {safeT('question_x_of_y', { current: configStep + 1, total: allQuestions.length })}
            </h4>
            {currentSection && <p className="text-sm text-emerald-600 ml-auto">{currentSection}</p>}
            {isStreaming && (
              <span className="ml-auto flex items-center gap-2 text-emerald-600">
                <Volume2 className="w-5 h-5 animate-pulse" />
                <span className="text-sm">{wordProgress}</span>
              </span>
            )}
          </div>

          <div className="bg-white rounded-xl p-6 border-2 border-emerald-200 min-h-[120px]">
            {streamingQuestion ? (
              <p className="text-3xl text-gray-800">
                {streamingQuestion.split(' ').map((word, wordIdx, arr) => (
                  <span key={wordIdx}>
                    <span className="text-emerald-700 font-bold">{word}</span>
                    {wordIdx < arr.length - 1 ? ' ' : ''}
                  </span>
                ))}
              </p>
            ) : (
              <p className="text-3xl text-gray-400 italic">
                {isStreaming ? safeT('speaking_dots') : safeT('ready_for_answer')}
              </p>
            )}
          </div>

          {!isStreaming && streamingQuestion && (
            <div className="mt-6">
              <div className="bg-white rounded-xl border-2 border-purple-200 p-6">
                {renderInput()}

                {allQuestions[configStep]?.type !== "multiselect" && allQuestions[configStep]?.type !== "prices" && (
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={submitAnswer}
                      disabled={!userTranscript.trim()}
                      className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-2.5 rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      {safeT('submit_answer')}
                    </button>
                    <button
                      onClick={skipQuestion}
                      className="px-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white py-2.5 rounded-xl font-medium"
                    >
                      {safeT('skip')}
                    </button>
                  </div>
                )}

                {allQuestions[configStep]?.type === "multiselect" && (
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => {
                        const selected = farmerDetails.availableIngredients;
                        if (selected.length === 0) {
                          toast.warning(safeT('select_at_least_one'));
                          return;
                        }
                        processAnswer(selected.join(', '));
                      }}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-2.5 rounded-xl font-medium"
                    >
                      {safeT('confirm_selection')}
                    </button>
                  </div>
                )}
              </div>

              {lastSubmittedAnswer && allQuestions[configStep]?.type !== "prices" && (
                <div className="mt-3 p-3 bg-blue-50 rounded-xl border-2 border-blue-200">
                  <p className="text-sm text-blue-800 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    {safeT('your_answer')}: <span className="font-bold text-blue-900">{lastSubmittedAnswer}</span>
                  </p>
                  <p className="text-xs text-blue-600 mt-1">{safeT('voice_confirmation_sent')}</p>
                </div>
              )}

              {debugInfo.isListening && (
                <div className="mt-3 p-3 bg-gradient-to-r from-red-50 to-rose-50 rounded-xl flex items-center gap-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-red-600">{safeT('listening_speak_now')}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Stop Button */}
      {(currentStep === "configuring" || currentStep === "generating") && (
        <button onClick={stopEverything} className="px-5 py-3 bg-gradient-to-r from-rose-500 to-red-500 text-white rounded-xl mx-auto w-48 font-medium flex items-center justify-center gap-2">
          <span>{safeT('stop_setup')}</span>
        </button>
      )}
    </div>
  );
};

export default CreateInterviewAgent;