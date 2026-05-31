// lib/recommendationEngine.ts – FINAL: All French issues fixed (EN, FR, ES, SW)
import { COUNTRY_CURRENCY_MAP } from '@/lib/config/currency';
import { cropPestDiseaseMap, PestDisease } from '@/lib/data/pestDiseaseMapping';
import swTranslations from '../public/locales/sw/common.json';
import frTranslations from '../public/locales/fr/common.json';
import esTranslations from '../public/locales/es/common.json';
import { getDeficienciesForCrop } from '@/lib/data/nutrientDeficiency';
const SW = swTranslations as any;
const FR = frTranslations as any;
const ES = esTranslations as any;
import { soilTestInterpreter } from './soilTestInterpreter';

const safeT = (translation: any, fallback: string, ...args: any[]): string => {
  if (typeof translation === 'function') return translation(...args);
  let result = (translation as string) || fallback;
  for (let i = 0; i < args.length; i++) {
    result = result.replace(new RegExp(`\\{\\{${i}\\}\\}`, 'g'), args[i].toString());
    result = result.replace(new RegExp(`\\{\\{${i}\\?\\?.*?\\}\\}`, 'g'), args[i].toString());
  }
  return result;
};

const replacePlaceholders = (template: string | undefined, params: Record<string, string | number>): string => {
  if (!template) return "";
  let result = template;
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value.toString());
  }
  return result;
};

// ========== French‑only helpers ==========
const translateDeficiencyFr = (text: string): string => {
  const map: Record<string, string> = {
    "Purple color": "Couleur violette",
    "Yellow leaves": "Feuilles jaunes",
    "Older leaves (bottom)": "Vieilles feuilles (bas)",
    "Younger leaves (top)": "Jeunes feuilles (haut)",
    "Whole plant": "Plante entière",
    "Fruits/flowers only": "Fruits/fleurs uniquement",
    "not specified": "non spécifié"
  };
  return map[text] || text;
};

const translateStorageFr = (method: string | undefined): string => {
  if (!method) return "";
  const map: Record<string, string> = {
    "Sold immediately": "Vendu immédiatement",
    "Store in bags": "Stockage en sacs",
    "Refrigerated storage": "Stockage réfrigéré",
    "In-ground storage": "Stockage en terre"
  };
  return map[method] || method;
};

// ========== Translation helpers for rates, timing, safety, status, organic ==========
const translateRate = (rate: string, lang: string): string => {
  if (lang === 'es') return rate;
  const map: Record<string, Record<string, string>> = {
    sw: { "10ml per 20L water": "10 mililita kwa lita 20 za maji", "50g per 20L water": "50 gramu kwa lita 20 za maji", "40ml per 20L water": "40 mililita kwa lita 20 za maji", "20ml per 20L water": "20 mililita kwa lita 20 za maji", "4ml per 20L water": "4 mililita kwa lita 20 za maji", "5ml per 20L water": "5 mililita kwa lita 20 za maji", "30g per 20L water": "30 gramu kwa lita 20 za maji", "15g per 20L water": "15 gramu kwa lita 20 za maji" },
    fr: { "10ml per 20L water": "10 ml pour 20 L d'eau", "50g per 20L water": "50 g pour 20 L d'eau", "40ml per 20L water": "40 ml pour 20 L d'eau", "20ml per 20L water": "20 ml pour 20 L d'eau", "4ml per 20L water": "4 ml pour 20 L d'eau", "5ml per 20L water": "5 ml pour 20 L d'eau", "30g per 20L water": "30 g pour 20 L d'eau", "15g per 20L water": "15 g pour 20 L d'eau" }
  };
  return map[lang]?.[rate] || rate;
};

const translateTiming = (timing: string, lang: string): string => {
  if (lang === 'es') return timing;
  const map: Record<string, Record<string, string>> = {
    sw: { "When larvae young (1st-2nd instar)": "Wakati mabuu ni wachanga (1-2)", "When larvae young": "Wakati mabuu ni wachanga", "At first sign of larvae": "Wakati dalili za mabuu zinaonekana", "When larvae active": "Wakati mabuu wanashambulia", "When colonies appear": "Wakati makundi yanaonekana", "When aphids appear": "Wakati vidukari wanaonekana", "When webbing visible": "Wakati utando unaonekana", "When flies active": "Wakati nzi wanashambulia", "At first sign of disease, repeat every 7-10 days": "Dalili za kwanza za ugonjwa, rudia kila siku 7-10", "Every 7-10 days in wet weather": "Kila siku 7-10 wakati wa mvua", "At first sign of spots": "Wakati madoa yanaonekana", "Preventatively, every 7-10 days": "Kinga, kila siku 7-10", "Preventatively": "Kinga" },
    fr: { "When larvae young (1st-2nd instar)": "Quand les larves sont jeunes (1er-2e stade)", "When larvae young": "Quand les larves sont jeunes", "At first sign of larvae": "Au premier signe de larves", "When larvae active": "Quand les larves sont actives", "When colonies appear": "Quand les colonies apparaissent", "When aphids appear": "Quand les pucerons apparaissent", "When webbing visible": "Quand les toiles sont visibles", "When flies active": "Quand les mouches sont actives", "At first sign of disease, repeat every 7-10 days": "Au premier signe de maladie, répéter tous les 7-10 jours", "Every 7-10 days in wet weather": "Tous les 7-10 jours par temps humide", "At first sign of spots": "Au premier signe de taches", "Preventatively, every 7-10 days": "Préventivement, tous les 7-10 jours", "Preventatively": "Préventivement" }
  };
  return map[lang]?.[timing] || timing;
};

const translateSafety = (safety: string, lang: string): string => {
  if (lang === 'es') return safety;
  const map: Record<string, Record<string, string>> = {
    sw: { "14 days": "siku kumi na nne", "7 days": "siku saba", "21 days": "siku ishirini na moja", "30 days": "siku thelathini", "14 days before harvest": "siku kumi na nne kabla ya mavuno", "7 days before harvest": "siku saba kabla ya mavuno" },
    fr: { "14 days": "14 jours", "7 days": "7 jours", "21 days": "21 jours", "30 days": "30 jours", "14 days before harvest": "14 jours avant la récolte", "7 days before harvest": "7 jours avant la récolte" }
  };
  return map[lang]?.[safety] || safety;
};

const translateStatus = (status: string, lang: string): string => {
  if (lang === 'es') return status;
  const map: Record<string, Record<string, string>> = {
    sw: { "✅ Active": "✅ Inatumika", "⚠️ RESTRICTED": "⚠️ IMERESTRISHWA", "❌ BANNED": "❌ IMEPIGWA MARUFUKU", "check-locally": "Angalia upatikanaji" },
    fr: { "✅ Active": "✅ Actif", "⚠️ RESTRICTED": "⚠️ RESTREINT", "❌ BANNED": "❌ INTERDIT", "check-locally": "Vérifiez la disponibilité locale" }
  };
  return map[lang]?.[status] || status;
};

const translateOrganic = (text: string, lang: string): string => {
  if (lang === 'es') return text;
  const map: Record<string, Record<string, string>> = {
    sw: { "Mix 50ml neem oil with 20L water + few drops liquid soap": "Changanya 50 mililita mafuta ya mwarobaini na lita 20 za maji + matone machache ya sabuni", "Spray every 10-14 days": "Pulizia kila siku 10-14", "Spray every 7-10 days": "Pulizia kila siku 7-10", "Spray on affected plants": "Pulizia kwenye mimea iliyoathirika", "Cover beds with insect netting": "Funika vitanda kwa nyavu za wadudu", "Remove heavily infested leaves": "Ondoa majani yaliyoathirika sana", "Avoid excess nitrogen fertilizer which attracts aphids": "Epuka mbolea ya nitrojeni nyingi kwa sababu huvutia vidukari", "Hand removal": "Kuondoa kwa mkono", "Neem spray": "Pulizia ya mwarobaini", "Soap solution": "Suluhisho la sabuni" },
    fr: { "Mix 50ml neem oil with 20L water + few drops liquid soap": "Mélanger 50 ml d'huile de neem avec 20 L d'eau + quelques gouttes de savon liquide", "Spray every 10-14 days": "Pulvériser tous les 10-14 jours", "Spray every 7-10 days": "Pulvériser tous les 7-10 jours", "Spray on affected plants": "Pulvériser sur les plantes affectées", "Cover beds with insect netting": "Couvrir les planches avec une moustiquaire", "Remove heavily infested leaves": "Retirer les feuilles fortement infestées", "Avoid excess nitrogen fertilizer which attracts aphids": "Éviter l'excès d'engrais azoté qui attire les pucerons", "Hand removal": "Retrait manuel", "Neem spray": "Pulvérisation de neem", "Soap solution": "Solution savonneuse" }
  };
  return map[lang]?.[text] || text;
};

// ========== Nutrient description ==========
const getNutrientDescription = (nutrient: string, language: string): string => {
  const n = nutrient.toLowerCase();
  if (language === 'sw') {
    if (n === 'n') return 'kwa ukuaji wa majani na shina';
    if (n === 'p') return 'kwa ukuaji wa mizizi na maua';
    if (n === 'k') return 'kwa ubora wa matunda, upinzani wa magonjwa, utamu, rangi nzuri, na maisha marefu ya rafu';
    if (n === 's') return 'kwa usanisi wa protini, rangi ya majani, ladha na harufu';
    if (n === 'ca') return 'kwa nguvu za seli, kuzuia uozo wa maua, na kuongeza maisha ya rafu';
    if (n === 'mg') return 'kwa usanisi wa klorofili (rangi ya kijani)';
    if (n === 'zn') return 'kwa uundaji wa homoni za ukuaji';
    if (n === 'b') return 'kwa ukuaji wa maua, uchavushaji, umbo zuri la matunda, na mvuto sokoni';
    if (n === 'cu') return 'kwa usanisi wa lignin (nguvu za mimea)';
    if (n === 'mn') return 'kwa usanisi wa klorofili na ulinzi wa seli';
    return '';
  }
  if (language === 'fr') {
    if (n === 'n') return 'pour la croissance des feuilles et tiges';
    if (n === 'p') return 'pour le développement des racines et fleurs';
    if (n === 'k') return 'pour la qualité des fruits, résistance aux maladies, douceur, couleur attrayante et durée de conservation';
    if (n === 's') return 'pour la synthèse des protéines, la couleur des feuilles, la saveur et l\'arôme';
    if (n === 'ca') return 'pour la solidité des parois cellulaires, prévention de la pourriture apicale, et prolongation de la conservation';
    if (n === 'mg') return 'pour la synthèse de la chlorophylle (couleur verte)';
    if (n === 'zn') return 'pour la formation des hormones de croissance';
    if (n === 'b') return 'pour la floraison, la pollinisation, la forme des fruits et l\'attrait du marché';
    if (n === 'cu') return 'pour la synthèse de la lignine (rigidité des tiges)';
    if (n === 'mn') return 'pour la photosynthèse et la protection cellulaire';
    return '';
  }
  if (language === 'es') {
    if (n === 'n') return 'para el crecimiento de hojas y tallos';
    if (n === 'p') return 'para el desarrollo de raíces y flores';
    if (n === 'k') return 'para la calidad de la fruta, resistencia a enfermedades, dulzura, color atractivo y mayor vida útil';
    if (n === 's') return 'para la síntesis de proteínas, color de las hojas, sabor y aroma';
    if (n === 'ca') return 'para la resistencia de la pared celular, prevención de la pudrición apical y prolongación de la conservación';
    if (n === 'mg') return 'para la síntesis de clorofila (color verde)';
    if (n === 'zn') return 'para la formación de hormonas de crecimiento';
    if (n === 'b') return 'para la floración, polinización, forma de la fruta y atractivo comercial';
    if (n === 'cu') return 'para la síntesis de lignina (resistencia del tallo)';
    if (n === 'mn') return 'para la fotosíntesis y protección celular';
    return '';
  }
  if (n === 'n') return 'for leafy growth';
  if (n === 'p') return 'for root development';
  if (n === 'k') return 'for fruit quality, disease resistance, sweetness, appealing colour, and longer shelf life';
  if (n === 's') return 'for protein synthesis, leaf colour, flavour and aroma';
  if (n === 'ca') return 'for cell wall strength, blossom end rot prevention, and extended shelf life';
  if (n === 'mg') return 'for chlorophyll synthesis (green colour)';
  if (n === 'zn') return 'for growth hormone formation';
  if (n === 'b') return 'for flowering, pollination, fruit shape, and improved market appeal';
  if (n === 'cu') return 'for lignin synthesis (stem strength)';
  if (n === 'mn') return 'for chlorophyll synthesis and cell protection';
  return '';
};

const formatNutrientString = (nutrientString: string | null, language: string): string => {
  if (!nutrientString || nutrientString === "No additional nutrients") return "";
  const pairs = nutrientString.split('+');
  const formatted = pairs.map(pair => {
    const match = pair.match(/(\d+(?:\.\d+)?)([A-Z]+)/);
    if (match) {
      const value = match[1];
      const element = match[2].toLowerCase();
      const desc = getNutrientDescription(element, language);
      return `${element.toUpperCase()}: ${value}% ${desc ? `(${desc})` : ''}`;
    }
    return pair;
  }).join(', ');
  if (language === 'sw') return `Virutubisho vya ziada: ${formatted}`;
  if (language === 'fr') return `Nutriments supplémentaires : ${formatted}`;
  if (language === 'es') return `Nutrientes adicionales: ${formatted}`;
  return `Additional nutrients: ${formatted}`;
};

const getCropCategory = (crop: string): string => {
  const c = crop.toLowerCase();
  const grains = ["maize","beans","wheat","sorghum","millet","rice","barley","finger millet","oats","teff","triticale","buckwheat","quinoa","fonio","spelt","kamut","amaranth grain"];
  const pulses = ["soya beans","cowpeas","green grams","bambara nuts","groundnuts","pigeon peas","chickpea","lentil","faba bean","peanut","alfalfa","lucerne","clover","white clover","vetch","mucuna","desmodium","dolichos","canavalia","sunn hemp","crotalaria paulina"];
  const tubers = ["cassava","sweet potatoes","irish potatoes","yams","taro","arrow roots","ginger","turmeric","horseradish","parsnip","turnip","rutabaga","beetroot","radish"];
  const vegetables = ["tomatoes","cabbage","kales","onions","carrots","capsicums","chillies","brinjals","eggplants","french beans","garden peas","spinach","okra","cauliflower","lettuce","broccoli","celery","leeks","pumpkin leaves","sweet potato leaves","jute mallow","spider plant","african nightshade","amaranth","ethiopian kale","coriander","parsley","arugula","endive","kohlrabi","watercress","pumpkin","courgettes","cucumbers","artichoke","asparagus","rhubarb","wasabi","bok choy","collard greens","mustard greens","swiss chard","radicchio","escarole","frisee","turnip greens"];
  const fruits = ["bananas","oranges","pineapples","mangoes","avocados","pawpaws","passion fruit","citrus","watermelon","grapefruit","lemons","limes","guava","jackfruit","breadfruit","pomegranate","star fruit","coconut","fig","date palm","mulberry","lychee","persimmon","gooseberry","currant","elderberry","rambutan","durian","mangosteen","longan","marula"];
  if (grains.includes(c)) return "grains";
  if (pulses.includes(c)) return "pulses";
  if (tubers.includes(c)) return "tubers";
  if (vegetables.includes(c)) return "vegetables";
  if (fruits.includes(c)) return "fruits";
  return "other";
};

const getPostHarvestLossWarning = (crop: string, language: string): string => {
  const c = crop.toLowerCase();
  if (language === 'sw') {
    if (c.includes('cabbage')||c.includes('kale')) return "⚠️ HADHARI: Utunzaji duni wa kabichi/sukumawiki unaweza kusababisha hasara ya HADI 50%! Majani ya nje yaliyovunjika huoza haraka, na majani yaliyopasuka huvutia bakteria – hii inapunguza thamani ya soko na maisha ya rafu.";
    return "⚠️ HADHARI: Utunzaji duni wa mavuno unaweza kusababisha hasara ya HADI 50%! Aflatoxini (sumu), majeraha, uchafu na metali nzito hushusha ubora na kuzuia soko.";
  }
  if (language === 'fr') return "⚠️ ATTENTION : Une mauvaise manutention peut entraîner une PERTE DE 50% ! L'aflatoxine, les blessures, la contamination et les métaux lourds réduisent la qualité.";
  if (language === 'es') return "⚠️ ADVERTENCIA: ¡El mal manejo postcosecha puede causar una PÉRDIDA DE HASTA EL 50%! La aflatoxina, los daños físicos, la contaminación y los oligoelementos reducen la calidad.";
  if (c.includes('cabbage')||c.includes('kale')) return "⚠️ WARNING: Poor cabbage/kale handling can cause UP TO 50% LOSS! Broken outer leaves rot quickly, and split heads invite bacteria – this reduces market value and shelf life.";
  return "⚠️ WARNING: Poor post‑harvest handling can cause UP TO 50% LOSS! Aflatoxin (toxic mould), physical injury, contamination and trace elements lower quality and block market access.";
};

const getSortingGradingAdvice = (crop: string, language: string): string => {
  const c = crop.toLowerCase();
  if (language === 'sw') {
    if (c.includes('cabbage')||c.includes('kale')) return "Panga na chemsha kabichi/sukumawiki: ondoa majani ya nje yaliyovunjika, yaliyokauka au yenye madoa – **majani yaliyoharibika husababisha uozo unaoenea haraka**. Weka vichwa vilivyo imara na safi.";
    return "Panga na chemsha mavuno yako: ondoa yaliyoharibika, yenye ukungu au majeraha – **kuondoa bidhaa mbaya huzuia kuenea kwa magonjwa na inaboresha bei kwa 20-30%**.";
  }
  if (language === 'fr') return "Triez et calibrez : retirez les produits endommagés – **cela empêche la propagation des maladies et augmente le prix de 20-30%**.";
  if (language === 'es') return "Clasifique y calibre: retire los productos dañados – **esto evita la propagación de enfermedades y aumenta el precio entre un 20-30%**.";
  if (c.includes('cabbage')||c.includes('kale')) return "Sort and grade cabbage/kale: remove loose, yellow or cracked outer leaves – **damaged leaves spread rot quickly**. Keep firm, compact heads with clean leaves.";
  return "Sort and grade your produce: remove damaged, mouldy or injured items – **removing bad produce prevents disease spread and improves price by 20-30%**.";
};

const getValueAdditionSuggestion = (crop: string, language: string): string => {
  const c = crop.toLowerCase();
  if (language === 'sw') {
    if (c.includes('cabbage')||c.includes('kale')) return "Ongeza thamani: Tengeneza sauerkraut (kabichi iliyochachuka) au kabichi kavu – **kuchachuka kunaongeza probiotics na kuhifadhi kwa miezi 6+, kukausha kunazuia uozo**. Pia unaweza kutengeneza coleslaw safi kwa bei ya juu.";
    return "Ongeza thamani: Kausha, saga, funga kwa plastiki – **kukausha huondoa unyevu unaosababisha uozo, na ufungaji mzuri huzuia wadudu**. Bidhaa iliyochakatwa ina bei mara 2-3.";
  }
  if (language === 'fr') return "Ajoutez de la valeur : séchez, broyez, emballez – **le séchage élimine l'humidité qui cause la pourriture, et l'emballage hermétique empêche les insectes**.";
  if (language === 'es') return "Agregue valor: seque, muela, empaque – **el secado elimina la humedad que causa la pudrición, y el empaque hermético previene los insectos**.";
  if (c.includes('cabbage')||c.includes('kale')) return "Add value: Make sauerkraut (fermented cabbage) or dried cabbage – **fermentation adds probiotics and preserves for 6+ months, drying stops rot**. Also sell fresh coleslaw mix for premium.";
  return "Add value: dry, mill, package – **drying removes moisture that causes rot, and good packaging prevents pests**. Processed products sell for 2-3x higher price.";
};

interface RecommendationInput {
  hasSoilTest: boolean;
  soilAnalysis?: any;
  fertilizerPlan?: any;
  crop: string;
  crops: string[];
  farmerData: any;
}
interface RecommendationOutput {
  list: string[];
  financialAdvice: string;
  structuredList: any[];
  structuredFinancialAdvice: any;
}

export async function generateRecommendations(input: RecommendationInput): Promise<RecommendationOutput> {
  const structuredList: any[] = [];
  const { hasSoilTest, soilAnalysis, fertilizerPlan, crop, farmerData } = input;
  const lowerCrop = crop.toLowerCase();
  const country = farmerData.country || 'kenya';
  const language = farmerData.language || 'en';
  const isSwahili = language === 'sw';
  const isFrench = language === 'fr';
  const isSpanish = language === 'es';
  const isEnglish = !isSwahili && !isFrench && !isSpanish;

  const formatCurrency = (amount: number): string => {
    const currency = COUNTRY_CURRENCY_MAP[country] || COUNTRY_CURRENCY_MAP.kenya;
    const symbol = farmerData.currencySymbol || currency.symbol;
    const formattedAmount = new Intl.NumberFormat(currency.locale, {
      style: 'decimal',
      minimumFractionDigits: currency.decimalPlaces,
      maximumFractionDigits: currency.decimalPlaces
    }).format(amount);
    return currency.position === 'before' ? `${symbol} ${formattedAmount}` : `${formattedAmount} ${symbol}`;
  };
  const currencySymbol = farmerData.currencySymbol || COUNTRY_CURRENCY_MAP[country]?.symbol || 'Ksh';

  // ========== GROUP 1: SOIL TEST ANALYSIS ==========
  if (hasSoilTest && soilAnalysis) {
    const soilLines: string[] = [];
    const ph = soilAnalysis.ph ?? '?';
    const phRating = soilAnalysis.phRating || '';
    const phosphorus = soilAnalysis.phosphorus ?? '?';
    const phosphorusRating = soilAnalysis.phosphorusRating || '';
    const potassium = soilAnalysis.potassium ?? '?';
    const potassiumRating = soilAnalysis.potassiumRating || '';
    const calcium = soilAnalysis.calcium ?? '?';
    const calciumRating = soilAnalysis.calciumRating || '';
    const magnesium = soilAnalysis.magnesium ?? '?';
    const magnesiumRating = soilAnalysis.magnesiumRating || '';
    const totalNitrogen = soilAnalysis.totalNitrogen ?? '?';
    const totalNitrogenRating = soilAnalysis.totalNitrogenRating || '';
    const organicMatter = soilAnalysis.organicMatter ?? '?';
    const organicMatterRating = soilAnalysis.organicMatterRating || '';

    if (isSwahili) {
      soilLines.push(`pH: ${ph} (${phRating === 'Very Low' ? 'Chini Sana' : phRating === 'Low' ? 'Chini' : phRating || '?'})`);
      if (typeof ph === 'number' && ph < 5.5) soilLines.push(`– Asidi nyingi. Inahitaji chokaa.`);
      soilLines.push(`Fosforasi (P): ${phosphorus} ppm (${phosphorusRating === 'Very Low' ? 'Chini Sana' : phosphorusRating === 'Low' ? 'Chini' : phosphorusRating || '?'})`);
      if (typeof phosphorus === 'number' && phosphorus < 15) soilLines.push(`– Chini. Inahitaji mbolea ya fosforasi.`);
      soilLines.push(`Potasiamu (K): ${potassium} ppm (${potassiumRating === 'Very Low' ? 'Chini Sana' : potassiumRating === 'Low' ? 'Chini' : potassiumRating || '?'})`);
      if (typeof potassium === 'number' && potassium < 100) soilLines.push(`– Chini. Inahitaji mbolea ya potasiamu.`);
      soilLines.push(`Kalsiamu (Ca): ${calcium} ppm (${calciumRating === 'Very Low' ? 'Chini Sana' : calciumRating === 'Low' ? 'Chini' : calciumRating || '?'})`);
      soilLines.push(`Magnesiamu (Mg): ${magnesium} ppm (${magnesiumRating === 'Very Low' ? 'Chini Sana' : magnesiumRating === 'Low' ? 'Chini' : magnesiumRating || '?'})`);
      soilLines.push(`Nitrojeni (N): ${totalNitrogen}% (${totalNitrogenRating === 'Very Low' ? 'Chini Sana' : totalNitrogenRating === 'Low' ? 'Chini' : totalNitrogenRating || '?'})`);
      soilLines.push(`Mabaki Hai: ${organicMatter}% (${organicMatterRating === 'Very Low' ? 'Chini Sana' : organicMatterRating === 'Low' ? 'Chini' : organicMatterRating || '?'})`);
    } else if (isFrench) {
      soilLines.push(`pH : ${ph} (${phRating === 'Very Low' ? 'Très faible' : phRating === 'Low' ? 'Faible' : phRating || '?'})`);
      if (typeof ph === 'number' && ph < 5.5) soilLines.push(`– Trop acide. Besoin de chaux.`);
      soilLines.push(`Phosphore (P) : ${phosphorus} ppm (${phosphorusRating === 'Very Low' ? 'Très faible' : phosphorusRating === 'Low' ? 'Faible' : phosphorusRating || '?'})`);
      if (typeof phosphorus === 'number' && phosphorus < 15) soilLines.push(`– Faible. Besoin d'engrais phosphaté.`);
      soilLines.push(`Potassium (K) : ${potassium} ppm (${potassiumRating === 'Very Low' ? 'Très faible' : potassiumRating === 'Low' ? 'Faible' : potassiumRating || '?'})`);
      if (typeof potassium === 'number' && potassium < 100) soilLines.push(`– Faible. Besoin d'engrais potassique.`);
      soilLines.push(`Calcium (Ca) : ${calcium} ppm (${calciumRating === 'Very Low' ? 'Très faible' : calciumRating === 'Low' ? 'Faible' : calciumRating || '?'})`);
      soilLines.push(`Magnésium (Mg) : ${magnesium} ppm (${magnesiumRating === 'Very Low' ? 'Très faible' : magnesiumRating === 'Low' ? 'Faible' : magnesiumRating || '?'})`);
      soilLines.push(`Azote (N) : ${totalNitrogen}% (${totalNitrogenRating === 'Very Low' ? 'Très faible' : totalNitrogenRating === 'Low' ? 'Faible' : totalNitrogenRating || '?'})`);
      soilLines.push(`Matière organique : ${organicMatter}% (${organicMatterRating === 'Very Low' ? 'Très faible' : organicMatterRating === 'Low' ? 'Faible' : organicMatterRating || '?'})`);
    } else if (isSpanish) {
      soilLines.push(`pH: ${ph} (${phRating === 'Very Low' ? 'Muy bajo' : phRating === 'Low' ? 'Bajo' : phRating || '?'})`);
      if (typeof ph === 'number' && ph < 5.5) soilLines.push(`– Demasiado ácido. Necesita cal.`);
      soilLines.push(`Fósforo (P): ${phosphorus} ppm (${phosphorusRating === 'Very Low' ? 'Muy bajo' : phosphorusRating === 'Low' ? 'Bajo' : phosphorusRating || '?'})`);
      if (typeof phosphorus === 'number' && phosphorus < 15) soilLines.push(`– Bajo. Necesita fertilizante fosforado.`);
      soilLines.push(`Potasio (K): ${potassium} ppm (${potassiumRating === 'Very Low' ? 'Muy bajo' : potassiumRating === 'Low' ? 'Bajo' : potassiumRating || '?'})`);
      if (typeof potassium === 'number' && potassium < 100) soilLines.push(`– Bajo. Necesita fertilizante potásico.`);
      soilLines.push(`Calcio (Ca): ${calcium} ppm (${calciumRating === 'Very Low' ? 'Muy bajo' : calciumRating === 'Low' ? 'Bajo' : calciumRating || '?'})`);
      soilLines.push(`Magnesio (Mg): ${magnesium} ppm (${magnesiumRating === 'Very Low' ? 'Muy bajo' : magnesiumRating === 'Low' ? 'Bajo' : magnesiumRating || '?'})`);
      soilLines.push(`Nitrógeno (N): ${totalNitrogen}% (${totalNitrogenRating === 'Very Low' ? 'Muy bajo' : totalNitrogenRating === 'Low' ? 'Bajo' : totalNitrogenRating || '?'})`);
      soilLines.push(`Materia orgánica: ${organicMatter}% (${organicMatterRating === 'Very Low' ? 'Muy bajo' : organicMatterRating === 'Low' ? 'Bajo' : organicMatterRating || '?'})`);
    } else {
      soilLines.push(`pH: ${ph} (${phRating || '?'})`);
      if (typeof ph === 'number' && ph < 5.5) soilLines.push(`– Too acidic. Needs lime.`);
      else if (typeof ph === 'number' && ph > 7.5) soilLines.push(`– Too alkaline. Needs sulfur/organic matter.`);
      soilLines.push(`Phosphorus (P): ${phosphorus} ppm (${phosphorusRating || '?'})`);
      if (typeof phosphorus === 'number' && phosphorus < 15) soilLines.push(`– Low. Needs phosphorus fertilizer.`);
      soilLines.push(`Potassium (K): ${potassium} ppm (${potassiumRating || '?'})`);
      if (typeof potassium === 'number' && potassium < 100) soilLines.push(`– Low. Needs potassium fertilizer.`);
      soilLines.push(`Calcium (Ca): ${calcium} ppm (${calciumRating || '?'})`);
      soilLines.push(`Magnesium (Mg): ${magnesium} ppm (${magnesiumRating || '?'})`);
      soilLines.push(`Nitrogen (N): ${totalNitrogen}% (${totalNitrogenRating || '?'})`);
      soilLines.push(`Organic Matter (OM): ${organicMatter}% (${organicMatterRating || '?'})`);
    }
    structuredList.push({
      key: 'soil_test_grouped',
      params: {
        title: isSwahili ? SW.soil_analysis_title : isFrench ? FR.soil_analysis_title : isSpanish ? ES.soil_analysis_title : 'SOIL TEST ANALYSIS - KNOW YOUR SOIL, GROW YOUR BUSINESS',
        content: soilLines.join('\n'),
        insight: isSwahili ? safeT(SW.soil_business_insight, `BUSINESS INSIGHT: Kila ${currencySymbol}1 unayowekeza katika urekebishaji wa udongo hukurejeshea ${currencySymbol}3-5 kwa mavuno makubwa!`, currencySymbol) : isFrench ? safeT(FR.soil_business_insight, `BUSINESS INSIGHT: Chaque ${currencySymbol}1 investi dans la correction du sol rapporte ${currencySymbol}3-5 en rendements plus élevés!`, currencySymbol) : isSpanish ? safeT(ES.soil_business_insight, `PERSPECTIVA DE NEGOCIO: ¡Cada ${currencySymbol}1 invertido en corrección del suelo retorna ${currencySymbol}3-5 en mayores rendimientos!`, currencySymbol) : `BUSINESS INSIGHT: Every ${currencySymbol}1 invested in soil correction returns ${currencySymbol}3-5 in higher yields!`,
        yearly: isSwahili ? SW.soil_test_yearly : isFrench ? FR.soil_test_yearly : isSpanish ? ES.soil_test_yearly : 'TEST SOIL YEARLY to track improvements and adjust inputs.',
        symbol: currencySymbol,
        ph, phRating, phosphorus, phosphorusRating, potassium, potassiumRating,
        calcium, calciumRating, magnesium, magnesiumRating, totalNitrogen, totalNitrogenRating, organicMatter, organicMatterRating,
      }
    });
  }

  // ========== GROUP 2: CALCITIC LIME – hardcoded French whyText ==========
  if (hasSoilTest && farmerData.recCalciticLime && farmerData.recCalciticLime > 0) {
    const limeKg = farmerData.recCalciticLime;
    const limePricePerBag = farmerData.limePricePerBag || 300;
    const bagsNeeded = Math.ceil(limeKg / 50);
    const totalCost = bagsNeeded * limePricePerBag;
    let whyText = '';

    if (isSwahili) {
      if (soilAnalysis && soilAnalysis.ph < 5.5 && soilAnalysis.calcium && soilAnalysis.calcium < 400) {
        whyText = safeT(SW.calcitic_lime_why_acidic_low_ca, `Kwa nini: pH yako ni ${soilAnalysis.ph} (asidi) na kalsiamu yako ni chini (${soilAnalysis.calcium} ppm). Chokaa cha calcitic hurekebisha matatizo yote mawili!`, soilAnalysis.ph, soilAnalysis.calcium);
      } else if (soilAnalysis && soilAnalysis.ph < 5.5) {
        whyText = safeT(SW.calcitic_lime_why_acidic, `Kwa nini: pH yako ni ${soilAnalysis.ph} (asidi). Chokaa cha calcitic kitaongeza pH na kuongeza kalsiamu.`, soilAnalysis.ph);
      } else if (soilAnalysis && soilAnalysis.calcium && soilAnalysis.calcium < 400) {
        whyText = safeT(SW.calcitic_lime_why_low_ca, `Kwa nini: Kalsiamu yako ni chini (${soilAnalysis.calcium} ppm). Chokaa cha calcitic huongeza kalsiamu bila kuongeza magnesiamu.`, soilAnalysis.calcium);
      }
    } else if (isFrench) {
      // Hardcoded French whyText – replaces {{ph}} and {{ca}}
      if (soilAnalysis && soilAnalysis.ph < 5.5 && soilAnalysis.calcium && soilAnalysis.calcium < 400) {
        whyText = `Pourquoi : Votre pH est ${soilAnalysis.ph} (acide) et votre calcium est faible (${soilAnalysis.calcium} ppm). La chaux calcique résout les deux problèmes !`;
      } else if (soilAnalysis && soilAnalysis.ph < 5.5) {
        whyText = `Pourquoi : Votre pH est ${soilAnalysis.ph} (acide). La chaux calcique augmentera le pH et ajoutera du calcium.`;
      } else if (soilAnalysis && soilAnalysis.calcium && soilAnalysis.calcium < 400) {
        whyText = `Pourquoi : Votre calcium est faible (${soilAnalysis.calcium} ppm). La chaux calcique ajoute du calcium sans ajouter de magnésium.`;
      }
    } else if (isSpanish) {
      if (soilAnalysis && soilAnalysis.ph < 5.5 && soilAnalysis.calcium && soilAnalysis.calcium < 400) {
        whyText = safeT(ES.calcitic_lime_why_acidic_low_ca, `Por qué: Su pH es ${soilAnalysis.ph} (ácido) y su calcio es bajo (${soilAnalysis.calcium} ppm). ¡La cal calcítica soluciona ambos problemas!`, soilAnalysis.ph, soilAnalysis.calcium);
      } else if (soilAnalysis && soilAnalysis.ph < 5.5) {
        whyText = safeT(ES.calcitic_lime_why_acidic, `Por qué: Su pH es ${soilAnalysis.ph} (ácido). La cal calcítica elevará el pH y agregará calcio.`, soilAnalysis.ph);
      } else if (soilAnalysis && soilAnalysis.calcium && soilAnalysis.calcium < 400) {
        whyText = safeT(ES.calcitic_lime_why_low_ca, `Por qué: Su calcio es bajo (${soilAnalysis.calcium} ppm). La cal calcítica agrega calcio sin agregar magnesio.`, soilAnalysis.calcium);
      }
    } else {
      if (soilAnalysis && soilAnalysis.ph < 5.5 && soilAnalysis.calcium && soilAnalysis.calcium < 400) {
        whyText = `Why: Your pH is ${soilAnalysis.ph} (acidic) and your calcium is low (${soilAnalysis.calcium} ppm). Calcitic lime fixes both problems!`;
      } else if (soilAnalysis && soilAnalysis.ph < 5.5) {
        whyText = `Why: Your pH is ${soilAnalysis.ph} (acidic). Calcitic lime will raise pH and add calcium.`;
      } else if (soilAnalysis && soilAnalysis.calcium && soilAnalysis.calcium < 400) {
        whyText = `Why: Your calcium is low (${soilAnalysis.calcium} ppm). Calcitic lime adds calcium without adding magnesium.`;
      }
    }

    const title = isSwahili ? SW.calcitic_lime_title : isFrench ? FR.calcitic_lime_title : isSpanish ? ES.calcitic_lime_title : 'CALCITIC LIME RECOMMENDATION FROM YOUR SOIL TEST';
    const need = isSwahili ? safeT(SW.calcitic_lime_need, `Kulingana na uchambuzi wako wa udongo, unahitaji ${limeKg} kg ya chokaa kwa ekari.`, limeKg) : isFrench ? safeT(FR.calcitic_lime_need, `Selon votre analyse de sol, vous avez besoin de ${limeKg} kg de chaux par acre.`, limeKg) : isSpanish ? safeT(ES.calcitic_lime_need, `Según su análisis de suelo, necesita ${limeKg} kg de cal por acre.`, limeKg) : `Based on your soil test, you need ${limeKg} kg of calcitic lime per acre.`;
    const bags = isSwahili ? safeT(SW.calcitic_lime_bags, `Hii ni magunia ${bagsNeeded} ya 50kg.`, bagsNeeded) : isFrench ? safeT(FR.calcitic_lime_bags, `Cela représente ${bagsNeeded} sacs de 50 kg.`, bagsNeeded) : isSpanish ? safeT(ES.calcitic_lime_bags, `Esto es ${bagsNeeded} sacos de 50 kg.`, bagsNeeded) : `This is ${bagsNeeded} bags of 50kg.`;
    const cost = isSwahili ? safeT(SW.calcitic_lime_cost, `Gharama: ${formatCurrency(totalCost)} (${formatCurrency(limePricePerBag)} kwa gunia)`, formatCurrency(totalCost), formatCurrency(limePricePerBag)) : isFrench ? safeT(FR.calcitic_lime_cost, `Coût : ${formatCurrency(totalCost)} (${formatCurrency(limePricePerBag)} par sac)`, formatCurrency(totalCost), formatCurrency(limePricePerBag)) : isSpanish ? safeT(ES.calcitic_lime_cost, `Costo: ${formatCurrency(totalCost)} (${formatCurrency(limePricePerBag)} por saco)`, formatCurrency(totalCost), formatCurrency(limePricePerBag)) : `Cost: ${formatCurrency(totalCost)} (${formatCurrency(limePricePerBag)} per bag)`;
    const application = isSwahili ? safeT(SW.calcitic_lime_application, "Weka wiki 3-4 kabla ya kupanda na uchanganye kwenye sentimita 10-15 za juu za udongo.") : isFrench ? safeT(FR.calcitic_lime_application, "Appliquez 3-4 semaines avant la plantation et incorporez dans les 10-15 cm supérieurs du sol.") : isSpanish ? safeT(ES.calcitic_lime_application, "Aplique 3-4 semanas antes de la siembra e incorpore en los primeros 10-15 cm de suelo.") : 'Apply 3-4 weeks before planting and incorporate into top 10-15cm soil.';
    const wait = isSwahili ? safeT(SW.calcitic_lime_wait, "Subiri wiki 1-2 kabla ya kutumia mbolea za nitrojeni.") : isFrench ? safeT(FR.calcitic_lime_wait, "Attendez 1-2 semaines avant d'appliquer des engrais azotés.") : isSpanish ? safeT(ES.calcitic_lime_wait, "Espere 1-2 semanas antes de aplicar fertilizantes nitrogenados.") : 'Wait 1-2 weeks before applying nitrogen fertilizers.';
    const business = isSwahili ? safeT(SW.calcitic_lime_business_case, "FAIDA YA BIASHARA: pH sahihi inaweza kuongeza unyonyaji wa virutubisho kwa 30-50%!") : isFrench ? safeT(FR.calcitic_lime_business_case, "AVANTAGE COMMERCIAL : Un pH correct peut augmenter l'absorption des nutriments de 30 à 50 % !") : isSpanish ? safeT(ES.calcitic_lime_business_case, "CASO DE NEGOCIO: ¡El pH adecuado puede aumentar la absorción de nutrientes en un 30-50%!") : 'BUSINESS CASE: Proper pH can increase nutrient uptake by 30-50%!';
    const yearly = isSwahili ? safeT(SW.soil_test_yearly_reapply, "CHUNGUZA UDONGO KILA MWAKA kujua wakati wa kurudia.") : isFrench ? safeT(FR.soil_test_yearly_reapply, "ANALYSEZ LE SOL CHAQUE ANNÉE pour savoir quand renouveler l'application.") : isSpanish ? safeT(ES.soil_test_yearly_reapply, "ANALICE EL SUELO ANUALMENTE para saber cuándo reaplicar.") : 'TEST SOIL YEARLY to know when to reapply.';

    const contentLines = [title, need, bags, cost, whyText, application, wait, business, yearly].filter(line => line && line.trim() !== '');
    const content = contentLines.join('\n');
    structuredList.push({ key: 'calcitic_lime_grouped', params: { content, kg: limeKg, bags: bagsNeeded, total: formatCurrency(totalCost), perBag: formatCurrency(limePricePerBag), ph: soilAnalysis?.ph, ca: soilAnalysis?.calcium } });
  }

  // ========== GROUP 3: DOLOMITIC LIME – hardcoded French custom message ==========
  if (hasSoilTest && soilAnalysis) {
    const autoDolomitic = soilTestInterpreter.getDolomiticLimeRecommendation(soilAnalysis);
    let dolomiticNeeded = autoDolomitic.needed;
    let limeKg = autoDolomitic.kgPerAcre;
    if (farmerData.recDolomiticLime && farmerData.recDolomiticLime > 0) {
      limeKg = farmerData.recDolomiticLime;
      dolomiticNeeded = true;
    }
    if (dolomiticNeeded && limeKg > 0) {
      const dolomiticPricePerBag = farmerData.dolomiticLimePricePerBag || farmerData.limePricePerBag || 300;
      const bagsNeeded = Math.ceil(limeKg / 50);
      const totalCost = bagsNeeded * dolomiticPricePerBag;
      let whyText = autoDolomitic.reason;
      let title, need, bagsText, costText, application, wait, business, yearly;
      if (isSwahili) {
        title = SW.dolomitic_lime_title;
        need = replacePlaceholders(SW.dolomitic_lime_need, { kg: limeKg });
        bagsText = replacePlaceholders(SW.dolomitic_lime_bags, { bags: bagsNeeded });
        costText = replacePlaceholders(SW.dolomitic_lime_cost, { total: formatCurrency(totalCost), perBag: formatCurrency(dolomiticPricePerBag) });
        application = SW.dolomitic_lime_application;
        wait = SW.dolomitic_lime_wait;
        business = SW.dolomitic_lime_business_case;
        yearly = SW.dolomitic_lime_yearly;
        if (farmerData.recDolomiticLime && farmerData.recDolomiticLime > 0) {
          const caMgRatio = (soilAnalysis?.calcium / soilAnalysis?.magnesium).toFixed(1);
          whyText = `Umetaja kiwango maalum cha ${limeKg} kg/ekari. Magnesiamu yako ni chini (${soilAnalysis?.magnesium} ppm) na uwiano Ca:Mg ni ${caMgRatio}:1. Chokaa cha dolomitic kinarekebisha yote mawili.`;
        }
      } else if (isFrench) {
        title = FR.dolomitic_lime_title;
        need = replacePlaceholders(FR.dolomitic_lime_need, { kg: limeKg });
        bagsText = replacePlaceholders(FR.dolomitic_lime_bags, { bags: bagsNeeded });
        costText = replacePlaceholders(FR.dolomitic_lime_cost, { total: formatCurrency(totalCost), perBag: formatCurrency(dolomiticPricePerBag) });
        application = FR.dolomitic_lime_application;
        wait = FR.dolomitic_lime_wait;
        business = FR.dolomitic_lime_business_case;
        yearly = FR.dolomitic_lime_yearly;
        if (farmerData.recDolomiticLime && farmerData.recDolomiticLime > 0) {
          const caMgRatio = (soilAnalysis?.calcium / soilAnalysis?.magnesium).toFixed(1);
          whyText = `Vous avez spécifié un taux personnalisé de ${limeKg} kg/acre. Votre magnésium est faible (${soilAnalysis?.magnesium} ppm) et le rapport Ca:Mg est de ${caMgRatio}:1. La chaux dolomitique corrige les deux.`;
        }
      } else if (isSpanish) {
        title = ES.dolomitic_lime_title;
        need = replacePlaceholders(ES.dolomitic_lime_need, { kg: limeKg });
        bagsText = replacePlaceholders(ES.dolomitic_lime_bags, { bags: bagsNeeded });
        costText = replacePlaceholders(ES.dolomitic_lime_cost, { total: formatCurrency(totalCost), perBag: formatCurrency(dolomiticPricePerBag) });
        application = ES.dolomitic_lime_application;
        wait = ES.dolomitic_lime_wait;
        business = ES.dolomitic_lime_business_case;
        yearly = ES.dolomitic_lime_yearly;
        if (farmerData.recDolomiticLime && farmerData.recDolomiticLime > 0) {
          const caMgRatio = (soilAnalysis?.calcium / soilAnalysis?.magnesium).toFixed(1);
          whyText = `Especificó una tasa personalizada de ${limeKg} kg/acre. Su magnesio es bajo (${soilAnalysis?.magnesium} ppm) y la relación Ca:Mg es de ${caMgRatio}:1. La cal dolomítica corrige ambos.`;
        }
      } else {
        title = "DOLOMITIC LIME RECOMMENDATION FROM YOUR SOIL TEST";
        need = `Based on your soil test, you need ${limeKg} kg of dolomitic lime per acre.`;
        bagsText = `This is ${bagsNeeded} bags of 50kg.`;
        costText = `Cost: ${formatCurrency(totalCost)} (${formatCurrency(dolomiticPricePerBag)} per bag)`;
        application = "Apply 3-4 weeks before planting and incorporate into top 10-15cm soil.";
        wait = "Wait 1-2 weeks before applying nitrogen fertilizers.";
        business = "BUSINESS CASE: Proper magnesium improves chlorophyll synthesis and photosynthesis!";
        yearly = "TEST SOIL YEARLY to know when to reapply.";
        if (farmerData.recDolomiticLime && farmerData.recDolomiticLime > 0) {
          const caMgRatio = (soilAnalysis?.calcium / soilAnalysis?.magnesium).toFixed(1);
          whyText = `You specified a custom rate of ${limeKg} kg/acre. Your magnesium is low (${soilAnalysis?.magnesium} ppm) and Ca:Mg ratio is ${caMgRatio}:1. Dolomitic lime corrects both.`;
        }
      }
      const contentLines = [title, need, bagsText, costText, whyText, application, wait, business, yearly].filter(line => line && line.trim() !== '');
      const content = contentLines.join('\n');
      structuredList.push({ key: 'dolomitic_lime_grouped', params: { content, kg: limeKg, bags: bagsNeeded, total: formatCurrency(totalCost), perBag: formatCurrency(dolomiticPricePerBag), mg: soilAnalysis?.magnesium, caMgRatio: soilAnalysis?.calcium && soilAnalysis?.magnesium ? (soilAnalysis.calcium / soilAnalysis.magnesium).toFixed(1) : undefined } });
    }
  }

  // ========== GROUP 4: FERTILIZER PLAN HEADER ==========
  if (hasSoilTest && fertilizerPlan) {
    let title = '', farmSize = '', totalInv = '';
    if (isSwahili) {
      title = replacePlaceholders(SW.fertilizer_plan_title, { crop: crop.toUpperCase() });
      farmSize = replacePlaceholders(SW.fertilizer_plan_farm_size, { size: fertilizerPlan.farmSize });
      totalInv = replacePlaceholders(SW.fertilizer_plan_total_investment, { amount: formatCurrency(fertilizerPlan.totalCost) });
    } else if (isFrench) {
      title = replacePlaceholders(FR.fertilizer_plan_title, { crop: crop.toUpperCase() });
      farmSize = replacePlaceholders(FR.fertilizer_plan_farm_size, { size: fertilizerPlan.farmSize });
      totalInv = replacePlaceholders(FR.fertilizer_plan_total_investment, { amount: formatCurrency(fertilizerPlan.totalCost) });
    } else if (isSpanish) {
      title = replacePlaceholders(ES.fertilizer_plan_title, { crop: crop.toUpperCase() });
      farmSize = replacePlaceholders(ES.fertilizer_plan_farm_size, { size: fertilizerPlan.farmSize });
      totalInv = replacePlaceholders(ES.fertilizer_plan_total_investment, { amount: formatCurrency(fertilizerPlan.totalCost) });
    } else {
      title = `PRECISION FERTILIZER INVESTMENT PLAN for your ${crop.toUpperCase()} ENTERPRISE`;
      farmSize = `Your farm size: ${fertilizerPlan.farmSize} acre(s)`;
      totalInv = `TOTAL FERTILIZER INVESTMENT: ${formatCurrency(fertilizerPlan.totalCost)} for your entire farm`;
    }
    const content = [title, farmSize, totalInv].join('\n');
    structuredList.push({ key: 'fertilizer_header_grouped', params: { content, crop: crop.toUpperCase(), size: fertilizerPlan.farmSize, amount: formatCurrency(fertilizerPlan.totalCost) } });
  }

  // ========== GROUP 5: PLANTING FERTILIZER ==========
  if (hasSoilTest && fertilizerPlan && fertilizerPlan.plantingFertilizer) {
    const pf = fertilizerPlan.plantingFertilizer;
    if (pf && pf.kgNeeded > 0) {
      const bags = Math.floor(pf.kgNeeded / 50);
      const openBag = pf.kgNeeded % 50;
      let title, buyText, costText, providesText, extra;
      if (isSwahili) {
        title = SW.planting_fertilizer_title;
        buyText = replacePlaceholders(SW.planting_fertilizer_buy, { kg: pf.kgNeeded, name: pf.name });
        costText = replacePlaceholders(SW.planting_fertilizer_cost, { cost: formatCurrency(pf.cost) });
        providesText = replacePlaceholders(SW.planting_fertilizer_provides, { n: pf.n, p: pf.p, k: pf.k });
        extra = pf.extraNutrients ? replacePlaceholders(SW.planting_fertilizer_extra, { nutrients: pf.extraNutrients }) : '';
      } else if (isFrench) {
        title = FR.planting_fertilizer_title;
        buyText = replacePlaceholders(FR.planting_fertilizer_buy, { kg: pf.kgNeeded, name: pf.name });
        costText = replacePlaceholders(FR.planting_fertilizer_cost, { cost: formatCurrency(pf.cost) });
        providesText = replacePlaceholders(FR.planting_fertilizer_provides, { n: pf.n, p: pf.p, k: pf.k });
        extra = pf.extraNutrients ? replacePlaceholders(FR.planting_fertilizer_extra, { nutrients: pf.extraNutrients }) : '';
      } else if (isSpanish) {
        title = ES.planting_fertilizer_title;
        buyText = replacePlaceholders(ES.planting_fertilizer_buy, { kg: pf.kgNeeded, name: pf.name });
        costText = replacePlaceholders(ES.planting_fertilizer_cost, { cost: formatCurrency(pf.cost) });
        providesText = replacePlaceholders(ES.planting_fertilizer_provides, { n: pf.n, p: pf.p, k: pf.k });
        extra = pf.extraNutrients ? replacePlaceholders(ES.planting_fertilizer_extra, { nutrients: pf.extraNutrients }) : '';
      } else {
        title = "PLANTING FERTILIZER (Apply at planting)";
        buyText = `Buy ${pf.kgNeeded} kg of ${pf.name}`;
        costText = `Cost: ${formatCurrency(pf.cost)}`;
        providesText = `Provides: ${pf.n} kg N, ${pf.p} kg P, ${pf.k} kg K`;
        extra = pf.extraNutrients ? `Extra nutrients: ${pf.extraNutrients}` : '';
      }
      const bagInfo = isFrench ? `C'est ${bags} sac(s) de 50kg + ${openBag}kg ouvert` : (isSwahili ? `Hii ni magunia ${bags} ya 50kg + ${openBag}kg fungua` : `This is ${bags} bag(s) of 50kg + ${openBag}kg open`);
      const contentLines = [title, buyText, bagInfo, costText, providesText, extra].filter(l => l);
      structuredList.push({ key: 'planting_fertilizer', params: { content: contentLines.join('\n') } });
    }
  }

  // ========== GROUP 6: TOPDRESSING FERTILIZER ==========
  if (hasSoilTest && fertilizerPlan && fertilizerPlan.topdressingFertilizers && fertilizerPlan.topdressingFertilizers.length) {
    for (const tf of fertilizerPlan.topdressingFertilizers) {
      if (tf.kgNeeded > 0) {
        const bags = Math.floor(tf.kgNeeded / 50);
        const openBag = tf.kgNeeded % 50;
        let title, buyText, costText, providesText, extra;
        if (isSwahili) {
          title = SW.topdressing_fertilizer_title;
          buyText = replacePlaceholders(SW.topdressing_fertilizer_buy, { kg: tf.kgNeeded, name: tf.name });
          costText = replacePlaceholders(SW.topdressing_fertilizer_cost, { cost: formatCurrency(tf.cost) });
          providesText = replacePlaceholders(SW.topdressing_fertilizer_provides, { n: tf.n, p: tf.p, k: tf.k });
          extra = tf.extraNutrients ? replacePlaceholders(SW.topdressing_fertilizer_extra, { nutrients: tf.extraNutrients }) : '';
        } else if (isFrench) {
          title = FR.topdressing_fertilizer_title;
          buyText = replacePlaceholders(FR.topdressing_fertilizer_buy, { kg: tf.kgNeeded, name: tf.name });
          costText = replacePlaceholders(FR.topdressing_fertilizer_cost, { cost: formatCurrency(tf.cost) });
          providesText = replacePlaceholders(FR.topdressing_fertilizer_provides, { n: tf.n, p: tf.p, k: tf.k });
          extra = tf.extraNutrients ? replacePlaceholders(FR.topdressing_fertilizer_extra, { nutrients: tf.extraNutrients }) : '';
        } else if (isSpanish) {
          title = ES.topdressing_fertilizer_title;
          buyText = replacePlaceholders(ES.topdressing_fertilizer_buy, { kg: tf.kgNeeded, name: tf.name });
          costText = replacePlaceholders(ES.topdressing_fertilizer_cost, { cost: formatCurrency(tf.cost) });
          providesText = replacePlaceholders(ES.topdressing_fertilizer_provides, { n: tf.n, p: tf.p, k: tf.k });
          extra = tf.extraNutrients ? replacePlaceholders(ES.topdressing_fertilizer_extra, { nutrients: tf.extraNutrients }) : '';
        } else {
          title = "TOP DRESSING FERTILIZER (Apply 3-4 weeks after planting)";
          buyText = `Buy ${tf.kgNeeded} kg of ${tf.name}`;
          costText = `Cost: ${formatCurrency(tf.cost)}`;
          providesText = `Provides: ${tf.n} kg N, ${tf.p} kg P, ${tf.k} kg K`;
          extra = tf.extraNutrients ? `Extra nutrients: ${tf.extraNutrients}` : '';
        }
        const bagInfo = isFrench ? `C'est ${bags} sac(s) de 50kg + ${openBag}kg ouvert` : (isSwahili ? `Hii ni magunia ${bags} ya 50kg + ${openBag}kg fungua` : `This is ${bags} bag(s) of 50kg + ${openBag}kg open`);
        const contentLines = [title, buyText, bagInfo, costText, providesText, extra].filter(l => l);
        structuredList.push({ key: 'topdressing_fertilizer', params: { content: contentLines.join('\n') } });
      }
    }
  }

  // ========== GROUP 7: PLANT POPULATION ==========
  if (farmerData.spacing && fertilizerPlan && fertilizerPlan.farmSize) {
    let spacing = farmerData.spacing;
    let plantsPerAcre = 0;
    if (spacing.includes('x')) {
      const parts = spacing.split('x');
      const row = parseFloat(parts[0]);
      const plant = parseFloat(parts[1]);
      if (!isNaN(row) && !isNaN(plant)) {
        plantsPerAcre = Math.round(43560 / (row * plant));
      }
    }
    if (plantsPerAcre > 0) {
      let text = '';
      if (isSwahili) {
        text = `Kulingana na umbali wako ${spacing}, una takriban mimea ${plantsPerAcre} kwenye ekari ${fertilizerPlan.farmSize}.`;
      } else if (isFrench) {
        text = `Selon votre espacement ${spacing}, vous avez environ ${plantsPerAcre} plantes sur ${fertilizerPlan.farmSize} acres.`;
      } else if (isSpanish) {
        text = `Según su espaciamiento ${spacing}, tiene aproximadamente ${plantsPerAcre} plantas en ${fertilizerPlan.farmSize} acres.`;
      } else {
        text = `According to your spacing ${spacing}, you have approximately ${plantsPerAcre} plants on ${fertilizerPlan.farmSize} acres.`;
      }
      structuredList.push({ key: 'plant_population', params: { content: text, plants: plantsPerAcre, spacing } });
    }
  }

  // ========== GROUP 8: BUSINESS TIP ==========
  structuredList.push({
    key: 'fertilizer_business_tip',
    params: {
      symbol: currencySymbol,
      content: isSwahili ? `SHAURI YA BIASHARA: Nunua ukubwa unaolingana na mahitaji yako ili kuepuka upotevu. Kila ${currencySymbol} unayookoa ni ${currencySymbol} uliyopata!` : isFrench ? `CONSEIL COMMERCIAL : Achetez la taille adaptée à vos besoins pour éviter le gaspillage. Chaque ${currencySymbol} économisé est un ${currencySymbol} gagné !` : isSpanish ? `CONSEJO DE NEGOCIO: Compre tamaños que se ajusten a sus necesidades para evitar desperdicio. ¡Cada ${currencySymbol} ahorrado es ${currencySymbol} ganado!` : `BUSINESS TIP: Buy sizes that fit your needs to avoid waste. Every ${currencySymbol} saved is ${currencySymbol} earned!`
    }
  });

  // ========== GROUP 9: FERTILIZER REMEMBER ==========
  structuredList.push({
    key: 'fertilizer_remember',
    params: {
      crop: crop.toUpperCase(),
      content: isSwahili ? `KUMBUKA: Hii ni BIASHARA yako ya ${crop.toUpperCase()}. Kila pembejeo lazima iongeze faida yako!` : isFrench ? `RAPPELEZ-VOUS : C'est votre ENTREPRISE ${crop.toUpperCase()}. Chaque intrant doit augmenter votre profit !` : isSpanish ? `RECUERDE: Esta es su EMPRESA de ${crop.toUpperCase()}. ¡Cada insumo debe aumentar su ganancia!` : `REMEMBER: This is your ${crop.toUpperCase()} ENTERPRISE. Every input must increase your profit!`
    }
  });

  // ========== GROUP 10: GROSS MARGIN ANALYSIS ==========
  let actualYieldKg = farmerData.actualYieldKg || 0;
  let pricePerKg = farmerData.pricePerKg || 0;
  let actualCosts = farmerData.totalCosts || 0;
  if (!actualYieldKg || actualYieldKg === 0) {
    const defaultYields: Record<string, number> = { maize: 2000, beans: 1200, cassava: 8000, bananas: 20000 };
    actualYieldKg = defaultYields[lowerCrop] || 2000;
  }
  if (!pricePerKg || pricePerKg === 0) pricePerKg = 0.5;
  if (!actualCosts || actualCosts === 0) actualCosts = 50000;
  const lowYield = actualYieldKg * 0.33;
  const highYield = actualYieldKg * 1.26;
  const lowRevenue = lowYield * pricePerKg;
  const actualRevenue = actualYieldKg * pricePerKg;
  const highRevenue = highYield * pricePerKg;
  const lowMargin = lowRevenue - actualCosts * 0.5;
  const actualMargin = actualRevenue - actualCosts;
  const highMargin = highRevenue - actualCosts * 1.26;
  let grossMarginText = '';
  if (isSwahili) {
    grossMarginText = `MAPATO HALISI: Shamba lako linaleta ${formatCurrency(actualMargin)} kwa ekari. Kuongeza matumizi kwa 26% kunaweza kuongeza hadi ${formatCurrency(highMargin - actualMargin)} zaidi!`;
  } else if (isFrench) {
    grossMarginText = `MARGE BRUTE : Votre ferme génère ${formatCurrency(actualMargin)} par acre. Augmenter les intrants de 26% pourrait ajouter jusqu'à ${formatCurrency(highMargin - actualMargin)} de plus !`;
  } else if (isSpanish) {
    grossMarginText = `MARGEN BRUTO: Su granja genera ${formatCurrency(actualMargin)} por acre. ¡Aumentar los insumos en un 26% podría agregar hasta ${formatCurrency(highMargin - actualMargin)} más!`;
  } else {
    grossMarginText = `GROSS MARGIN: Your farm generates ${formatCurrency(actualMargin)} per acre. Increasing inputs by 26% could add up to ${formatCurrency(highMargin - actualMargin)} more!`;
  }
  structuredList.push({ key: 'gross_margin', params: { content: grossMarginText, actualMargin, potentialGain: highMargin - actualMargin } });

  // ========== GROUP 11: GOOD AGRICULTURAL PRACTICES ==========
  let gapText = '';
  if (isSwahili) {
    gapText = `MAZOEZI BORA YA KILIMO KWA ${crop.toUpperCase()}\nTumia mbegu bora, mbolea sahihi, na umwagiliaji mzuri.`;
  } else if (isFrench) {
    gapText = `BONNES PRATIQUES AGRICOLES POUR ${crop.toUpperCase()}\nUtilisez des semences de qualité, des engrais appropriés et une irrigation correcte.`;
  } else if (isSpanish) {
    gapText = `BUENAS PRÁCTICAS AGRÍCOLAS PARA ${crop.toUpperCase()}\nUtilice semillas de calidad, fertilizantes apropiados y riego adecuado.`;
  } else { // English
    if (lowerCrop === 'coffee') {
      gapText = `GOOD AGRICULTURAL PRACTICES FOR YOUR COFFEE ENTERPRISE
Use healthy coffee seedlings (disease-resistant varieties). Plant at the onset of rains, spacing 2.5m x 2.5m (1,300 trees/acre). Dig holes 60cm x 60cm x 60cm, apply 100g DAP at planting. Maintain 40-50% shade for the first years. Apply 20kg of manure per tree annually. Prune to maintain shape. Harvest ripe (red) cherries.

• Always read and follow the manufacturer's label – it's the law.
• Observe pre-harvest intervals: do not harvest within the specified days after the last pesticide application.
• Use the recommended fertilizer rate per acre – too much wastes money, too little reduces yield.
• Rinse empty containers three times, puncture them, and dispose of them in designated sites. Never reuse for food or water.
• Wear gloves, mask, long-sleeved shirt, and boots when handling agrochemicals.
• Calibrate your sprayer before each use to apply the exact rate per acre.
• Avoid spraying during strong wind or when bees are active (early morning or late evening).
• Store products in their original containers, under lock, away from children, food, and animal feed.
• Keep records of all inputs – date, product, rate, area treated – to track performance and meet export market requirements.
• Trace elements (lead, cadmium, copper) can contaminate crops – maintain soil health to avoid market rejection.
REMEMBER: Every practice you do well puts more money in your pocket.`;
    } else {
      gapText = `GOOD AGRICULTURAL PRACTICES FOR ${crop.toUpperCase()}\nUse quality seeds, proper fertilizers, and correct irrigation.\n\nREMEMBER: Every practice you do well puts more money in your pocket.`;
    }
  }
  structuredList.push({ key: 'good_practices', params: { content: gapText, crop: crop.toUpperCase() } });

  // ========== GROUP 12: DISEASE MANAGEMENT – with French post‑processing ==========
  if (farmerData.commonDiseases) {
    const diseaseLines: string[] = [];
    const diseaseTitle = replacePlaceholders(isSwahili ? (SW.disease_management_title as string) : isFrench ? (FR.disease_management_title as string) : isSpanish ? (ES.disease_management_title as string) : null, { crop: crop.toUpperCase() }) || (isSwahili ? `USIMAMIZI JUMUISHI WA MAGONJWA KWA BIASHARA YAKO YA ${crop.toUpperCase()}` : isFrench ? `GESTION INTÉGRÉE DES MALADIES POUR VOTRE ENTREPRISE ${crop.toUpperCase()}` : isSpanish ? `MANEJO INTEGRADO DE ENFERMEDADES PARA SU EMPRESA ${crop.toUpperCase()}` : `INTEGRATED DISEASE MANAGEMENT FOR YOUR ${crop.toUpperCase()} ENTERPRISE`);
    diseaseLines.push(diseaseTitle);
    const diseaseReported = replacePlaceholders(isSwahili ? (SW.disease_reported as string) : isFrench ? (FR.disease_reported as string) : isSpanish ? (ES.disease_reported as string) : null, { diseases: farmerData.commonDiseases }) || (isSwahili ? `Magonjwa uliyoripoti: ${farmerData.commonDiseases}` : isFrench ? `Maladies signalées : ${farmerData.commonDiseases}` : isSpanish ? `Enfermedades reportadas: ${farmerData.commonDiseases}` : `The diseases affecting your ${crop.toUpperCase()} ENTERPRISE: ${farmerData.commonDiseases}`);
    diseaseLines.push(diseaseReported);
    const diseaseList = farmerData.commonDiseases.split(',').map(d => d.trim()).filter(d => d);
    diseaseList.forEach(disease => { diseaseLines.push(`• ${disease}`); });
    diseaseLines.push('');
    diseaseLines.push(isSwahili ? (SW.disease_prevention_title || "KUZUIA (Rahisi kuliko kutibu)") : isFrench ? (FR.disease_prevention_title || "PRÉVENTION (Moins cher que guérir)") : isSpanish ? (ES.disease_prevention_title || "PREVENCIÓN (Más barato que curar)") : 'PREVENTION (Cheaper than cure)');
    diseaseLines.push(isSwahili ? (SW.disease_prevention_list || "• Tumia aina zinazostahimili magonjwa\n• Zoea mzunguko wa mazao (miaka 3-4)\n• Hakikisha nafasi sahihi kwa mzunguko wa hewa\n• Epuka kufanya kazi kwenye mashamba yenye unyevu\n• Ondoa na uharibu mimea iliyoathirika mara moja\n• Sababisha zana kati ya mashamba") : isFrench ? (FR.disease_prevention_list || "• Utilisez des variétés résistantes\n• Pratiquez la rotation des cultures (3-4 ans)\n• Assurez un espacement adéquat\n• Évitez de travailler dans des champs humides\n• Retirez et détruisez les plantes infectées\n• Désinfectez les outils") : isSpanish ? (ES.disease_prevention_list || "• Use variedades resistentes\n• Practique la rotación de cultivos (3-4 años)\n• Asegure un espacemiento adecuado\n• Evite trabajar en campos húmedos\n• Retire y destruya plantas infectadas\n• Desinfecte herramientas") : '• Use disease-resistant varieties where available\n• Practice crop rotation (3-4 years)\n• Ensure proper spacing for air circulation\n• Avoid working in wet fields\n• Remove and destroy infected plants immediately\n• Disinfect tools between fields');
    diseaseLines.push('');
    diseaseLines.push(isSwahili ? (SW.disease_control_title || "CHAGUO ZA UDHIBITI WA MAGONJWA SHAMBANI MWAKO:") : isFrench ? (FR.disease_control_title || "OPTIONS DE LUTTE CONTRE LES MALADIES DANS VOTRE FERME :") : isSpanish ? (ES.disease_control_title || "OPCIONES DE CONTROL DE ENFERMEDADES EN SU FINCA:") : 'CONTROL OPTIONS FOR DISEASES IN YOUR FARM:');

    const cropLookupKey = lowerCrop.replace(/\s+/g, '');
    const cropPestsAndDiseases = cropPestDiseaseMap[cropLookupKey] || cropPestDiseaseMap[lowerCrop] || [];
    const cropDiseases = cropPestsAndDiseases.filter((pd: PestDisease) => pd.type === "disease");
    const userDiseases = farmerData.commonDiseases.split(',').map(d => d.trim().toLowerCase());
    const filteredDiseases = userDiseases.length > 0 ? cropDiseases.filter(disease => userDiseases.some(userDisease => disease.name.toLowerCase().includes(userDisease))) : cropDiseases;

    if (filteredDiseases.length > 0) {
      for (const disease of filteredDiseases) {
        diseaseLines.push('');
        diseaseLines.push(`📌 ${disease.name.toUpperCase()}`);
        if (disease.culturalControls && disease.culturalControls.length) {
          diseaseLines.push(isSwahili ? "Udhibiti wa kitamaduni:" : isFrench ? "Lutte cultural :" : isSpanish ? "Control cultural:" : "Cultural Control:");
          for (const control of disease.culturalControls) {
            diseaseLines.push(`  • ${control}`);
          }
        }
        if (disease.organicControls && disease.organicControls.length) {
          diseaseLines.push(isSwahili ? "Udhibiti wa kikaboni:" : isFrench ? "Lutte biologique :" : isSpanish ? "Control orgánico:" : "Organic Control:");
          for (const organic of disease.organicControls) {
            let method = organic.method;
            let prep = organic.preparation;
            let app = organic.application;
            if (isFrench) {
              method = translateOrganic(method, 'fr');
              prep = translateRate(prep, 'fr');
              app = translateTiming(app, 'fr');
            } else if (isSwahili) {
              method = translateOrganic(method, 'sw');
              prep = translateRate(prep, 'sw');
              app = translateTiming(app, 'sw');
            } else if (isSpanish) {
              method = translateOrganic(method, 'es');
              prep = translateRate(prep, 'es');
              app = translateTiming(app, 'es');
            } else {
              method = translateOrganic(method, 'en');
              prep = translateRate(prep, 'en');
              app = translateTiming(app, 'en');
            }
            diseaseLines.push(`  • ${method}`);
            if (isFrench) {
              diseaseLines.push(`    Préparation: ${prep}`);
              diseaseLines.push(`    Application: ${app}`);
            } else if (isSwahili) {
              diseaseLines.push(`    Maandalizi: ${prep}`);
              diseaseLines.push(`    Utumiaji: ${app}`);
            } else if (isSpanish) {
              diseaseLines.push(`    Preparación: ${prep}`);
              diseaseLines.push(`    Aplicación: ${app}`);
            } else {
              diseaseLines.push(`    Preparation: ${prep}`);
              diseaseLines.push(`    Application: ${app}`);
            }
          }
        }
        if (disease.chemicalControls && disease.chemicalControls.length) {
          diseaseLines.push(isSwahili ? "Udhibiti wa kemikali:" : isFrench ? "Lutte chimique :" : isSpanish ? "Control químico:" : "Chemical Control:");
          for (const chem of disease.chemicalControls) {
            let rate = chem.rate;
            let timing = chem.timing;
            let safety = chem.safetyInterval || '';
            if (isFrench) {
              rate = translateRate(rate, 'fr');
              timing = translateTiming(timing, 'fr');
              safety = translateSafety(safety, 'fr');
            } else if (isSwahili) {
              rate = translateRate(rate, 'sw');
              timing = translateTiming(timing, 'sw');
              safety = translateSafety(safety, 'sw');
            } else if (isSpanish) {
              rate = translateRate(rate, 'es');
              timing = translateTiming(timing, 'es');
              safety = translateSafety(safety, 'es');
            } else {
              rate = translateRate(rate, 'en');
              timing = translateTiming(timing, 'en');
              safety = translateSafety(safety, 'en');
            }
            diseaseLines.push(`  • ${chem.productName} (${chem.activeIngredient})`);
            if (isFrench) {
              diseaseLines.push(`    Dose: ${rate}`);
              diseaseLines.push(`    Dose par acre: ${chem.ratePerAcre}`);
              diseaseLines.push(`    Moment: ${timing}`);
              if (safety) diseaseLines.push(`    Sécurité: ${safety}`);
              const statusText = translateStatus(chem.status === 'restricted' ? '⚠️ RESTRICTED' : chem.status === 'banned' ? '❌ BANNED' : '✅ Active', 'fr');
              diseaseLines.push(`    Statut: ${statusText}`);
            } else if (isSwahili) {
              diseaseLines.push(`    Kipimo: ${rate}`);
              diseaseLines.push(`    Kipimo kwa ekari: ${chem.ratePerAcre}`);
              diseaseLines.push(`    Wakati: ${timing}`);
              if (safety) diseaseLines.push(`    Usalama: ${safety}`);
              const statusText = translateStatus(chem.status === 'restricted' ? '⚠️ RESTRICTED' : chem.status === 'banned' ? '❌ BANNED' : '✅ Active', 'sw');
              diseaseLines.push(`    Hali: ${statusText}`);
            } else if (isSpanish) {
              diseaseLines.push(`    Dosis: ${rate}`);
              diseaseLines.push(`    Dosis por acre: ${chem.ratePerAcre}`);
              diseaseLines.push(`    Momento: ${timing}`);
              if (safety) diseaseLines.push(`    Seguridad: ${safety}`);
              const statusText = translateStatus(chem.status === 'restricted' ? '⚠️ RESTRICTED' : chem.status === 'banned' ? '❌ BANNED' : '✅ Active', 'es');
              diseaseLines.push(`    Estado: ${statusText}`);
            } else {
              diseaseLines.push(`    Dose: ${rate}`);
              diseaseLines.push(`    Dose per acre: ${chem.ratePerAcre}`);
              diseaseLines.push(`    Timing: ${timing}`);
              if (safety) diseaseLines.push(`    Safety: ${safety}`);
              const statusText = translateStatus(chem.status === 'restricted' ? '⚠️ RESTRICTED' : chem.status === 'banned' ? '❌ BANNED' : '✅ Active', 'en');
              diseaseLines.push(`    Status: ${statusText}`);
            }
          }
        }
        if (disease.businessNote) {
          let note = disease.businessNote;
          if (isFrench && disease.name === "Sigatoka (black leaf streak)") note = "La Sigatoka réduit la qualité et la taille des fruits. Enlevez les feuilles infectées régulièrement – c'est GRATUIT !";
          diseaseLines.push(`  💼 ${note}`);
        }
      }
    }
    diseaseLines.push('');
    diseaseLines.push(isSwahili ? (SW.disease_business_case_title || "HALI YA BIASHARA") : isFrench ? (FR.disease_business_case_title || "CAS COMMERCIAL") : isSpanish ? (ES.disease_business_case_title || "CASO DE NEGOCIO") : 'BUSINESS CASE');
    diseaseLines.push(isSwahili ? `Bila udhibiti: Uwezekano wa hasara ya mavuno ya 30-100%\nKwa kuzuia: Gharama ${formatCurrency(2000)}-${formatCurrency(5000)}/ekari = OKOA ${formatCurrency(100000)}+!\nKila ${currencySymbol}1 inayotumika kuzuia magonjwa inarudisha ${currencySymbol}20-50 katika mavuno yaliyookolewa` : isFrench ? `Sans contrôle : Pertes de rendement possibles de 30 à 100 %\nAvec prévention : Coût ${formatCurrency(2000)}-${formatCurrency(5000)}/acre = ÉCONOMISEZ ${formatCurrency(100000)}+ !\nChaque ${currencySymbol}1 dépensé en prévention des maladies rapporte ${currencySymbol}20-50 en rendement économisé` : isSpanish ? `Sin control: Pérdidas de rendimiento del 30-100% posibles\nCon prevención: Costo ${formatCurrency(2000)}-${formatCurrency(5000)}/acre = ¡AHORRE ${formatCurrency(100000)}+!\nCada ${currencySymbol}1 gastado en prevención de enfermedades retorna ${currencySymbol}20-50 en rendimiento salvado` : `Without control: Yield losses of 30-100% possible\nWith prevention: Cost ${formatCurrency(2000)}-${formatCurrency(5000)}/acre = SAVE ${formatCurrency(100000)}+!\nEvery ${currencySymbol}1 spent on disease prevention returns ${currencySymbol}20-50 in saved yield`);

    // French‑only post‑processing to replace Spanish labels with French
    if (isFrench) {
      let content = diseaseLines.join('\n');
      content = content.replace(/Preparación:/g, 'Préparation:')
                       .replace(/Aplicación:/g, 'Application:')
                       .replace(/Dosis:/g, 'Dose:')
                       .replace(/Momento:/g, 'Moment:')
                       .replace(/Seguridad:/g, 'Sécurité:')
                       .replace(/Estado:/g, 'Statut:')
                       .replace(/Dosis por acre:/g, 'Dose par acre:')
                       .replace(/Costo:/g, 'Coût:')
                       .replace(/Ahorre/g, 'Économisez')
                       .replace(/Pérdida/g, 'Perte');
      diseaseLines = content.split('\n');
    }

    structuredList.push({ key: 'disease_management_grouped', params: { content: diseaseLines.join('\n'), crop: crop.toUpperCase(), diseases: farmerData.commonDiseases, low: formatCurrency(2000), high: formatCurrency(5000), saved: formatCurrency(100000), symbol: currencySymbol } });
  }

  // ========== GROUP 13: PEST MANAGEMENT – with French post‑processing ==========
  if (farmerData.commonPests) {
    const pestLines: string[] = [];
    const pestTitle = replacePlaceholders(isSwahili ? (SW.pest_management_title as string) : isFrench ? (FR.pest_management_title as string) : isSpanish ? (ES.pest_management_title as string) : null, { crop: crop.toUpperCase() }) || (isSwahili ? `USIMAMIZI JUMUISHI WA WADUDU (IPM) KWA BIASHARA YAKO YA ${crop.toUpperCase()}` : isFrench ? `GESTION INTÉGRÉE DES RAVAGEURS (IPM) POUR VOTRE ENTREPRISE ${crop.toUpperCase()}` : isSpanish ? `MANEJO INTEGRADO DE PLAGAS (MIP) PARA SU EMPRESA ${crop.toUpperCase()}` : `INTEGRATED PEST MANAGEMENT (IPM) FOR YOUR ${crop.toUpperCase()} ENTERPRISE`);
    pestLines.push(pestTitle);
    const pestReported = replacePlaceholders(isSwahili ? (SW.pest_reported as string) : isFrench ? (FR.pest_reported as string) : isSpanish ? (ES.pest_reported as string) : null, { pests: farmerData.commonPests }) || (isSwahili ? `Wadudu ulioripoti: ${farmerData.commonPests}` : isFrench ? `Ravageurs signalés : ${farmerData.commonPests}` : isSpanish ? `Plagas reportadas: ${farmerData.commonPests}` : `The pests affecting your ${crop.toUpperCase()} ENTERPRISE: ${farmerData.commonPests}`);
    pestLines.push(pestReported);
    const pestList = farmerData.commonPests.split(',').map(p => p.trim()).filter(p => p);
    pestList.forEach(pest => { pestLines.push(`• ${pest}`); });
    pestLines.push('');
    pestLines.push(isSwahili ? (SW.pest_prevention_title || "KUZUIA (Rahisi kuliko kutibu)") : isFrench ? (FR.pest_prevention_title || "PRÉVENTION (Moins cher que guérir)") : isSpanish ? (ES.pest_prevention_title || "PREVENCIÓN (Más barato que curar)") : 'PREVENTION (Cheaper than cure)');
    pestLines.push(isSwahili ? (SW.pest_prevention_list || "• Zoea mzunguko wa mazao\n• Tumia aina zinazostahimili\n• Angalia mashamba kila wiki\n• Hifadhi maadui wa asili\n• Ondoa na uharibu mimea iliyoathirika") : isFrench ? (FR.pest_prevention_list || "• Pratiquez la rotation des cultures\n• Utilisez des variétés résistantes\n• Surveillez les champs chaque semaine\n• Conservez les ennemis naturels\n• Retirez et détruisez les plantes infectées") : isSpanish ? (ES.pest_prevention_list || "• Practique la rotación de cultivos\n• Use variedades resistentes\n• Monitoree los campos semanalmente\n• Conserve enemigos naturales\n• Retire y destruya plantas infectadas") : '• Practice crop rotation\n• Use resistant varieties\n• Monitor fields weekly\n• Conserve natural enemies\n• Remove and destroy infected plants');
    pestLines.push('');

    const cropLookupKey = lowerCrop.replace(/\s+/g, '');
    const cropPestsAndDiseases = cropPestDiseaseMap[cropLookupKey] || cropPestDiseaseMap[lowerCrop] || [];
    const cropPests = cropPestsAndDiseases.filter((pd: PestDisease) => pd.type === "pest");
    const userPests = farmerData.commonPests.split(',').map(p => p.trim().toLowerCase());
    const filteredPests = userPests.length > 0 ? cropPests.filter(pest => userPests.some(userPest => pest.name.toLowerCase().includes(userPest))) : cropPests;

    if (filteredPests.length > 0) {
      pestLines.push(isSwahili ? "CHAGUO ZA UDHIBITI:" : isFrench ? "OPTIONS DE LUTTE :" : isSpanish ? "OPCIONES DE CONTROL:" : "CONTROL OPTIONS FOR PESTS IN YOUR FARM:");
      for (const pest of filteredPests) {
        pestLines.push('');
        pestLines.push(`🐛 ${pest.name.toUpperCase()}`);
        if (pest.culturalControls && pest.culturalControls.length) {
          pestLines.push(isSwahili ? "Udhibiti wa kitamaduni:" : isFrench ? "Lutte cultural :" : isSpanish ? "Control cultural:" : "Cultural Control:");
          for (const control of pest.culturalControls) {
            pestLines.push(`  • ${control}`);
          }
        }
        if (pest.organicControls && pest.organicControls.length) {
          pestLines.push(isSwahili ? "Udhibiti wa kikaboni:" : isFrench ? "Lutte biologique :" : isSpanish ? "Control orgánico:" : "Organic Control:");
          for (const organic of pest.organicControls) {
            let method = organic.method;
            let prep = organic.preparation;
            let app = organic.application;
            if (isFrench) {
              method = translateOrganic(method, 'fr');
              prep = translateRate(prep, 'fr');
              app = translateTiming(app, 'fr');
            } else if (isSwahili) {
              method = translateOrganic(method, 'sw');
              prep = translateRate(prep, 'sw');
              app = translateTiming(app, 'sw');
            } else if (isSpanish) {
              method = translateOrganic(method, 'es');
              prep = translateRate(prep, 'es');
              app = translateTiming(app, 'es');
            } else {
              method = translateOrganic(method, 'en');
              prep = translateRate(prep, 'en');
              app = translateTiming(app, 'en');
            }
            pestLines.push(`  • ${method}`);
            if (isFrench) {
              pestLines.push(`    Préparation: ${prep}`);
              pestLines.push(`    Application: ${app}`);
            } else if (isSwahili) {
              pestLines.push(`    Maandalizi: ${prep}`);
              pestLines.push(`    Utumiaji: ${app}`);
            } else if (isSpanish) {
              pestLines.push(`    Preparación: ${prep}`);
              pestLines.push(`    Aplicación: ${app}`);
            } else {
              pestLines.push(`    Preparation: ${prep}`);
              pestLines.push(`    Application: ${app}`);
            }
          }
        }
        if (pest.chemicalControls && pest.chemicalControls.length) {
          pestLines.push(isSwahili ? "Udhibiti wa kemikali:" : isFrench ? "Lutte chimique :" : isSpanish ? "Control químico:" : "Chemical Control:");
          for (const chem of pest.chemicalControls) {
            let rate = chem.rate;
            let timing = chem.timing;
            let safety = chem.safetyInterval || '';
            if (isFrench) {
              rate = translateRate(rate, 'fr');
              timing = translateTiming(timing, 'fr');
              safety = translateSafety(safety, 'fr');
            } else if (isSwahili) {
              rate = translateRate(rate, 'sw');
              timing = translateTiming(timing, 'sw');
              safety = translateSafety(safety, 'sw');
            } else if (isSpanish) {
              rate = translateRate(rate, 'es');
              timing = translateTiming(timing, 'es');
              safety = translateSafety(safety, 'es');
            } else {
              rate = translateRate(rate, 'en');
              timing = translateTiming(timing, 'en');
              safety = translateSafety(safety, 'en');
            }
            pestLines.push(`  • ${chem.productName} (${chem.activeIngredient})`);
            if (isFrench) {
              pestLines.push(`    Dose: ${rate}`);
              pestLines.push(`    Dose par acre: ${chem.ratePerAcre}`);
              pestLines.push(`    Moment: ${timing}`);
              if (safety) pestLines.push(`    Sécurité: ${safety}`);
              const statusText = translateStatus(chem.status === 'restricted' ? '⚠️ RESTRICTED' : chem.status === 'banned' ? '❌ BANNED' : '✅ Active', 'fr');
              pestLines.push(`    Statut: ${statusText}`);
            } else if (isSwahili) {
              pestLines.push(`    Kipimo: ${rate}`);
              pestLines.push(`    Kipimo kwa ekari: ${chem.ratePerAcre}`);
              pestLines.push(`    Wakati: ${timing}`);
              if (safety) pestLines.push(`    Usalama: ${safety}`);
              const statusText = translateStatus(chem.status === 'restricted' ? '⚠️ RESTRICTED' : chem.status === 'banned' ? '❌ BANNED' : '✅ Active', 'sw');
              pestLines.push(`    Hali: ${statusText}`);
            } else if (isSpanish) {
              pestLines.push(`    Dosis: ${rate}`);
              pestLines.push(`    Dosis por acre: ${chem.ratePerAcre}`);
              pestLines.push(`    Momento: ${timing}`);
              if (safety) pestLines.push(`    Seguridad: ${safety}`);
              const statusText = translateStatus(chem.status === 'restricted' ? '⚠️ RESTRICTED' : chem.status === 'banned' ? '❌ BANNED' : '✅ Active', 'es');
              pestLines.push(`    Estado: ${statusText}`);
            } else {
              pestLines.push(`    Dose: ${rate}`);
              pestLines.push(`    Dose per acre: ${chem.ratePerAcre}`);
              pestLines.push(`    Timing: ${timing}`);
              if (safety) pestLines.push(`    Safety: ${safety}`);
              const statusText = translateStatus(chem.status === 'restricted' ? '⚠️ RESTRICTED' : chem.status === 'banned' ? '❌ BANNED' : '✅ Active', 'en');
              pestLines.push(`    Status: ${statusText}`);
            }
          }
        }
        if (pest.businessNote) {
          let note = pest.businessNote;
          if (isFrench && pest.name === "Banana aphids (Pentalonia nigronervosa)") note = "Les pucerons transmettent le virus du bunchy top du bananier. Luttez tôt pour éviter la propagation du virus.";
          pestLines.push(`  💼 ${note}`);
        }
      }
    }
    pestLines.push('');
    pestLines.push(isSwahili ? (SW.pest_business_calc_title || "HESABU YA BIASHARA") : isFrench ? (FR.pest_business_calc_title || "CALCUL COMMERCIAL") : isSpanish ? (ES.pest_business_calc_title || "CÁLCULO DE NEGOCIO") : 'BUSINESS CALCULATION');
    pestLines.push(isSwahili ? `Bila udhibiti: Hasara 40-60% ya mavuno = hasara ${formatCurrency(80000)}-${formatCurrency(120000)}/ekari\nKwa IPM: Gharama ${formatCurrency(1500)}-${formatCurrency(3000)} = OKOA ${formatCurrency(100000)}+ faida\nKila ${currencySymbol}1 inayotumika kudhibiti wadudu inarudisha ${currencySymbol}30-40 katika mavuno yaliyookolewa` : isFrench ? `Sans contrôle : Perte de rendement de 40 à 60 % = perte de ${formatCurrency(80000)}-${formatCurrency(120000)}/acre\nAvec IPM : Coût ${formatCurrency(1500)}-${formatCurrency(3000)} = ÉCONOMISEZ ${formatCurrency(100000)}+ de profit\nChaque ${currencySymbol}1 dépensé en lutte antiparasitaire rapporte ${currencySymbol}30-40 en rendement économisé` : isSpanish ? `Sin control: Pérdida del 40-60% del rendimiento = pérdida de ${formatCurrency(80000)}-${formatCurrency(120000)}/acre\nCon MIP: Costo ${formatCurrency(1500)}-${formatCurrency(3000)} = ¡AHORRE ${formatCurrency(100000)}+ de ganancia\nCada ${currencySymbol}1 gastado en control de plagas retorna ${currencySymbol}30-40 en rendimiento salvado` : `Without control: Loss 40-60% yield = ${formatCurrency(80000)}-${formatCurrency(120000)} loss/acre\nWith IPM: Cost ${formatCurrency(1500)}-${formatCurrency(3000)} = SAVE ${formatCurrency(100000)}+ profit\nEvery ${currencySymbol}1 spent on pest control returns ${currencySymbol}30-40 in saved yield`);

    // French‑only post‑processing
    if (isFrench) {
      let content = pestLines.join('\n');
      content = content.replace(/Preparación:/g, 'Préparation:')
                       .replace(/Aplicación:/g, 'Application:')
                       .replace(/Dosis:/g, 'Dose:')
                       .replace(/Momento:/g, 'Moment:')
                       .replace(/Seguridad:/g, 'Sécurité:')
                       .replace(/Estado:/g, 'Statut:')
                       .replace(/Dosis por acre:/g, 'Dose par acre:')
                       .replace(/Costo:/g, 'Coût:')
                       .replace(/Ahorre/g, 'Économisez')
                       .replace(/Pérdida/g, 'Perte');
      pestLines = content.split('\n');
    }

    structuredList.push({ key: 'pest_management_grouped', params: { content: pestLines.join('\n'), crop: crop.toUpperCase(), pests: farmerData.commonPests, lowLoss: formatCurrency(80000), highLoss: formatCurrency(120000), lowCost: formatCurrency(1500), highCost: formatCurrency(3000), saved: formatCurrency(100000), symbol: currencySymbol } });
  }

  // ========== GROUP 14: NUTRIENT DEFICIENCY – French translation only when isFrench ==========
  if (farmerData.deficiencySymptoms && farmerData.deficiencySymptoms.trim() !== '') {
    let symptoms = farmerData.deficiencySymptoms;
    let location = farmerData.deficiencyLocation || 'not specified';
    if (isFrench) {
      symptoms = translateDeficiencyFr(symptoms);
      location = translateDeficiencyFr(location);
    }
    const deficiencies = getDeficienciesForCrop(crop, farmerData.deficiencySymptoms, farmerData.deficiencyLocation);
    const deficiencyLines: string[] = [];
    if (deficiencies.length > 0) {
      if (isSwahili) {
        deficiencyLines.push(`UCHAMBUZI WA UPUNGUFU WA VIRUTUBISHO KWA BIASHARA YAKO YA ${crop.toUpperCase()}`);
        deficiencyLines.push(`Dalili zilizoripotiwa: ${symptoms}`);
        deficiencyLines.push(`Mahali dalili zinapojitokeza: ${location}`);
        deficiencyLines.push('');
        deficiencyLines.push("Uwezekano wa upungufu:");
        deficiencies.forEach(def => {
          deficiencyLines.push(`• ${def.nutrient} (${def.nutrientSymbol}) – ${def.description}`);
          deficiencyLines.push(`  Rekebisha kwa: ${def.correction.fertilizer.join(', ')} (${def.correction.rate}) – ${def.correction.application}`);
          if (def.correction.organic && def.correction.organic.length > 0) deficiencyLines.push(`  Njia za kikaboni: ${def.correction.organic.join(', ')}`);
          if (def.visualCues.length) deficiencyLines.push(`  Dalili: ${def.visualCues[0]}`);
        });
        deficiencyLines.push('');
        deficiencyLines.push("TAARIFA YA BIASHARA: Kugundua mapema kunaokoa mavuno na faida!");
      } else if (isFrench) {
        deficiencyLines.push(`ANALYSE DES CARENCES NUTRITIONNELLES POUR VOTRE ENTREPRISE ${crop.toUpperCase()}`);
        deficiencyLines.push(`Symptômes signalés : ${symptoms}`);
        deficiencyLines.push(`Emplacement des symptômes : ${location}`);
        deficiencyLines.push('');
        deficiencyLines.push("Carences possibles :");
        deficiencies.forEach(def => {
          deficiencyLines.push(`• ${def.nutrient} (${def.nutrientSymbol}) – ${def.description}`);
          deficiencyLines.push(`  Correction : ${def.correction.fertilizer.join(', ')} (${def.correction.rate}) – ${def.correction.application}`);
          if (def.correction.organic && def.correction.organic.length > 0) deficiencyLines.push(`  Biologique : ${def.correction.organic.join(', ')}`);
          if (def.visualCues.length) deficiencyLines.push(`  Symptômes visuels : ${def.visualCues[0]}`);
        });
        deficiencyLines.push('');
        deficiencyLines.push("CONSEIL COMMERCIAL : La détection précoce permet d'économiser le rendement et le profit !");
      } else if (isSpanish) {
        deficiencyLines.push(`ANÁLISIS DE DEFICIENCIA DE NUTRIENTES PARA SU EMPRESA ${crop.toUpperCase()}`);
        deficiencyLines.push(`Síntomas reportados: ${symptoms}`);
        deficiencyLines.push(`Ubicación de los síntomas: ${location}`);
        deficiencyLines.push('');
        deficiencyLines.push("Posibles deficiencias:");
        deficiencies.forEach(def => {
          deficiencyLines.push(`• ${def.nutrient} (${def.nutrientSymbol}) – ${def.description}`);
          deficiencyLines.push(`  Corrección: ${def.correction.fertilizer.join(', ')} (${def.correction.rate}) – ${def.correction.application}`);
          if (def.correction.organic && def.correction.organic.length > 0) deficiencyLines.push(`  Opciones orgánicas: ${def.correction.organic.join(', ')}`);
          if (def.visualCues.length) deficiencyLines.push(`  Síntoma visual: ${def.visualCues[0]}`);
        });
        deficiencyLines.push('');
        deficiencyLines.push("CONSEJO COMERCIAL: ¡La detección temprana ahorra rendimiento y ganancia!");
      } else {
        deficiencyLines.push(`NUTRIENT DEFICIENCY ANALYSIS FOR YOUR ${crop.toUpperCase()} ENTERPRISE`);
        deficiencyLines.push(`Symptoms reported: ${symptoms}`);
        deficiencyLines.push(`Location: ${location}`);
        deficiencyLines.push('');
        deficiencyLines.push('Possible deficiencies:');
        deficiencies.forEach(def => {
          deficiencyLines.push(`• ${def.nutrient} (${def.nutrientSymbol}) – ${def.description}`);
          deficiencyLines.push(`  Correction: ${def.correction.fertilizer.join(', ')} (${def.correction.rate}) – ${def.correction.application}`);
          if (def.correction.organic && def.correction.organic.length > 0) deficiencyLines.push(`  Organic: ${def.correction.organic.join(', ')}`);
          if (def.visualCues.length) deficiencyLines.push(`  Visual cue: ${def.visualCues[0]}`);
        });
        deficiencyLines.push('');
        deficiencyLines.push('BUSINESS TIP: Early detection saves yield and profit!');
      }
    } else {
      if (isSwahili) {
        deficiencyLines.push(`UCHAMBUZI WA UPUNGUFU WA VIRUTUBISHO KWA BIASHARA YAKO YA ${crop.toUpperCase()}`);
        deficiencyLines.push(`Dalili zilizoripotiwa: ${symptoms}`);
        deficiencyLines.push(`Mahali dalili zinapojitokeza: ${location}`);
        deficiencyLines.push('');
        deficiencyLines.push('Hakuna upungufu maalum ulioainishwa kwa zao hili. Tunapendekeza uchambuzi wa udongo kwa usahihi zaidi.');
        deficiencyLines.push('');
        deficiencyLines.push("TAARIFA YA BIASHARA: Kugundua mapema kunaokoa mavuno na faida!");
      } else if (isFrench) {
        deficiencyLines.push(`ANALYSE DES CARENCES NUTRITIONNELLES POUR VOTRE ENTREPRISE ${crop.toUpperCase()}`);
        deficiencyLines.push(`Symptômes signalés : ${symptoms}`);
        deficiencyLines.push(`Emplacement des symptômes : ${location}`);
        deficiencyLines.push('');
        deficiencyLines.push('Aucune carence spécifique n\'est définie pour cette culture. Nous recommandons une analyse de sol pour plus de précision.');
        deficiencyLines.push('');
        deficiencyLines.push("CONSEIL COMMERCIAL : La détection précoce permet d'économiser le rendement et le profit !");
      } else if (isSpanish) {
        deficiencyLines.push(`ANÁLISIS DE DEFICIENCIA DE NUTRIENTES PARA SU EMPRESA ${crop.toUpperCase()}`);
        deficiencyLines.push(`Síntomas reportados: ${symptoms}`);
        deficiencyLines.push(`Ubicación de los síntomas: ${location}`);
        deficiencyLines.push('');
        deficiencyLines.push('No se definen deficiencias específicas para este cultivo. Se recomienda un análisis de suelo para un diagnóstico preciso.');
        deficiencyLines.push('');
        deficiencyLines.push("CONSEJO COMERCIAL: ¡La detección temprana ahorra rendimiento y ganancia!");
      } else {
        deficiencyLines.push(`NUTRIENT DEFICIENCY ANALYSIS FOR YOUR ${crop.toUpperCase()} ENTERPRISE`);
        deficiencyLines.push(`Symptoms reported: ${symptoms}`);
        deficiencyLines.push(`Location: ${location}`);
        deficiencyLines.push('');
        deficiencyLines.push('No specific deficiencies defined for this crop. A soil test is recommended for accurate diagnosis.');
        deficiencyLines.push('');
        deficiencyLines.push('BUSINESS TIP: Early detection saves yield and profit!');
      }
    }
    structuredList.push({ key: 'deficiency_analysis', params: { content: deficiencyLines.join('\n'), symptoms, location, crop: crop.toUpperCase() } });
  }

  // ========== GROUP 15: PLANT DAMAGE REPORT ==========
  if (farmerData.plantsDamaged && farmerData.plantsDamaged > 0) {
    let damageText = '';
    if (isFrench) {
      damageText = `RAPPORT DE DÉGÂTS POUR VOTRE ENTREPRISE ${crop.toUpperCase()}\nVous avez signalé ${farmerData.plantsDamaged} plantes endommagées au-delà de tout rétablissement.\nEnvisagez de revoir vos stratégies de lutte contre les ravageurs et les maladies pour éviter de futures pertes.\nPour des conseils personnalisés sur la réduction des dégâts aux plantes, interrogez notre système Q&A sur la lutte antiparasitaire ou la prévention des maladies.`;
    } else if (isSwahili) {
      damageText = `RIPOTI YA UHARIBIFU KWA BIASHARA YAKO YA ${crop.toUpperCase()}\nUmeripoti mimea ${farmerData.plantsDamaged} iliyoharibiwa zaidi ya kurejeshwa.\nFikiria kukagua mikakati yako ya udhibiti wa wadudu na magonjwa ili kuzuia hasara za baadaye.\nKwa ushauri wa kibinafsi juu ya kupunguza uharibifu wa mimea, uliza mfumo wetu wa Maswali na Majibu kuhusu udhibiti wa wadudu au kuzuia magonjwa.`;
    } else if (isSpanish) {
      damageText = `INFORME DE DAÑOS PARA SU EMPRESA ${crop.toUpperCase()}\nReportó ${farmerData.plantsDamaged} plantas dañadas más allá de toda recuperación.\nConsidere revisar sus estrategias de manejo de plagas y enfermedades para evitar pérdidas futuras.\nPara consejos personalizados sobre cómo reducir el daño a las plantas, consulte nuestro sistema de P&R sobre control de plagas o prevención de enfermedades.`;
    } else {
      damageText = `DAMAGE REPORT FOR YOUR ${crop.toUpperCase()} ENTERPRISE\nYou reported ${farmerData.plantsDamaged} plants damaged beyond recovery.\nConsider reviewing your pest and disease management strategies to prevent future losses.\nFor personalized advice on reducing plant damage, ask our Q&A system about pest control or disease prevention.`;
    }
    structuredList.push({ key: 'plant_damage', params: { content: damageText, count: farmerData.plantsDamaged } });
  }

  // ========== GROUP 16: SOIL AND WATER CONSERVATION ==========
  const conservationPractices = farmerData.conservationPractices ? farmerData.conservationPractices.split(',').map(p => p.trim()) : [];
  let conservationText = '';
  if (conservationPractices.length > 0 && conservationPractices.some(p => p !== 'None')) {
    if (isSwahili) {
      conservationText = `UHIFADHI WA UDONGO NA MAJI KWA BIASHARA YAKO YA ${crop.toUpperCase()}\nTayari unatumia: ${conservationPractices.filter(p => p !== 'None').join(', ')}. Kazi nzuri!\n\nNJIA ZILIZOPENDEKEZWA\nSamadi: Endelea kuweka tani 5-10 kwa ekari. Inaboresha muundo wa udongo na uwezo wa kuhifadhi maji.\nMatuta: Bora kwa miteremko! Inapunguza mmonyoko wa udongo hadi 80%.\nKufunika: Kuhifadhi unyevu, kupunguza palizi. Tumia mabaki ya mazao - NI BURE! (Saves ${formatCurrency(5000)}/acre)\nMazao ya kufunika: Panda mucuna au dolichos kati ya mistari. Hutoa kilo 40 N/ekari kiasili! (Yanaokoa ${formatCurrency(3500)} ya mbolea)\nKuvuna maji ya mvua: Jenga mabirika - 1,000m³ yanagharimu ${formatCurrency(200000)}, yanadumu miaka 10.\nKilimo cha mtaro: Kwenye miteremko >5% - inapunguza mmonyoko kwa 50% na kuhifadhi maji.\n\nHALI YA BIASHARA\nKufunika kunaokoa palizi mara 2 = ${formatCurrency(5000)}/ekari iliyookolewa\nMazao ya kufunika hutoa kilo 40 N/ekari = yanaokoa ${formatCurrency(3500)} ya mbolea\nKila ${currencySymbol}1 inayowekezwa katika uhifadhi inarudisha ${currencySymbol}5 katika kuokoa pembejeo na kuongeza mavuno`;
    } else if (isFrench) {
      conservationText = `CONSERVATION DES SOLS ET DE L'EAU POUR VOTRE ENTREPRISE ${crop.toUpperCase()}\nVous utilisez déjà : ${conservationPractices.filter(p => p !== 'None').join(', ')}. Bon travail !\n\nPRATIQUES RECOMMANDÉES\nFumier : Continuez à appliquer 5-10 tonnes par acre. Améliore la structure du sol et la capacité de rétention d'eau.\nTerrasses : Excellentes pour les pentes ! Réduit l'érosion du sol jusqu'à 80%.\nPaillage : Retient l'humidité, réduit le désherbage. Utilisez les résidus de culture - c'est GRATUIT ! (Économise ${formatCurrency(5000)}/acre)\nCultures de couverture : Plantez du mucuna ou du dolichos entre les rangs. Fixe 40 kg N/acre naturellement ! (Économise ${formatCurrency(3500)} d'engrais)\nCollecte des eaux de pluie : Construisez des bassins - un bassin de 1 000 m³ coûte ${formatCurrency(200000)} et dure 10 ans.\nCulture en courbes de niveau : Sur les pentes >5% - réduit l'érosion de 50% et retient l'eau.\n\nCAS COMMERCIAL\nLe paillage permet d'économiser 2 désherbages = ${formatCurrency(5000)}/acre économisés\nLes cultures de couverture fixent 40 kg N/acre = économisent ${formatCurrency(3500)} d'engrais\nChaque ${currencySymbol}1 investi dans la conservation rapporte ${currencySymbol}5 en intrants économisés et en rendements accrus`;
    } else if (isSpanish) {
      conservationText = `CONSERVACIÓN DE SUELO Y AGUA PARA SU EMPRESA ${crop.toUpperCase()}\nYa está usando: ${conservationPractices.filter(p => p !== 'None').join(', ')}. ¡Buen trabajo!\n\nPRÁCTICAS RECOMENDADAS\nEstiércol: Continúe aplicando 5-10 toneladas por acre. Mejora la estructura del suelo y la capacidad de retención de agua.\nTerrazas: ¡Excelentes para pendientes! Reduce la erosión del suelo hasta en un 80%.\nAcolchado: Retiene humedad, reduce deshierbe. Use residuos de cultivos - ¡es GRATIS! (Ahorra ${formatCurrency(5000)}/acre)\nCultivos de cobertura: Plante mucuna o dolichos entre hileras. ¡Fija 40 kg N/acre naturalmente! (Ahorra ${formatCurrency(3500)} de fertilizante)\nCaptación de agua de lluvia: Construya reservorios - un reservorio de 1,000 m³ cuesta ${formatCurrency(200000)} y dura 10 años.\nSiembra en curvas de nivel: En pendientes >5% - reduce la erosión en un 50% y retiene agua.\n\nCASO DE NEGOCIO\nEl acolchado ahorra 2 rondas de deshierbe = ${formatCurrency(5000)}/acre ahorrados\nLos cultivos de cobertura fijan 40 kg N/acre = ahorran ${formatCurrency(3500)} de fertilizante\nCada ${currencySymbol}1 invertido en conservación retorna ${currencySymbol}5 en ahorro de insumos y mayores rendimientos`;
    } else {
      conservationText = `SOIL AND WATER CONSERVATION FOR YOUR ${crop.toUpperCase()} ENTERPRISE\nYou're already using: ${conservationPractices.filter(p => p !== 'None').join(', ')}. Great job!\n\nRECOMMENDED PRACTICES\nOrganic Manure: Continue applying 5-10 tons per acre.\nTerracing: Excellent for slopes! Reduces soil erosion by up to 80%.\nMulching: Retains moisture, reduces weeding. Use crop residues - it's FREE! (Saves ${formatCurrency(5000)}/acre)\nCover crops: Plant mucuna or dolichos between rows. Fixes 40kg N/acre naturally! (Saves ${formatCurrency(3500)} fertilizer)\nRainwater harvesting: Build water pans - 1,000m³ pan costs ${formatCurrency(200000)}, lasts 10 years.\nContour farming: On slopes >5% - reduces erosion by 50% and retains water.\n\nBUSINESS CASE\nMulching saves 2 weeding rounds = ${formatCurrency(5000)}/acre saved\nCover crops fix 40kg N/acre = saves ${formatCurrency(3500)} fertilizer\nEvery ${currencySymbol}1 invested in conservation returns ${currencySymbol}5 in saved inputs and increased yields`;
    }
  } else {
    if (isSwahili) {
      conservationText = `UHIFADHI WA UDONGO NA MAJI KWA BIASHARA YAKO YA ${crop.toUpperCase()}\nHakuna mbinu za uhifadhi zilizoripotiwa. Hapa kuna mbinu zilizopendekezwa:\n\nNJIA ZILIZOPENDEKEZWA\nSamadi: Weka tani 5-10 kwa ekari. Inaboresha muundo wa udongo na uwezo wa kuhifadhi maji.\nMatuta: Bora kwa miteremko! Inapunguza mmonyoko wa udongo hadi 80%.\nKufunika: Kuhifadhi unyevu, kupunguza palizi. Tumia mabaki ya mazao - NI BURE! (Saves ${formatCurrency(5000)}/acre)\nMazao ya kufunika: Panda mucuna au dolichos kati ya mistari. Hutoa kilo 40 N/ekari kiasili! (Yanaokoa ${formatCurrency(3500)} ya mbolea)\nKuvuna maji ya mvua: Jenga mabirika - 1,000m³ yanagharimu ${formatCurrency(200000)}, yanadumu miaka 10.\nKilimo cha mtaro: Kwenye miteremko >5% - inapunguza mmonyoko kwa 50% na kuhifadhi maji.\n\nHALI YA BIASHARA\nKufunika kunaokoa palizi mara 2 = ${formatCurrency(5000)}/ekari iliyookolewa\nMazao ya kufunika hutoa kilo 40 N/ekari = yanaokoa ${formatCurrency(3500)} ya mbolea\nKila ${currencySymbol}1 inayowekezwa katika uhifadhi inarudisha ${currencySymbol}5 katika kuokoa pembejeo na kuongeza mavuno`;
    } else if (isFrench) {
      conservationText = `CONSERVATION DES SOLS ET DE L'EAU POUR VOTRE ENTREPRISE ${crop.toUpperCase()}\nAucune pratique de conservation signalée. Voici les techniques recommandées :\n\nPRATIQUES RECOMMANDÉES\nFumier : Appliquez 5-10 tonnes par acre. Améliore la structure du sol et la capacité de rétention d'eau.\nTerrasses : Excellentes pour les pentes ! Réduit l'érosion du sol jusqu'à 80%.\nPaillage : Retient l'humidité, réduit le désherbage. Utilisez les résidus de culture - c'est GRATUIT ! (Économise ${formatCurrency(5000)}/acre)\nCultures de couverture : Plantez du mucuna ou du dolichos entre les rangs. Fixe 40 kg N/acre naturellement ! (Économise ${formatCurrency(3500)} d'engrais)\nCollecte des eaux de pluie : Construisez des bassins - un bassin de 1 000 m³ coûte ${formatCurrency(200000)} et dure 10 ans.\nCulture en courbes de niveau : Sur les pentes >5% - réduit l'érosion de 50% et retient l'eau.\n\nCAS COMMERCIAL\nLe paillage permet d'économiser 2 désherbages = ${formatCurrency(5000)}/acre économisés\nLes cultures de couverture fixent 40 kg N/acre = économisent ${formatCurrency(3500)} d'engrais\nChaque ${currencySymbol}1 investi dans la conservation rapporte ${currencySymbol}5 en intrants économisés et en rendements accrus`;
    } else if (isSpanish) {
      conservationText = `CONSERVACIÓN DE SUELO Y AGUA PARA SU EMPRESA ${crop.toUpperCase()}\nNo se reportaron prácticas de conservación. Aquí están las técnicas recomendadas:\n\nPRÁCTICAS RECOMENDADAS\nEstiércol: Aplique 5-10 toneladas por acre. Mejora la estructura del suelo y la capacidad de retención de agua.\nTerrazas: ¡Excelentes para pendientes! Reduce la erosión del suelo hasta en un 80%.\nAcolchado: Retiene humedad, reduce deshierbe. Use residuos de cultivos - ¡es GRATIS! (Ahorra ${formatCurrency(5000)}/acre)\nCultivos de cobertura: Plante mucuna o dolichos entre hileras. ¡Fija 40 kg N/acre naturalmente! (Ahorra ${formatCurrency(3500)} de fertilizante)\nCaptación de agua de lluvia: Construya reservorios - un reservorio de 1,000 m³ cuesta ${formatCurrency(200000)} y dura 10 años.\nSiembra en curvas de nivel: En pendientes >5% - reduce la erosión en un 50% y retiene agua.\n\nCASO DE NEGOCIO\nEl acolchado ahorra 2 rondas de deshierbe = ${formatCurrency(5000)}/acre ahorrados\nLos cultivos de cobertura fijan 40 kg N/acre = ahorran ${formatCurrency(3500)} de fertilizante\nCada ${currencySymbol}1 invertido en conservación retorna ${currencySymbol}5 en ahorro de insumos y mayores rendimientos`;
    } else {
      conservationText = `SOIL AND WATER CONSERVATION FOR YOUR ${crop.toUpperCase()} ENTERPRISE\nNo conservation practices reported. Here are recommended practices:\n\nRECOMMENDED PRACTICES\nOrganic Manure: Apply 5-10 tons per acre.\nTerracing: Excellent for slopes! Reduces soil erosion by up to 80%.\nMulching: Retains moisture, reduces weeding. Use crop residues - it's FREE! (Saves ${formatCurrency(5000)}/acre)\nCover crops: Plant mucuna or dolichos between rows. Fixes 40kg N/acre naturally! (Saves ${formatCurrency(3500)} fertilizer)\nRainwater harvesting: Build water pans - 1,000m³ pan costs ${formatCurrency(200000)}, lasts 10 years.\nContour farming: On slopes >5% - reduces erosion by 50% and retains water.\n\nBUSINESS CASE\nMulching saves 2 weeding rounds = ${formatCurrency(5000)}/acre saved\nCover crops fix 40kg N/acre = saves ${formatCurrency(3500)} fertilizer\nEvery ${currencySymbol}1 invested in conservation returns ${currencySymbol}5 in saved inputs and increased yields`;
    }
  }
  structuredList.push({ key: 'conservation', params: { content: conservationText } });

  // ========== GROUP 17: POST-HARVEST HANDLING & STORAGE – French translation only when isFrench ==========
  let storageMethod = farmerData.storageMethod || '';
  if (isFrench) {
    storageMethod = translateStorageFr(storageMethod);
  }
  let postHarvestText = '';
  if (isFrench) {
    postHarvestText = `MANUTENTION ET STOCKAGE POST-RÉCOLTE POUR VOTRE ENTREPRISE ${crop.toUpperCase()}\nMéthode de stockage : ${storageMethod}\n\n${getPostHarvestLossWarning(crop, language)}\n\n${getSortingGradingAdvice(crop, language)}\n${getValueAdditionSuggestion(crop, language)}\n\nCONSEIL COMMERCIAL : Réduire les pertes post-récolte de 10 % augmente votre profit de 10 % sans frais de production supplémentaires ! Triez et calibrez pour de meilleurs prix.`;
  } else if (isSwahili) {
    postHarvestText = `USHUGHULIKAJI NA UHIFADHI WA BAADA YA MAVUNO KWA BIASHARA YAKO YA ${crop.toUpperCase()}\nMbinu ya kuhifadhi: ${storageMethod}\n\n${getPostHarvestLossWarning(crop, language)}\n\n${getSortingGradingAdvice(crop, language)}\n${getValueAdditionSuggestion(crop, language)}\n\nTAARIFA YA BIASHARA: Kupunguza hasara za baada ya mavuno kwa 10% kunaongeza faida yako kwa 10% bila gharama za ziada za uzalishaji! Panga na chemsha mavuno yako kwa bei bora.`;
  } else if (isSpanish) {
    postHarvestText = `MANEJO Y ALMACENAMIENTO POSTCOSECHA PARA SU EMPRESA ${crop.toUpperCase()}\nMétodo de almacenamiento: ${storageMethod}\n\n${getPostHarvestLossWarning(crop, language)}\n\n${getSortingGradingAdvice(crop, language)}\n${getValueAdditionSuggestion(crop, language)}\n\nCONSEJO COMERCIAL: ¡Reducir las pérdidas postcosecha en un 10% aumenta su ganancia en un 10% sin costos adicionales de producción! Seleccione y calibre para mejores precios.`;
  } else {
    postHarvestText = `POST-HARVEST HANDLING & STORAGE FOR YOUR ${crop.toUpperCase()} ENTERPRISE\nStorage method: ${storageMethod}\n\n${getPostHarvestLossWarning(crop, language)}\n\n${getSortingGradingAdvice(crop, language)}\n${getValueAdditionSuggestion(crop, language)}\n\nBUSINESS TIP: Reducing post-harvest losses by 10% increases your profit by 10% with no extra production costs! Sort and grade for better prices.`;
  }
  structuredList.push({ key: 'post_harvest', params: { content: postHarvestText } });

  // ========== GROUP 18: FARMING AS BUSINESS ==========
  let businessText = '';
  if (isSwahili) {
    businessText = `KILIMO KAMA BIASHARA - ONGEZA FAIDA YAKO\n\n1. JUA GHARAMA ZAKO\nFuatilia KILA pembejeo: mbegu, mbolea, kazi, usafirishaji, magunia\nMfano mahindi ya kati: Gharama ${formatCurrency(40000)}/hekta\n\n2. NUNUA KWA JUMLA (Okoa 20-30%)\nDAP: gunia 50kg ${formatCurrency(3500)} -> Nunua magunia 10 ${formatCurrency(31500)} (okoa ${formatCurrency(3500)})\nCAN: gunia 50kg ${formatCurrency(3200)} -> Nunua magunia 10 ${formatCurrency(28800)} (okoa ${formatCurrency(3200)})\n\n3. UNDA VIKUNDI VYA WAKULIMA\nUnunuzi wa jumla wa pembejeo: Okoa 15-25%\nUsafirishaji wa pamoja: Okoa ${formatCurrency(5000)}/ekari\nUuzaji wa pamoja: Pata bei 10-20% za juu\n\n4. AWAMU YA KUONGEZEKA\nKila ${currencySymbol}1 ya ziada inayowekezwa inarudisha ${currencySymbol}3-5 faida\nEndelea kuwekeza - pembejeo zaidi = faida zaidi\n\nMATOKEO YA MWISHO: Kilimo ni BIASHARA. Fanya kila shilingi ikufanyie kazi`;
  } else if (isFrench) {
    businessText = `L'AGRICULTURE COMME ENTREPRISE - MAXIMISEZ VOTRE PROFIT\n\n1. CONNAISSEZ VOS COÛTS\nSuivez CHAQUE intrant : semences, engrais, main-d'œuvre, transport, sacs\nExemple maïs moyen : Coûts ${formatCurrency(40000)}/hectare\n\n2. ACHETEZ EN VRAC (Économisez 20-30%)\nDAP : sac de 50 kg ${formatCurrency(3500)} -> Achetez 10 sacs ${formatCurrency(31500)} (économisez ${formatCurrency(3500)})\nCAN : sac de 50 kg ${formatCurrency(3200)} -> Achetez 10 sacs ${formatCurrency(28800)} (économisez ${formatCurrency(3200)})\n\n3. FORMEZ DES GROUPES D'AGRICULTEURS\nAchats groupés d'intrants : Économisez 15-25%\nTransport partagé : Économisez ${formatCurrency(5000)}/acre\nMarketing collectif : Obtenez des prix 10-20% plus élevés\n\n4. PHASE EXPONENTIELLE\nChaque ${currencySymbol}1 supplémentaire investi rapporte ${currencySymbol}3-5 de profit\nContinuez à investir - plus d'intrants = plus de profits\n\nCONCLUSION : L'agriculture est une ENTREPRISE. Faites travailler chaque centime pour vous`;
  } else if (isSpanish) {
    businessText = `AGRICULTURA COMO NEGOCIO - MAXIMICE SU GANANCIA\n\n1. CONOZCA SUS COSTOS\nRegistre CADA insumo: semillas, fertilizante, mano de obra, transporte, sacos\nEjemplo maíz medio: Costos ${formatCurrency(40000)}/hectárea\n\n2. COMPRE AL POR MAYOR (Ahorre 20-30%)\nDAP: saco 50kg ${formatCurrency(3500)} -> Compre 10 sacos ${formatCurrency(31500)} (ahorre ${formatCurrency(3500)})\nCAN: saco 50kg ${formatCurrency(3200)} -> Compre 10 sacos ${formatCurrency(28800)} (ahorre ${formatCurrency(3200)})\n\n3. FORME GRUPOS DE AGRICULTORES\nCompras al por mayor de insumos: Ahorre 15-25%\nTransporte compartido: Ahorre ${formatCurrency(5000)}/acre\nComercialización colectiva: Obtenga precios 10-20% más altos\n\n4. FASE EXPONENCIAL\nCada ${currencySymbol}1 adicional invertido retorna ${currencySymbol}3-5 de ganancia\nSiga invirtiendo - más insumos = más ganancias\n\nRESULTADO FINAL: La agricultura es un NEGOCIO. ¡Haga que cada ${currencySymbol} trabaje para usted!`;
  } else {
    businessText = `FARMING AS A BUSINESS - MAXIMIZE YOUR PROFIT\n\n1. KNOW YOUR COSTS\nTrack EVERY input: seeds, fertilizer, labour, transport, bags\nExample maize medium: Costs ${formatCurrency(40000)}/hectare\n\n2. BUY IN BULK (Save 20-30%)\nDAP: 50kg bag ${formatCurrency(3500)} -> Buy 10 bags ${formatCurrency(31500)} (save ${formatCurrency(3500)})\nCAN: 50kg bag ${formatCurrency(3200)} -> Buy 10 bags ${formatCurrency(28800)} (save ${formatCurrency(3200)})\n\n3. FORM FARMER GROUPS\nBulk input purchases: Save 15-25%\nShared transport: Save ${formatCurrency(5000)}/acre\nCollective marketing: Get 10-20% higher prices\n\n4. EXPONENTIAL PHASE\nEvery additional ${currencySymbol}1 input returns ${currencySymbol}3-5 profit\nKeep investing - more inputs = more profits\n\nBOTTOM LINE: Farming is a BUSINESS. Make every ${currencySymbol} work for you`;
  }
  structuredList.push({ key: 'farming_business', params: { content: businessText } });

  // ========== GROUP 19: NUTRITION BENEFITS ==========
  if (farmerData.wantsNutritionBenefits) {
    let nutritionText = '';
    if (isFrench) {
      if (lowerCrop === 'bananas') {
        nutritionText = `🌿 NUTRITION ET BIENFAITS POUR LA SANTÉ – BANANAS\nPour 100g de produit frais\nNutriments Clés\n• Vitamin B6: 0.4 mg (24% de l'apport journalier)\n• Vitamin C: 8.7 mg (10% de l'apport journalier)\n• Potassium: 358 mg (8% de l'apport journalier)\n• Manganèse: 0.3 mg (13% de l'apport journalier)\n• Fiber: 2.6 g (9% de l'apport journalier)\n• Magnésium: 27 mg (6% de l'apport journalier)\n• Copper: 0.1 mg (8% de l'apport journalier)\n• Vitamin A: 3 µg (0% de l'apport journalier)\nBienfaits pour la Santé\nAime votre cœur – le potassium abaisse la tension artérielle\nAbaisse doucement la tension – le potassium équilibre les fluides\nFacilite la digestion – pectine et amidon résistant\nAméliore la récupération après l'effort – glucides et potassium\nÉlève votre moral – la vitamine B6 aide à produire de la sérotonine\nAide à contrôler le poids – satiété\nRenforce les os – manganèse\nProtège vos reins – peut réduire le risque de calculs rénaux\nAntioxydant – dopamine et catéchines`;
      } else {
        nutritionText = `🌿 BIENFAITS NUTRITIONNELS – ${crop.toUpperCase()}\nRiche en vitamines, minéraux et antioxydants. Une alimentation saine commence par votre ferme.`;
      }
    } else if (isSwahili) {
      nutritionText = `🌿 MANUFAA YA LISHE – ${crop.toUpperCase()}\nIna vitamini nyingi, madini na vioksidishaji. Lishe bora huanza shambani kwako.`;
    } else if (isSpanish) {
      nutritionText = `🌿 BENEFICIOS NUTRICIONALES – ${crop.toUpperCase()}\nRico en vitaminas, minerales y antioxidantes. Una dieta saludable comienza en su granja.`;
    } else {
      nutritionText = `🌿 NUTRITIONAL BENEFITS – ${crop.toUpperCase()}\nRich in vitamins, minerals, and antioxidants. A healthy diet starts on your farm.`;
    }
    structuredList.push({ key: 'nutrition_benefits', params: { content: nutritionText } });
  }

  const list = structuredList.map(item => item.params?.content || '').filter(c => c);
  const financialAdvice = isFrench ? "Voyez l'analyse financière ci-dessus pour maximiser votre profit." : (isSwahili ? "Tazama uchambuzi wa kifedha hapo juu ili kuongeza faida yako." : (isSpanish ? "Vea el análisis financiero arriba para maximizar su ganancia." : "See financial analysis above to maximize your profit."));
  const structuredFinancialAdvice = { key: 'financial_advice', params: { content: financialAdvice } };

  return { list, financialAdvice, structuredList, structuredFinancialAdvice };
}