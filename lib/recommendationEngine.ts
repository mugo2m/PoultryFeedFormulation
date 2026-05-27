// lib/recommendationEngine.ts – Complete for 219 crops – with Spanish support

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

// Safe translation helper - works for both strings and functions, and replaces {{0}}, {{1}} placeholders
const safeT = (translation: any, fallback: string, ...args: any[]): string => {
  if (typeof translation === 'function') {
    return translation(...args);
  }
  let result = (translation as string) || fallback;
  for (let i = 0; i < args.length; i++) {
    result = result.replace(new RegExp(`\\{\\{${i}\\}\\}`, 'g'), args[i].toString());
    result = result.replace(new RegExp(`\\{\\{${i}\\?\\?.*?\\}\\}`, 'g'), args[i].toString());
  }
  return result;
};

// Helper to replace named placeholders like {{crop}}, {{diseases}}, etc.
const replacePlaceholders = (template: string | undefined, params: Record<string, string | number>): string => {
  if (!template) return "";
  let result = template;
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value.toString());
  }
  return result;
};

interface RecommendationInput {
  hasSoilTest: boolean;
  soilAnalysis?: any;
  fertilizerPlan?: any;
  crop: string;
  crops: string[];
  farmerData: {
    farmerName?: string;
    usePlantingFertilizer?: string;
    useTopdressingFertilizer?: string;
    organicManure?: string;
    terracing?: string;
    mulching?: string;
    coverCrops?: string;
    rainwaterHarvesting?: string;
    contourFarming?: string;
    commonPests?: string;
    commonDiseases?: string;
    deficiencySymptoms?: string;
    deficiencyLocation?: string;
    mainChallenge?: string;
    experience?: string;
    managementLevel?: string;
    conservationPractices?: string;
    actualYieldKg?: number;
    pricePerKg?: number;
    totalCosts?: number;
    country?: string;
    limePricePerBag?: number;
    recCalciticLime?: number;
    plantsDamaged?: number;
    language?: string;
    spacing?: string;
    storageMethod?: string;
    recDolomiticLime?: number;
    dolomiticLimePricePerBag?: number;
    currencySymbol?: string;
    currencyName?: string;
  };
}

interface RecommendationOutput {
  list: string[];
  financialAdvice: string;
  structuredList: RecommendationItem[];
  structuredFinancialAdvice: RecommendationItem;
}

interface RecommendationItem {
  key: string;
  params?: Record<string, any>;
}

// Helper to determine crop category for post‑harvest advice (expanded)
const getCropCategory = (crop: string): string => {
  const c = crop.toLowerCase();
  const grains = [
    "maize", "beans", "wheat", "sorghum", "millet", "rice", "barley", "finger millet",
    "oats", "teff", "triticale", "buckwheat", "quinoa", "fonio", "spelt", "kamut", "amaranth grain"
  ];
  const pulses = [
    "soya beans", "cowpeas", "green grams", "bambara nuts", "groundnuts", "pigeon peas",
    "chickpea", "lentil", "faba bean", "peanut", "alfalfa", "lucerne", "clover", "white clover",
    "vetch", "mucuna", "desmodium", "dolichos", "canavalia", "sunn hemp", "crotalaria paulina"
  ];
  const tubers = [
    "cassava", "sweet potatoes", "irish potatoes", "yams", "taro", "arrow roots",
    "ginger", "turmeric", "horseradish", "parsnip", "turnip", "rutabaga", "beetroot", "radish"
  ];
  const vegetables = [
    "tomatoes", "cabbage", "kales", "onions", "carrots", "capsicums", "chillies",
    "brinjals", "eggplants", "french beans", "garden peas", "spinach", "okra", "cauliflower",
    "lettuce", "broccoli", "celery", "leeks", "pumpkin leaves", "sweet potato leaves",
    "jute mallow", "spider plant", "african nightshade", "amaranth", "ethiopian kale",
    "coriander", "parsley", "arugula", "endive", "kohlrabi", "watercress", "pumpkin",
    "courgettes", "cucumbers", "artichoke", "asparagus", "rhubarb", "wasabi", "bok choy",
    "collard greens", "mustard greens", "swiss chard", "radicchio", "escarole", "frisee",
    "turnip greens", "celery", "leeks", "lettuce"
  ];
  const fruits = [
    "bananas", "oranges", "pineapples", "mangoes", "avocados", "pawpaws", "passion fruit",
    "citrus", "watermelon", "grapefruit", "lemons", "limes", "guava", "jackfruit",
    "breadfruit", "pomegranate", "star fruit", "coconut", "fig", "date palm", "mulberry",
    "lychee", "persimmon", "gooseberry", "currant", "elderberry", "rambutan", "durian",
    "mangosteen", "longan", "marula"
  ];
  if (grains.includes(c)) return "grains";
  if (pulses.includes(c)) return "pulses";
  if (tubers.includes(c)) return "tubers";
  if (vegetables.includes(c)) return "vegetables";
  if (fruits.includes(c)) return "fruits";
  return "other";
};

// ========== Crop‑specific post‑harvest loss warning ==========
const getPostHarvestLossWarning = (crop: string, language: string): string => {
  const c = crop.toLowerCase();
  if (language === 'sw') {
    if (c.includes('cabbage') || c.includes('kale') || c.includes('sukuma')) {
      return "⚠️ HADHARI: Utunzaji duni wa kabichi/sukumawiki unaweza kusababisha hasara ya HADI 50%! Majani ya nje yaliyovunjika huoza haraka, na majani yaliyopasuka huvutia bakteria – hii inapunguza thamani ya soko na maisha ya rafu.";
    }
    if (c.includes('spinach')) {
      return "⚠️ HADHARI: Utunzaji duni wa mchicha unaweza kusababisha hasara ya HADI 50%! Majani yaliyopondwa hupoteza unyevu na kugeuka manjano ndani ya siku 1-2, na uchafu husababisha uozo haraka.";
    }
    if (c.includes('lettuce')) {
      return "⚠️ HADHARI: Utunzaji duni wa lettuce unaweza kusababisha hasara ya HADI 50%! Majani yaliyovunjika hupoteza mnofu na kuoza, na joto la juu husababisha kuchipua na kuwa chungu.";
    }
    if (c.includes('broccoli') || c.includes('cauliflower')) {
      return "⚠️ HADHARI: Utunzaji duni wa brokoli/koli flower unaweza kusababisha hasara ya HADI 50%! Maua yaliyopondwa yanageuka manjano na kuoza haraka, na unyevu husababisha ukungu.";
    }
    if (c.includes('capsicum') || c.includes('pepper') || c.includes('pilipili')) {
      return "⚠️ HADHARI: Utunzaji duni wa pilipili hoho unaweza kusababisha hasara ya HADI 50%! Nyanya za pilipili zilizopondwa hupoteza unyevu na kuharibika ndani ya siku 3-5, na majeraha huwavutia wadudu.";
    }
    if (c.includes('brinjal') || c.includes('eggplant') || c.includes('biringani')) {
      return "⚠️ HADHARI: Utunzaji duni wa biringani unaweza kusababisha hasara ya HADI 50%! Matunda yaliyopondwa yana madoa meusi ndani na huiva mapema, na majeraha hufungua mlango kwa magonjwa.";
    }
    if (c.includes('french beans') || c.includes('garden peas')) {
      return "⚠️ HADHARI: Utunzaji duni wa maharagwe ya kifaransa/mbaazi unaweza kusababisha hasara ya HADI 50%! Maganda yaliyovunjika hupoteza unyevu na kukauka, na majeraha huruhusu ukungu kuingia.";
    }
    if (c.includes('carrot')) return "⚠️ HADHARI: Utunzaji duni wa karoti unaweza kusababisha hasara ya HADI 50%! Karoti zilizovunjika au kupasuka hupoteza unyevu haraka na kuvutia ukungu – hii hupunguza thamani ya soko na inaweza kuleta metali nzito kutoka udongo.";
    if (c.includes('tomato')) return "⚠️ HADHARI: Utunzaji duni wa nyanya unaweza kusababisha hasara ya HADI 50%! Nyanya zilizopasuka huingiza bakteria na ukungu – hii huharibu ubora wa kuuza nje na kupunguza maisha ya rafu.";
    if (c.includes('maize')) return "⚠️ HADHARI: Utunzaji duni wa mahindi unaweza kusababisha hasara ya HADI 50%! Nafaka zilizovunjika huruhusu aflatoxini (sumu ya saratani) na wadudu kuingia – hii inashusha daraja la soko na kuhatarisha afya.";
    if (c.includes('cassava')) return "⚠️ HADHARI: Utunzaji duni wa mihogo unaweza kusababisha hasara ya HADI 50%! Mizizi iliyopondwa huoza ndani ya siku 3-5 kwa sababu ya kuvu na bakteria – hii inapunguza ubora wa usindikaji na mauzo ya nje.";
    if (c.includes('onion')) return "⚠️ HADHARI: Utunzaji duni wa vitunguu unaweza kusababisha hasara ya HADI 50%! Vitunguu vilivyopondwa huoza kwenye shingo na kuota kwa sababu ya mwanga na unyevu – hii hupunguza thamani ya soko.";
    if (c.includes('avocado')) return "⚠️ HADHARI: Utunzaji duni wa parachichi unaweza kusababisha hasara ya HADI 50%! Matunda yaliyopondwa yana madoa meusi ndani na huiva mapema kwa sababu ya ethilini – hii inafanya yasiuzike.";
    return "⚠️ HADHARI: Utunzaji duni wa mavuno unaweza kusababisha hasara ya HADI 50%! Aflatoxini (sumu), majeraha, uchafu na metali nzito hushusha ubora na kuzuia soko.";
  }
  if (language === 'fr') {
    if (c.includes('cabbage') || c.includes('kale')) return "⚠️ ATTENTION : Une mauvaise manutention du chou peut entraîner une PERTE DE 50% ! Les feuilles extérieures cassées pourrissent rapidement, et les têtes fendues attirent les bactéries – cela réduit la valeur marchande.";
    if (c.includes('spinach')) return "⚠️ ATTENTION : Une mauvaise manutention des épinards peut entraîner une PERTE DE 50% ! Les feuilles meurtries perdent leur humidité et jaunissent en 1-2 jours, et la saleté provoque une pourriture rapide.";
    if (c.includes('lettuce')) return "⚠️ ATTENTION : Une mauvaise manutention de la laitue peut entraîner une PERTE DE 50% ! Les feuilles cassées perdent leur croquant et pourrissent, et la chaleur provoque la montaison et l'amertume.";
    if (c.includes('broccoli') || c.includes('cauliflower')) return "⚠️ ATTENTION : Une mauvaise manutention du brocoli/chou-fleur peut entraîner une PERTE DE 50% ! Les fleurons meurtris jaunissent et pourrissent rapidement, et l'humidité favorise la moisissure.";
    if (c.includes('capsicum') || c.includes('pepper')) return "⚠️ ATTENTION : Une mauvaise manutention du poivron peut entraîner une PERTE DE 50% ! Les fruits meurtris perdent leur eau et se gâtent en 3-5 jours, et les blessures attirent les insectes.";
    if (c.includes('brinjal') || c.includes('eggplant')) return "⚠️ ATTENTION : Une mauvaise manutention de l'aubergine peut entraîner une PERTE DE 50% ! Les fruits meurtris développent des taches sombres internes et mûrissent de manière inégale, et les blessures ouvrent la porte aux maladies.";
    if (c.includes('french beans') || c.includes('garden peas')) return "⚠️ ATTENTION : Une mauvaise manutention des haricots verts/pois peut entraîner une PERTE DE 50% ! Les gousses cassées perdent leur humidité et se ratatinent, et les dommages permettent l'entrée de moisissures.";
    if (c.includes('carrot')) return "⚠️ ATTENTION : La mauvaise manutention des carottes peut entraîner une PERTE DE 50% ! Les racines cassées perdent leur humidité et attirent les moisissures – cela réduit la valeur marchande.";
    if (c.includes('tomato')) return "⚠️ ATTENTION : La mauvaise manutention des tomates peut entraîner une PERTE DE 50% ! Les fruits fendus laissent entrer bactéries et moisissures – cela réduit la durée de conservation.";
    if (c.includes('maize')) return "⚠️ ATTENTION : La mauvaise manutention du maïs peut entraîner une PERTE DE 50% ! Les grains cassés favorisent l'aflatoxine (cancérigène) et les insectes – cela abaisse la qualité marchande.";
    return "⚠️ ATTENTION : Une mauvaise manutention peut entraîner une PERTE DE 50% ! L'aflatoxine, les blessures, la contamination et les métaux lourds réduisent la qualité.";
  }
  if (language === 'es') {
    if (c.includes('cabbage') || c.includes('kale')) return "⚠️ ADVERTENCIA: ¡El mal manejo del repollo/col puede causar una PÉRDIDA DE HASTA EL 50%! Las hojas externas rotas se pudren rápidamente, y las cabezas partidas atraen bacterias – esto reduce el valor de mercado.";
    if (c.includes('spinach')) return "⚠️ ADVERTENCIA: ¡El mal manejo de las espinacas puede causar una PÉRDIDA DE HASTA EL 50%! Las hojas magulladas pierden humedad y se amarillean en 1-2 días, y la suciedad provoca pudrición rápida.";
    if (c.includes('lettuce')) return "⚠️ ADVERTENCIA: ¡El mal manejo de la lechuga puede causar una PÉRDIDA DE HASTA EL 50%! Las hojas rotas pierden su textura crujiente y se pudren, y las altas temperaturas causan floración precoz y amargor.";
    if (c.includes('broccoli') || c.includes('cauliflower')) return "⚠️ ADVERTENCIA: ¡El mal manejo del brócoli/coliflor puede causar una PÉRDIDA DE HASTA EL 50%! Los floretes magullados se amarillean y se pudren rápidamente, y la humedad favorece el moho.";
    if (c.includes('capsicum') || c.includes('pepper')) return "⚠️ ADVERTENCIA: ¡El mal manejo del pimiento puede causar una PÉRDIDA DE HASTA EL 50%! Los frutos magullados pierden agua y se echan a perder en 3-5 días, y las heridas atraen insectos.";
    if (c.includes('brinjal') || c.includes('eggplant')) return "⚠️ ADVERTENCIA: ¡El mal manejo de la berenjena puede causar una PÉRDIDA DE HASTA EL 50%! Los frutos magullados desarrollan manchas oscuras internas y maduran de manera desigual, y las heridas abren la puerta a enfermedades.";
    if (c.includes('french beans') || c.includes('garden peas')) return "⚠️ ADVERTENCIA: ¡El mal manejo de los frijoles verdes/guisantes puede causar una PÉRDIDA DE HASTA EL 50%! Las vainas rotas pierden humedad y se arrugan, y los daños permiten la entrada de moho.";
    if (c.includes('carrot')) return "⚠️ ADVERTENCIA: ¡El mal manejo de las zanahorias puede causar una PÉRDIDA DE HASTA EL 50%! Las raíces rotas o agrietadas pierden humedad rápidamente y atraen moho – esto reduce el valor de mercado.";
    if (c.includes('tomato')) return "⚠️ ADVERTENCIA: ¡El mal manejo de los tomates puede causar una PÉRDIDA DE HASTA EL 50%! Los frutos partidos permiten la entrada de bacterias y moho – esto reduce la vida útil.";
    if (c.includes('maize')) return "⚠️ ADVERTENCIA: ¡El mal manejo del maíz puede causar una PÉRDIDA DE HASTA EL 50%! Los granos rotos permiten la entrada de aflatoxina (hongo cancerígeno) e insectos – esto reduce la calidad.";
    return "⚠️ ADVERTENCIA: ¡El mal manejo postcosecha puede causar una PÉRDIDA DE HASTA EL 50%! La aflatoxina, los daños físicos, la contaminación y los oligoelementos reducen la calidad.";
  }
  // English (default)
  if (c.includes('cabbage') || c.includes('kale')) {
    return "⚠️ WARNING: Poor cabbage/kale handling can cause UP TO 50% LOSS! Broken outer leaves rot quickly, and split heads invite bacteria – this reduces market value and shelf life.";
  }
  if (c.includes('spinach')) {
    return "⚠️ WARNING: Poor spinach handling can cause UP TO 50% LOSS! Bruised leaves lose moisture and turn yellow within 1-2 days, and dirt introduces rapid decay.";
  }
  if (c.includes('lettuce')) {
    return "⚠️ WARNING: Poor lettuce handling can cause UP TO 50% LOSS! Broken leaves lose crispness and rot, and high temperatures cause bolting and bitterness.";
  }
  if (c.includes('broccoli') || c.includes('cauliflower')) {
    return "⚠️ WARNING: Poor broccoli/cauliflower handling can cause UP TO 50% LOSS! Bruised florets turn yellow and decay quickly, and moisture promotes mould.";
  }
  if (c.includes('capsicum') || c.includes('pepper')) {
    return "⚠️ WARNING: Poor capsicum handling can cause UP TO 50% LOSS! Bruised peppers lose water and spoil within 3-5 days, and injury invites insect damage.";
  }
  if (c.includes('brinjal') || c.includes('eggplant')) {
    return "⚠️ WARNING: Poor eggplant handling can cause UP TO 50% LOSS! Bruised fruits develop internal dark spots and ripen unevenly, and wounds open the door to disease.";
  }
  if (c.includes('french beans') || c.includes('garden peas')) {
    return "⚠️ WARNING: Poor French bean/pea handling can cause UP TO 50% LOSS! Broken pods lose moisture and shrivel, and damage allows mould entry.";
  }
  if (c.includes('carrot')) return "⚠️ WARNING: Poor carrot handling can cause UP TO 50% LOSS! Broken or cracked roots lose moisture rapidly and invite mould – this reduces market value and may contain heavy metals from soil.";
  if (c.includes('tomato')) return "⚠️ WARNING: Poor tomato handling can cause UP TO 50% LOSS! Split fruits allow bacteria and mould entry – this reduces shelf life and export quality.";
  if (c.includes('maize')) return "⚠️ WARNING: Poor maize handling can cause UP TO 50% LOSS! Broken grains allow aflatoxin (cancer‑causing mould) and weevils to enter – this lowers market grade and health safety.";
  if (c.includes('cassava')) return "⚠️ WARNING: Poor cassava handling can cause UP TO 50% LOSS! Bruised roots rot within 3-5 days due to fungi and bacteria – this reduces processing quality and export potential.";
  if (c.includes('onion')) return "⚠️ WARNING: Poor onion handling can cause UP TO 50% LOSS! Bruised bulbs rot at the neck and sprout due to light and moisture – this reduces market value and storage life.";
  if (c.includes('avocado')) return "⚠️ WARNING: Poor avocado handling can cause UP TO 50% LOSS! Bruised fruits develop internal dark spots and ripen unevenly due to ethylene – this makes them unmarketable.";
  return "⚠️ WARNING: Poor post‑harvest handling can cause UP TO 50% LOSS! Aflatoxin (toxic mould), physical injury, contamination and trace elements lower quality and block market access.";
};

// ========== Crop‑specific sorting & grading (expanded) ==========
const getSortingGradingAdvice = (crop: string, language: string): string => {
  const c = crop.toLowerCase();
  if (language === 'sw') {
    if (c.includes('cabbage') || c.includes('kale')) {
      return "Panga na chemsha kabichi/sukumawiki: ondoa majani ya nje yaliyovunjika, yaliyokauka au yenye madoa – **majani yaliyoharibika husababisha uozo unaoenea haraka**. Weka vichwa vilivyo imara na safi.";
    }
    if (c.includes('spinach')) {
      return "Panga na chemsha mchicha: tenga majani yaliyo safi, yenye rangi ya kijani, bila majeraha – **majani yaliyopondwa huoza ndani ya siku moja**. Ondoa yale yaliyochanika au yenye ukungu.";
    }
    if (c.includes('lettuce')) {
      return "Panga na chemsha lettuce: chagua vichwa vilivyo imara, majani safi bila madoa – **vichwa vilivyoharibika huathiri wengine kwa uharibifu**. Ondoa majani ya nje yaliyokauka.";
    }
    if (c.includes('broccoli') || c.includes('cauliflower')) {
      return "Panga na chemsha brokoli/koli flower: chagua maua yaliyo imara, yenye rangi sawa – **maua yaliyopondwa yanageuka manjano haraka**. Ondoa yale yaliyo na madoa au uozo.";
    }
    if (c.includes('capsicum') || c.includes('pepper')) {
      return "Panga na chemsha pilipili hoho: tenga pilipili zenye rangi kamili, ngozi ngumu, bila madoa – **pilipili zilizoharibika huathiri ubora wa zima**. Daraja A hupata bei ya juu 30%.";
    }
    if (c.includes('brinjal') || c.includes('eggplant')) {
      return "Panga na chemsha biringani: chagua zenye ngozi laini, rangi ya zambarau iliyokaa, bila madoa – **biringani zilizopondwa huwa na ladha chungu**. Ondoa zenye madoa ya kahawia.";
    }
    if (c.includes('french beans') || c.includes('garden peas')) {
      return "Panga na chemsha maharagwe/mbaazi: chagua maganda yenye rangi ya kijani, yaliyojaa, bila madoa – **maganda yaliyovunjika hukauka haraka na kupoteza thamani**. Ondoa yale yaliyokauka au yenye ukungu.";
    }
    if (c.includes('carrot')) return "Panga na chemsha karoti: ondoa zilizovunjika, zilizopasuka au zenye madoa – **karoti zilizoharibika hueneza magonjwa kwa nzima na hupunguza bei kwa 30%**. Karoti safi na nyofu hupata bei ya juu.";
    if (c.includes('tomato')) return "Panga na chemsha nyanya: tenga zilizoiva sawasawa, nyekundu, bila nyufa – **nyanya zilizopasuka huvutia bakteria na kuoza mapema, na hushusha daraja**. Daraja A hupata bei mara 2.";
    if (c.includes('avocado')) return "Panga na chemsha parachichi: chagua zilizo na umbo zuri, bila madoa – **madoa ya ndani yanaashiria uozo unaoenea kwa wengine**. Daraja la kwanza hupata bei 40% za juu.";
    if (c.includes('onion')) return "Panga na chemsha vitunguu: ondoa vilivyopondwa, vilivyoota au vyenye madoa meusi – **vitunguu vilivyoharibika husababisha uozo wa shingo na kuota kwa wengine**. Hii huokoa hasara kubwa.";
    return "Panga na chemsha mavuno yako: ondoa yaliyoharibika, yenye ukungu au majeraha – **kuondoa bidhaa mbaya huzuia kuenea kwa magonjwa na inaboresha bei kwa 20-30%**.";
  }
  if (language === 'fr') {
    if (c.includes('cabbage')) return "Triez et calibrez le chou : retirez les feuilles extérieures abîmées – **les feuilles endommagées propagent la pourriture**. Gardez les têtes fermes et propres.";
    if (c.includes('spinach')) return "Triez et calibrez les épinards : sélectionnez les feuilles vertes, non meurtries – **les feuilles meurtries pourrissent en 24h**. Jetez celles qui sont jaunes ou visqueuses.";
    if (c.includes('lettuce')) return "Triez et calibrez la laitue : choisissez des têtes fermes aux feuilles intactes – **les têtes abîmées font pourrir les voisines**. Retirez les feuilles extérieures fanées.";
    if (c.includes('broccoli')) return "Triez et calibrez le brocoli : sélectionnez des fleurons fermes, de couleur uniforme – **les fleurons meurtris jaunissent rapidement**. Retirez ceux avec taches ou pourriture.";
    if (c.includes('capsicum')) return "Triez et calibrez les poivrons : choisissez des fruits de couleur vive, fermes, sans taches – **les fruits endommagés se gâtent plus vite et affectent la qualité**. Le grade A obtient un prix 30% supérieur.";
    if (c.includes('brinjal')) return "Triez et calibrez les aubergines : choisissez des fruits brillants, violet foncé, sans taches – **les aubergines meurtries deviennent amères**. Jetez celles avec des taches brunes.";
    if (c.includes('french beans')) return "Triez et calibrez les haricots verts : sélectionnez des gousses vert vif, bien remplies, sans taches – **les gousses cassées se ratatinent rapidement et perdent de la valeur**. Retirez celles qui sont sèches ou moisiess.";
    if (c.includes('carrot')) return "Triez et calibrez les carottes : retirez les racines cassées ou tachées – **les carottes endommagées propagent les maladies et réduisent le prix de 30%**.";
    if (c.includes('tomato')) return "Triez et calibrez les tomates : séparez les tomates mûres uniformément, rouges, sans fissures – **les tomates fissurées attirent les bactéries et pourrissent tôt, abaissant la qualité**.";
    return "Triez et calibrez : retirez les produits endommagés – **cela empêche la propagation des maladies et augmente le prix de 20-30%**.";
  }
  if (language === 'es') {
    if (c.includes('cabbage')) return "Clasifique y calibre el repollo: retire las hojas externas dañadas – **las hojas dañadas propagan la pudrición**. Mantenga las cabezas firmes y limpias.";
    if (c.includes('spinach')) return "Clasifique y calibre las espinacas: seleccione hojas verdes, sin magulladuras – **las hojas magulladas se pudren en 24h**. Deseche las amarillas o viscosas.";
    if (c.includes('lettuce')) return "Clasifique y calibre la lechuga: elija cabezas firmes con hojas intactas – **las cabezas dañadas pudren a las vecinas**. Retire las hojas externas marchitas.";
    if (c.includes('broccoli')) return "Clasifique y calibre el brócoli: seleccione floretes firmes, de color uniforme – **los floretes magullados se amarillean rápidamente**. Retire los que tengan manchas o podredumbre.";
    if (c.includes('capsicum')) return "Clasifique y calibre los pimientos: elija frutos de color vivo, firmes, sin manchas – **los frutos dañados se echan a perder más rápido y afectan la calidad**. El grado A obtiene un precio 30% superior.";
    if (c.includes('brinjal')) return "Clasifique y calibre las berenjenas: elija frutos brillantes, violeta oscuro, sin manchas – **las berenjenas magulladas se vuelven amargas**. Deseche las que tengan manchas marrones.";
    if (c.includes('french beans')) return "Clasifique y calibre las judías verdes: seleccione vainas de color verde brillante, bien llenas, sin manchas – **las vainas rotas se arrugan rápidamente y pierden valor**. Retire las secas o con moho.";
    if (c.includes('carrot')) return "Clasifique y calibre las zanahorias: retire las raíces rotas o manchadas – **las zanahorias dañadas propagan enfermedades y reducen el precio en un 30%**.";
    if (c.includes('tomato')) return "Clasifique y calibre los tomates: separe los tomates maduros uniformemente, rojos, sin grietas – **los tomates agrietados atraen bacterias y se pudren temprano, bajando la calidad**.";
    return "Clasifique y calibre: retire los productos dañados – **esto evita la propagación de enfermedades y aumenta el precio entre un 20-30%**.";
  }
  // English default
  if (c.includes('cabbage') || c.includes('kale')) {
    return "Sort and grade cabbage/kale: remove loose, yellow or cracked outer leaves – **damaged leaves spread rot quickly**. Keep firm, compact heads with clean leaves.";
  }
  if (c.includes('spinach')) {
    return "Sort and grade spinach: select fresh, green, unbruised leaves – **bruised leaves wilt and rot within 24 hours**. Discard yellowed or slimy ones.";
  }
  if (c.includes('lettuce')) {
    return "Sort and grade lettuce: choose firm heads with crisp, unblemished leaves – **damaged heads cause neighbouring heads to spoil**. Remove wilted outer leaves.";
  }
  if (c.includes('broccoli') || c.includes('cauliflower')) {
    return "Sort and grade broccoli/cauliflower: select firm, evenly coloured florets – **bruised florets yellow quickly**. Remove any with dark spots or decay.";
  }
  if (c.includes('capsicum') || c.includes('pepper')) {
    return "Sort and grade capsicum: select fully coloured, firm, unblemished fruits – **damaged peppers spoil faster and affect quality**. Grade A fetches 30% premium.";
  }
  if (c.includes('brinjal') || c.includes('eggplant')) {
    return "Sort and grade eggplants: select shiny, deep purple fruits without blemishes – **bruised eggplants become bitter**. Discard those with brown spots.";
  }
  if (c.includes('french beans') || c.includes('garden peas')) {
    return "Sort and grade French beans/peas: select bright green, well‑filled pods without blemishes – **broken pods shrivel quickly and lose value**. Discard dried or mouldy pods.";
  }
  if (c.includes('carrot')) return "Sort and grade carrots: remove broken, cracked or spotted roots – **damaged carrots spread rot to healthy ones and reduce price by 30%**. Clean, straight roots get premium prices.";
  if (c.includes('tomato')) return "Sort and grade tomatoes: separate evenly ripe, red tomatoes without cracks – **cracked tomatoes invite bacteria and rot early, lowering grade**. Grade A gets 2x price.";
  if (c.includes('avocado')) return "Sort and grade avocados: select well‑shaped fruits without blemishes – **internal blemishes indicate rot that spreads**. Grade 1 sells for 40% premium.";
  if (c.includes('onion')) return "Sort and grade onions: remove bruised, sprouted or black‑spotted bulbs – **damaged onions cause neck rot and sprouting in storage**. This prevents major losses.";
  return "Sort and grade your produce: remove damaged, mouldy or injured items – **removing bad produce prevents disease spread and improves price by 20-30%**.";
};

// ========== Crop‑specific value addition ==========
const getValueAdditionSuggestion = (crop: string, language: string): string => {
  const c = crop.toLowerCase();
  if (language === 'sw') {
    if (c.includes('cabbage') || c.includes('kale')) {
      return "Ongeza thamani: Tengeneza sauerkraut (kabichi iliyochachuka) au kabichi kavu – **kuchachuka kunaongeza probiotics na kuhifadhi kwa miezi 6+, kukausha kunazuia uozo**. Pia unaweza kutengeneza coleslaw safi kwa bei ya juu.";
    }
    if (c.includes('spinach')) {
      return "Ongeza thamani: Kausha mchicha na ufunge kwa plastiki – **mchicha kavu huhifadhi virutubisho na hudumu miezi 12**. Pia unaweza kusaga kuwa unga wa mchicha kwa uji wa lishe.";
    }
    if (c.includes('lettuce')) {
      return "Ongeza thamani: Fungasha lettuce kwenye vifungashio vya plastiki vilivyowekewa unyevu – **hii inaongeza maisha ya rafu hadi wiki 2**. Fikiria kuuza lettuce iliyoosha na kupangwa tayari kula kwa bei ya juu.";
    }
    if (c.includes('broccoli') || c.includes('cauliflower')) {
      return "Ongeza thamani: Ganda na uuze vipande vilivyokatwa, au kausha na ufunge – **mboga zilizokatwa tayari hupata bei ya juu 40%**. Kukausha huongeza maisha ya rafu hadi miezi 12.";
    }
    if (c.includes('capsicum') || c.includes('pepper')) {
      return "Ongeza thamani: Tengeneza pilipili kavu, pilipili iliyosagwa (paprika), au pilipili iliyokatwa kwenye mafuta – **kukausha huongeza maisha ya rafu hadi miezi 12 na bei mara 3**. Pilipili nzima kavu huzuia ukungu.";
    }
    if (c.includes('brinjal') || c.includes('eggplant')) {
      return "Ongeza thamani: Kausha vipande vya biringani, tengeneza pickles, au uuze kama biringani zilizochomwa (grilled) – **kukausha kunazuia uozo na kudumisha ladha**. Pickles hudumu zaidi ya mwaka 1.";
    }
    if (c.includes('french beans') || c.includes('garden peas')) {
      return "Ongeza thamani: Kausha maharagwe au mbaazi, au weka kwenye mifuko ya plastiki kwa kufungia – **kukausha kunazuia ukungu na kuhifadhi protini, na kufungia huhifadhi ubora**. Maharagwe kavu huuzwa bei ya juu mara 2.";
    }
    if (c.includes('avocado')) return "Ongeza thamani: Tengeneza mafuta ya parachichi (avocado oil) au guacamole – **mafuta huhifadhi virutubisho na huuzwa bei ya juu mara 3**. Kausha vipande kwa jua ili kuondoa unyevu na kuzuia ukungu.";
    if (c.includes('mango')) return "Ongeza thamani: Tengeneza vipande vikavu vya maembe – **kukausha kunazuia ukuaji wa ukungu na kuongeza maisha ya rafu hadi miezi 12**. Bei ya maembe kavu ni mara 3 ya mabichi.";
    if (c.includes('tomato')) return "Ongeza thamani: Tengeneza nyanya kavu au kuwa paste – **kukausha kunapunguza unyevu, kuzuia bakteria, na kuongeza maisha ya rafu hadi miezi 6**. Bei ni mara 2 ya nyanya mbichi.";
    if (c.includes('cassava')) return "Ongeza thamani: Saga mihogo kuwa unga – **unga hauhitaji hifadhi maalum na hudumu zaidi ya mwaka 1**. Pia unaweza kutengeneza chips au wanga (starch) kwa matumizi ya viwandani.";
    if (c.includes('banana')) return "Ongeza thamani: Tengeneza unga wa ndizi au vipande vikavu – **unga una maisha marefu ya rafu na hutumika kwa uji wa lishe**. Ndizi kavu huuzwa bei ya juu mara 2.";
    return "Ongeza thamani: Kausha, saga, funga kwa plastiki – **kukausha huondoa unyevu unaosababisha uozo, na ufungaji mzuri huzuia wadudu**. Bidhaa iliyochakatwa ina bei mara 2-3.";
  }
  if (language === 'fr') {
    if (c.includes('cabbage')) return "Ajoutez de la valeur : Faites de la choucroute ou du chou séché – **la fermentation ajoute des probiotiques et conserve 6+ mois, le séchage empêche la pourriture**. Vendez aussi de la coleslaw fraîche à prix premium.";
    if (c.includes('spinach')) return "Ajoutez de la valeur : Séchez les épinards et emballez – **les épinards séchés conservent les nutriments et durent 12 mois**. Vous pouvez aussi les moudre en poudre pour une bouillie nutritive.";
    if (c.includes('lettuce')) return "Ajoutez de la valeur : Emballez la laitue dans des sachets perforés – **cela prolonge la durée de conservation à 2 semaines**. Vendez de la laitue lavée et prête à manger à un prix plus élevé.";
    if (c.includes('broccoli')) return "Ajoutez de la valeur : Coupez en fleurons et vendez frais, ou blanchissez et congelez – **les légumes pré‑découpés se vendent 40% plus cher**. La congélation préserve la qualité pendant 8 mois.";
    if (c.includes('capsicum')) return "Ajoutez de la valeur : Faites du poivron séché, du paprika, ou des poivrons marinés – **le séchage prolonge la durée de conservation à 12 mois et triple le prix**. Les poivrons entiers séchés empêchent les moisissures.";
    if (c.includes('brinjal')) return "Ajoutez de la valeur : Séchez les tranches, faites des pickles, ou vendez des aubergines grillées – **le séchage empêche la pourriture et préserve la saveur**. Les pickles durent plus d'un an.";
    if (c.includes('french beans')) return "Ajoutez de la valeur : Séchez les haricots/pois, ou congelez dans des sacs plastique – **le séchage empêche les moisissures et préserve les protéines, la congélation maintient la qualité**. Les haricots secs se vendent 2 fois plus cher.";
    if (c.includes('avocado')) return "Ajoutez de la valeur : Produisez de l'huile d'avocat – **l'huile conserve les nutriments et se vend 3 fois plus cher**. Séchez des tranches au soleil pour éliminer l'humidité et prévenir la moisissure.";
    if (c.includes('mango')) return "Ajoutez de la valeur : Faites des tranches de mangue séchées – **le séchage arrête la croissance des moisissures et prolonge la durée de conservation à 12+ mois**. Les mangues séchées se vendent 3 fois plus cher.";
    if (c.includes('tomato')) return "Ajoutez de la valeur : Faites des tomates séchées ou de la purée – **le séchage réduit l'humidité, arrête les bactéries, et prolonge la durée de conservation à 6 mois**. Le prix est 2 fois supérieur.";
    return "Ajoutez de la valeur : séchez, broyez, emballez – **le séchage élimine l'humidité qui cause la pourriture, et l'emballage hermétique empêche les insectes**.";
  }
  if (language === 'es') {
    if (c.includes('cabbage')) return "Agregue valor: Haga chucrut o repollo seco – **la fermentación agrega probióticos y conserva 6+ meses, el secado evita la pudrición**. También venda ensalada de col fresca a precio premium.";
    if (c.includes('spinach')) return "Agregue valor: Seque las espinacas y empaque – **las espinacas secas retienen nutrientes y duran 12 meses**. También puede molerlas para obtener polvo de espinaca para papilla nutritiva.";
    if (c.includes('lettuce')) return "Agregue valor: Empaque la lechuga en bolsas perforadas – **esto prolonga la vida útil a 2 semanas**. Venda lechuga lavada y lista para comer a un precio más alto.";
    if (c.includes('broccoli')) return "Agregue valor: Corte en floretes y venda fresco, o escalde y congele – **los vegetales precortados se venden 40% más caro**. La congelación preserva la calidad por 8 meses.";
    if (c.includes('capsicum')) return "Agregue valor: Haga pimiento seco, paprika, o pimientos marinados – **el secado prolonga la vida útil a 12 meses y triplica el precio**. Los pimientos enteros secos evitan el moho.";
    if (c.includes('brinjal')) return "Agregue valor: Seque rodajas, haga encurtidos, o venda berenjenas asadas – **el secado evita la pudrición y preserva el sabor**. Los encurtidos duran más de un año.";
    if (c.includes('french beans')) return "Agregue valor: Seque los frijoles/guisantes, o congele en bolsas de plástico – **el secado evita el moho y preserva las proteínas, la congelación mantiene la calidad**. Los frijoles secos se venden 2 veces más caro.";
    if (c.includes('avocado')) return "Agregue valor: Produzca aceite de aguacate o guacamole – **el aceite conserva los nutrientes y se vende 3 veces más caro**. Seque rodajas al sol para eliminar la humedad y prevenir el moho.";
    if (c.includes('mango')) return "Agregue valor: Haga rodajas de mango seco – **el secado detiene el crecimiento de moho y prolonga la vida útil a 12+ meses**. El mango seco se vende 3 veces más caro que el fresco.";
    if (c.includes('tomato')) return "Agregue valor: Haga tomates secos o puré – **el secado reduce la humedad, detiene las bacterias y prolonga la vida útil a 6 meses**. El precio es 2 veces superior.";
    return "Agregue valor: seque, muela, empaque – **el secado elimina la humedad que causa la pudrición, y el empaque hermético previene los insectos**.";
  }
  // English (default)
  if (c.includes('cabbage') || c.includes('kale')) {
    return "Add value: Make sauerkraut (fermented cabbage) or dried cabbage – **fermentation adds probiotics and preserves for 6+ months, drying stops rot**. Also sell fresh coleslaw mix for premium.";
  }
  if (c.includes('spinach')) {
    return "Add value: Dry spinach and package – **dried spinach retains nutrients and lasts 12 months**. You can also grind into spinach powder for nutritious porridge.";
  }
  if (c.includes('lettuce')) {
    return "Add value: Package lettuce in perforated plastic bags – **this extends shelf life to 2 weeks**. Sell washed, ready‑to‑eat lettuce at a premium.";
  }
  if (c.includes('broccoli') || c.includes('cauliflower')) {
    return "Add value: Cut into florets and sell fresh, or blanch and freeze – **pre‑cut vegetables fetch 40% higher price**. Freezing preserves quality for 8 months.";
  }
  if (c.includes('capsicum') || c.includes('pepper')) {
    return "Add value: Make dried capsicum, paprika powder, or roasted peppers in oil – **drying extends shelf life to 12 months and triples price**. Whole dried capsicums prevent mould.";
  }
  if (c.includes('brinjal') || c.includes('eggplant')) {
    return "Add value: Dry slices, make pickles, or sell grilled eggplants – **drying prevents rot and preserves flavour**. Pickles last over 1 year.";
  }
  if (c.includes('french beans') || c.includes('garden peas')) {
    return "Add value: Dry beans/peas, or freeze in plastic bags – **drying stops mould and preserves protein, freezing retains quality**. Dried beans sell for 2x price.";
  }
  if (c.includes('avocado')) return "Add value: Make avocado oil or guacamole – **oil preserves nutrients and sells for 3x higher price**. Dry slices in the sun to remove moisture and prevent mould.";
  if (c.includes('mango')) return "Add value: Make dried mango slices – **drying stops mould growth and extends shelf life to 12+ months**. Dried mango sells for 3x fresh price.";
  if (c.includes('tomato')) return "Add value: Make sun‑dried tomatoes or paste – **drying reduces moisture, stopping bacteria, and extends shelf life to 6 months**. Price is 2x fresh tomatoes.";
  if (c.includes('cassava')) return "Add value: Make cassava flour – **flour needs no special storage and lasts over 1 year**. Also make chips or starch for industrial use.";
  if (c.includes('banana')) return "Add value: Make banana flour or dried slices – **flour has long shelf life and is used for nutritious porridge**. Dried bananas sell for 2x fresh price.";
  return "Add value: dry, mill, package – **drying removes moisture that causes rot, and good packaging prevents pests**. Processed products sell for 2-3x higher price.";
};

// ========== Crop‑specific cool/dark storage advice ==========
const getCoolDarkStorageAdvice = (crop: string, language: string): string => {
  const c = crop.toLowerCase();
  if (c.includes('onion') || c.includes('garlic')) {
    if (language === 'sw') return "Hifadhi vitunguu mahali pa giza, kavu na baridi (0-2°C) – **mwanga husababisha kuota na kugeuka kijani (solanine), ambayo ina sumu na hupunguza thamani**. Giza pia huzuia ukuaji wa chipukizi.";
    if (language === 'fr') return "Stockez les oignons dans un endroit sombre, sec et frais (0-2°C) – **la lumière provoque la germination et le verdissement (solanine), toxique et réduit la valeur**.";
    if (language === 'es') return "Almacene las cebollas en un lugar oscuro, seco y fresco (0-2°C) – **la luz provoca la germinación y el enverdecimiento (solanina), tóxico y reduce el valor**.";
    return "Store onions in a dark, cool, dry place (0-2°C) – **light triggers sprouting and greening (solanine), which is toxic and reduces market value**. Darkness also prevents sprout growth.";
  }
  if (c.includes('potato')) {
    if (language === 'sw') return "Hifadhi viazi mahali pa giza, baridi (4-8°C) – **mwanga husababisha viazi kuwa kijani kwa sababu ya solanine, sumu inayosababisha kichefuchefu**. Giza huzuia hili na kuongeza maisha ya rafu.";
    if (language === 'fr') return "Stockez les pommes de terre dans l'obscurité, au frais (4-8°C) – **la lumière les fait verdir (solanine), toxique et amère**.";
    if (language === 'es') return "Almacene las papas en un lugar oscuro y fresco (4-8°C) – **la luz causa el enverdecimiento (solanina), una toxina que causa náuseas y amargor**.";
    return "Store potatoes in a dark, cool place (4-8°C) – **light causes greening (solanine), a toxin that causes nausea and bitterness**. Darkness prevents this and extends shelf life.";
  }
  return "";
};

// ========== Crop‑specific storage chemical advice (only for grains) ==========
const getStorageChemicalAdvice = (crop: string, language: string): string => {
  const category = getCropCategory(crop);
  if (category !== 'grains' && category !== 'pulses') return '';
  if (language === 'sw') return "Kwa nafaka, ongeza Actellic Gold 50g kwa gunia la 90kg – **dawa hii huwaua wadudu wazima na mabuu kwa kuvuruga mfumo wao wa neva, lakini haiondoi aflatoxini**. Kausha nafaka hadi unyevu 13% kabla ya matumizi.";
  if (language === 'fr') return "Pour les céréales, ajoutez Actellic Gold 50g par sac de 90 kg – **cet insecticide tue les insectes adultes et les larves en perturbant leur système nerveux, mais n'élimine pas l'aflatoxine**. Séchez les grains à 13% d'humidité d'abord.";
  if (language === 'es') return "Para los granos, agregue Actellic Gold 50g por saco de 90 kg – **este insecticida mata los insectos adultos y las larvas al alterar su sistema nervioso, pero no elimina la aflatoxina**. Seque los granos al 13% de humedad primero.";
  return "For grains, add Actellic Gold 50g per 90kg bag – **this insecticide kills adult insects and larvae by disrupting their nervous system, but does not remove aflatoxin**. Dry grain to 13% moisture first.";
};

// ========== Helper: nutrient description ==========
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
  // English
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

// ========== Helper: format nutrient string ==========
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

// ===== Translation helpers =====
const getCulturalTranslation = (baseKey: string, fallbackText: string): string => {
  const translations = swTranslations as any;
  if (translations[baseKey]) return translations[baseKey];
  const cleanedKey = baseKey.replace(/_[0-9]+(_[0-9]+)*$/, '');
  if (cleanedKey !== baseKey && translations[cleanedKey]) return translations[cleanedKey];
  return fallbackText;
};

const getFrenchCulturalTranslation = (baseKey: string, fallbackText: string): string => {
  const translations = frTranslations as any;
  if (translations[baseKey]) return translations[baseKey];
  const cleanedKey = baseKey.replace(/_[0-9]+(_[0-9]+)*$/, '');
  if (cleanedKey !== baseKey && translations[cleanedKey]) return translations[cleanedKey];
  return fallbackText;
};

const getSpanishCulturalTranslation = (baseKey: string, fallbackText: string): string => {
  const translations = esTranslations as any;
  if (translations[baseKey]) return translations[baseKey];
  const cleanedKey = baseKey.replace(/_[0-9]+(_[0-9]+)*$/, '');
  if (cleanedKey !== baseKey && translations[cleanedKey]) return translations[cleanedKey];
  return fallbackText;
};

const translateRate = (rate: string, lang: string): string => {
  if (lang === 'sw') {
    const map: Record<string, string> = {
      "10ml per 20L water": "10 mililita kwa lita 20 za maji",
      "50g per 20L water": "50 gramu kwa lita 20 za maji",
      "40ml per 20L water": "40 mililita kwa lita 20 za maji",
      "20ml per 20L water": "20 mililita kwa lita 20 za maji",
      "4ml per 20L water": "4 mililita kwa lita 20 za maji",
      "5ml per 20L water": "5 mililita kwa lita 20 za maji",
      "30g per 20L water": "30 gramu kwa lita 20 za maji",
      "15g per 20L water": "15 gramu kwa lita 20 za maji"
    };
    return map[rate] || rate;
  }
  if (lang === 'fr') {
    const map: Record<string, string> = {
      "10ml per 20L water": "10 ml pour 20 L d'eau",
      "50g per 20L water": "50 g pour 20 L d'eau",
      "40ml per 20L water": "40 ml pour 20 L d'eau",
      "20ml per 20L water": "20 ml pour 20 L d'eau",
      "4ml per 20L water": "4 ml pour 20 L d'eau",
      "5ml per 20L water": "5 ml pour 20 L d'eau",
      "30g per 20L water": "30 g pour 20 L d'eau",
      "15g per 20L water": "15 g pour 20 L d'eau"
    };
    return map[rate] || rate;
  }
  if (lang === 'es') {
    const map: Record<string, string> = {
      "10ml per 20L water": "10 ml por 20 L de agua",
      "50g per 20L water": "50 g por 20 L de agua",
      "40ml per 20L water": "40 ml por 20 L de agua",
      "20ml per 20L water": "20 ml por 20 L de agua",
      "4ml per 20L water": "4 ml por 20 L de agua",
      "5ml per 20L water": "5 ml por 20 L de agua",
      "30g per 20L water": "30 g por 20 L de agua",
      "15g per 20L water": "15 g por 20 L de agua"
    };
    return map[rate] || rate;
  }
  return rate;
};

const translateTiming = (timing: string, lang: string): string => {
  if (lang === 'sw') {
    const map: Record<string, string> = {
      "When larvae young (1st-2nd instar)": "Wakati mabuu ni wachanga (1-2)",
      "When larvae young": "Wakati mabuu ni wachanga",
      "At first sign of larvae": "Wakati dalili za mabuu zinaonekana",
      "When larvae active": "Wakati mabuu wanashambulia",
      "When colonies appear": "Wakati makundi yanaonekana",
      "When aphids appear": "Wakati vidukari wanaonekana",
      "When webbing visible": "Wakati utando unaonekana",
      "When flies active": "Wakati nzi wanashambulia",
      "At first sign of disease, repeat every 7-10 days": "Dalili za kwanza za ugonjwa, rudia kila siku 7-10",
      "Every 7-10 days in wet weather": "Kila siku 7-10 wakati wa mvua",
      "At first sign of spots": "Wakati madoa yanaonekana",
      "Preventatively, every 7-10 days": "Kinga, kila siku 7-10",
      "Preventatively": "Kinga"
    };
    return map[timing] || timing;
  }
  if (lang === 'fr') {
    const map: Record<string, string> = {
      "When larvae young (1st-2nd instar)": "Quand les larves sont jeunes (1er-2e stade)",
      "When larvae young": "Quand les larves sont jeunes",
      "At first sign of larvae": "Au premier signe de larves",
      "When larvae active": "Quand les larves sont actives",
      "When colonies appear": "Quand les colonies apparaissent",
      "When aphids appear": "Quand les pucerons apparaissent",
      "When webbing visible": "Quand les toiles sont visibles",
      "When flies active": "Quand les mouches sont actives",
      "At first sign of disease, repeat every 7-10 days": "Au premier signe de maladie, répéter tous les 7-10 jours",
      "Every 7-10 days in wet weather": "Tous les 7-10 jours par temps humide",
      "At first sign of spots": "Au premier signe de taches",
      "Preventatively, every 7-10 days": "Préventivement, tous les 7-10 jours",
      "Preventatively": "Préventivement"
    };
    return map[timing] || timing;
  }
  if (lang === 'es') {
    const map: Record<string, string> = {
      "When larvae young (1st-2nd instar)": "Cuando las larvas son jóvenes (1er-2do estadio)",
      "When larvae young": "Cuando las larvas son jóvenes",
      "At first sign of larvae": "Ante el primer signo de larvas",
      "When larvae active": "Cuando las larvas están activas",
      "When colonies appear": "Cuando aparecen las colonias",
      "When aphids appear": "Cuando aparecen los pulgones",
      "When webbing visible": "Cuando las telarañas son visibles",
      "When flies active": "Cuando las moscas están activas",
      "At first sign of disease, repeat every 7-10 days": "Ante el primer signo de enfermedad, repetir cada 7-10 días",
      "Every 7-10 days in wet weather": "Cada 7-10 días en clima húmedo",
      "At first sign of spots": "Ante el primer signo de manchas",
      "Preventatively, every 7-10 days": "Preventivamente, cada 7-10 días",
      "Preventatively": "Preventivamente"
    };
    return map[timing] || timing;
  }
  return timing;
};

const translateSafety = (safety: string, lang: string): string => {
  if (lang === 'sw') {
    const map: Record<string, string> = {
      "14 days": "siku kumi na nne",
      "7 days": "siku saba",
      "21 days": "siku ishirini na moja",
      "30 days": "siku thelathini",
      "14 days before harvest": "siku kumi na nne kabla ya mavuno",
      "7 days before harvest": "siku saba kabla ya mavuno"
    };
    return map[safety] || safety;
  }
  if (lang === 'fr') {
    const map: Record<string, string> = {
      "14 days": "14 jours",
      "7 days": "7 jours",
      "21 days": "21 jours",
      "30 days": "30 jours",
      "14 days before harvest": "14 jours avant la récolte",
      "7 days before harvest": "7 jours avant la récolte"
    };
    return map[safety] || safety;
  }
  if (lang === 'es') {
    const map: Record<string, string> = {
      "14 days": "14 días",
      "7 days": "7 días",
      "21 days": "21 días",
      "30 days": "30 días",
      "14 days before harvest": "14 días antes de la cosecha",
      "7 days before harvest": "7 días antes de la cosecha"
    };
    return map[safety] || safety;
  }
  return safety;
};

const translateStatus = (status: string, lang: string): string => {
  if (lang === 'sw') {
    const map: Record<string, string> = {
      "✅ Active": "✅ Inatumika",
      "⚠️ RESTRICTED": "⚠️ IMERESTRISHWA",
      "❌ BANNED": "❌ IMEPIGWA MARUFUKU",
      "check-locally": "Angalia upatikanaji"
    };
    return map[status] || status;
  }
  if (lang === 'fr') {
    const map: Record<string, string> = {
      "✅ Active": "✅ Actif",
      "⚠️ RESTRICTED": "⚠️ RESTREINT",
      "❌ BANNED": "❌ INTERDIT",
      "check-locally": "Vérifiez la disponibilité locale"
    };
    return map[status] || status;
  }
  if (lang === 'es') {
    const map: Record<string, string> = {
      "✅ Active": "✅ Activo",
      "⚠️ RESTRICTED": "⚠️ RESTRINGIDO",
      "❌ BANNED": "❌ PROHIBIDO",
      "check-locally": "Verifique disponibilidad local"
    };
    return map[status] || status;
  }
  return status;
};

const translateOrganic = (text: string, lang: string): string => {
  if (lang === 'sw') {
    const map: Record<string, string> = {
      "Mix 50ml neem oil with 20L water + few drops liquid soap": "Changanya 50 mililita mafuta ya mwarobaini na lita 20 za maji + matone machache ya sabuni",
      "50ml neem oil per 20L water": "50 mililita mafuta ya mwarobaini kwa lita 20 za maji",
      "Spray every 10-14 days": "Pulizia kila siku 10-14",
      "Spray every 7-10 days": "Pulizia kila siku 7-10",
      "Spray on affected plants": "Pulizia kwenye mimea iliyoathirika",
      "Cover beds with insect netting": "Funika vitanda kwa nyavu za wadudu",
      "Install at planting, remove at harvest": "Weka wakati wa kupanda, ondoa wakati wa mavuno",
      "Plant onions or garlic between rows": "Panda vitunguu kati ya mistari",
      "Repels rust flies": "Huzuia nzi wa karoti",
      "Follow label instructions": "Fuata maagizo kwenye lebo",
      "Collect ladybirds from wild or purchase": "Kusanya kunguru porini au nunua",
      "Introduce ladybirds": "Weka kunguru",
      "Release 10-20 per plant": "Achia 10-20 kwa kila mmea",
      "Apply neem cake to soil": "Weka keki ya mwarobaini kwenye udongo",
      "200kg per acre before planting": "Kilo 200 kwa ekari kabla ya kupanda",
      "Plant marigolds before carrots": "Panda marigold kabla ya karoti",
      "Grow for one season, incorporate into soil": "Kua kwa msimu mmoja, changanya kwenye udongo",
      "Cover soil with clear plastic": "Funika udongo kwa plastiki wazi",
      "4-6 weeks during hot season": "Wiki 4-6 wakati wa joto",
      "Use yellow sticky traps": "Tumia mitego ya manjano yenye kunata",
      "Remove heavily infested leaves": "Ondoa majani yaliyoathirika sana",
      "Avoid excess nitrogen fertilizer which attracts aphids": "Epuka mbolea ya nitrojeni nyingi kwa sababu huvutia vidukari",
      "Handpicking": "Kukusanya kwa mkono",
      "Hand removal": "Kuondoa kwa mkono",
      "Hand removal (weekly)": "Kuondoa kwa mkono (kila wiki)",
      "Collect larvae in evening": "Kusanya mabuu jioni",
      "Drop in soapy water": "Weka kwenye maji ya sabuni",
      "Neem spray": "Pulizia ya mwarobaini",
      "Soap solution": "Suluhisho la sabuni",
      "Floating row covers": "Vifuniko vya safu",
      "Companion planting": "Upandaji pamoja",
      "Marigold rotation": "Mzunguko wa marigold",
      "Neem cake": "Keki ya mwarobaini",
      "Solarization": "Kutia jua",
      "Mix 2 tablespoons liquid soap in 5L water": "Changanya vijiko 2 vya sabuni kwa lita 5 za maji",
      "Spray directly on aphids": "Pulizia moja kwa moja kwenye vidukari"
    };
    return map[text] || text;
  }
  if (lang === 'fr') {
    const map: Record<string, string> = {
      "Mix 50ml neem oil with 20L water + few drops liquid soap": "Mélanger 50 ml d'huile de neem avec 20 L d'eau + quelques gouttes de savon liquide",
      "50ml neem oil per 20L water": "50 ml d'huile de neem pour 20 L d'eau",
      "Spray every 10-14 days": "Pulvériser tous les 10-14 jours",
      "Spray every 7-10 days": "Pulvériser tous les 7-10 jours",
      "Spray on affected plants": "Pulvériser sur les plantes affectées",
      "Cover beds with insect netting": "Couvrir les planches avec une moustiquaire",
      "Install at planting, remove at harvest": "Installer à la plantation, retirer à la récolte",
      "Plant onions or garlic between rows": "Planter des oignons ou de l'ail entre les rangs",
      "Repels rust flies": "Repousse les mouches de la rouille",
      "Follow label instructions": "Suivre les instructions sur l'étiquette",
      "Collect ladybirds from wild or purchase": "Collecter des coccinelles dans la nature ou en acheter",
      "Introduce ladybirds": "Introduire des coccinelles",
      "Release 10-20 per plant": "Lâcher 10-20 par plante",
      "Apply neem cake to soil": "Appliquer du tourteau de neem sur le sol",
      "200kg per acre before planting": "200 kg par acre avant la plantation",
      "Plant marigolds before carrots": "Planter des œillets d'Inde avant les carottes",
      "Grow for one season, incorporate into soil": "Cultiver pendant une saison, incorporer au sol",
      "Cover soil with clear plastic": "Couvrir le sol avec du plastique transparent",
      "4-6 weeks during hot season": "4-6 semaines pendant la saison chaude",
      "Use yellow sticky traps": "Utiliser des pièges jaunes collants",
      "Remove heavily infested leaves": "Retirer les feuilles fortement infestées",
      "Avoid excess nitrogen fertilizer which attracts aphids": "Éviter l'excès d'engrais azoté qui attire les pucerons",
      "Handpicking": "Cueillette manuelle",
      "Hand removal": "Retrait manuel",
      "Hand removal (weekly)": "Retrait manuel (hebdomadaire)",
      "Collect larvae in evening": "Collecter les larves le soir",
      "Drop in soapy water": "Plonger dans de l'eau savonneuse",
      "Neem spray": "Pulvérisation de neem",
      "Soap solution": "Solution savonneuse",
      "Floating row covers": "Couvertures flottantes",
      "Companion planting": "Culture associée",
      "Marigold rotation": "Rotation avec œillets d'Inde",
      "Neem cake": "Tourteau de neem",
      "Solarization": "Solarisation",
      "Mix 2 tablespoons liquid soap in 5L water": "Mélanger 2 cuillères à soupe de savon liquide dans 5 L d'eau",
      "Spray directly on aphids": "Pulvériser directement sur les pucerons",
      "Spray when larvae are young; safe for beneficial insects": "Pulvériser quand les larves sont jeunes ; sans danger pour les insectes utiles",
      "Spray when larvae young": "Pulvériser quand les larves sont jeunes",
      "Purchase DBM pheromone lures": "Achetez des leurres à phéromones de la teigne des crucifères",
      "Place 4-6 traps per acre for monitoring, 10-12 for mass trapping": "Placez 4-6 pièges par acre pour la surveillance, 10-12 pour le piégeage de masse",
      "Remove and destroy webbed leaves": "Retirer et détruire les feuilles toilées",
      "Weekly": "Hebdomadaire"
    };
    return map[text] || text;
  }
  if (lang === 'es') {
    const map: Record<string, string> = {
      "Mix 50ml neem oil with 20L water + few drops liquid soap": "Mezcle 50 ml de aceite de neem con 20 L de agua + unas gotas de jabón líquido",
      "50ml neem oil per 20L water": "50 ml de aceite de neem por 20 L de agua",
      "Spray every 10-14 days": "Pulverice cada 10-14 días",
      "Spray every 7-10 days": "Pulverice cada 7-10 días",
      "Spray on affected plants": "Pulverice sobre las plantas afectadas",
      "Cover beds with insect netting": "Cubra las camas con malla anti-insectos",
      "Install at planting, remove at harvest": "Instale en la siembra, retire en la cosecha",
      "Plant onions or garlic between rows": "Plante cebollas o ajo entre las filas",
      "Repels rust flies": "Repela las moscas de la roya",
      "Follow label instructions": "Siga las instrucciones de la etiqueta",
      "Collect ladybirds from wild or purchase": "Recoja mariquitas silvestres o compre",
      "Introduce ladybirds": "Introduzca mariquitas",
      "Release 10-20 per plant": "Suelte 10-20 por planta",
      "Apply neem cake to soil": "Aplique torta de neem al suelo",
      "200kg per acre before planting": "200 kg por acre antes de la siembra",
      "Plant marigolds before carrots": "Plante caléndulas antes que las zanahorias",
      "Grow for one season, incorporate into soil": "Cultive por una temporada, incorpore al suelo",
      "Cover soil with clear plastic": "Cubra el suelo con plástico transparente",
      "4-6 weeks during hot season": "4-6 semanas durante la temporada cálida",
      "Use yellow sticky traps": "Use trampas adhesivas amarillas",
      "Remove heavily infested leaves": "Retire las hojas muy infestadas",
      "Avoid excess nitrogen fertilizer which attracts aphids": "Evite el exceso de fertilizante nitrogenado que atrae a los pulgones",
      "Handpicking": "Recolección manual",
      "Hand removal": "Eliminación manual",
      "Hand removal (weekly)": "Eliminación manual (semanal)",
      "Collect larvae in evening": "Recoja las larvas por la tarde",
      "Drop in soapy water": "Sumérjalas en agua jabonosa",
      "Neem spray": "Pulverización de neem",
      "Soap solution": "Solución jabonosa",
      "Floating row covers": "Cubiertas flotantes para hileras",
      "Companion planting": "Siembra asociada",
      "Marigold rotation": "Rotación con caléndulas",
      "Neem cake": "Torta de neem",
      "Solarization": "Solarización",
      "Mix 2 tablespoons liquid soap in 5L water": "Mezcle 2 cucharadas de jabón líquido en 5 L de agua",
      "Spray directly on aphids": "Pulverice directamente sobre los pulgones",
      "Spray when larvae are young; safe for beneficial insects": "Pulverice cuando las larvas son jóvenes; seguro para insectos benéficos",
      "Spray when larvae young": "Pulverice cuando las larvas son jóvenes",
      "Purchase DBM pheromone lures": "Compre cebos de feromonas para polilla de la col",
      "Place 4-6 traps per acre for monitoring, 10-12 for mass trapping": "Coloque 4-6 trampas por acre para monitoreo, 10-12 para captura masiva",
      "Remove and destroy webbed leaves": "Retire y destruya las hojas telarañadas",
      "Weekly": "Semanalmente"
    };
    return map[text] || text;
  }
  return text;
};

const translateNote = (note: string, lang: string): string => {
  if (lang === 'sw') {
    const map: Record<string, string> = {
      "Highly effective, rotate with other products": "Inafanya kazi vizuri, badilisha bidhaa",
      "⚠️ BANNED in Tanzania (Jan 2026). Check local regulations before recommending.": "⚠️ IMEPIGWA MARUFUKU Tanzania (Jan 2026). Angalia sheria za eneo lako kabla ya kupendekeza."
    };
    return map[note] || note;
  }
  if (lang === 'fr') {
    const map: Record<string, string> = {
      "Highly effective, rotate with other products": "Très efficace, alternez avec d'autres produits",
      "⚠️ BANNED in Tanzania (Jan 2026). Check local regulations before recommending.": "⚠️ INTERDIT en Tanzanie (janv. 2026). Vérifiez la réglementation locale avant de recommander."
    };
    return map[note] || note;
  }
  if (lang === 'es') {
    const map: Record<string, string> = {
      "Highly effective, rotate with other products": "Muy eficaz, alterne con otros productos",
      "⚠️ BANNED in Tanzania (Jan 2026). Check local regulations before recommending.": "⚠️ PROHIBIDO en Tanzania (ene. 2026). Verifique la normativa local antes de recomendar."
    };
    return map[note] || note;
  }
  return note;
};

// ========== MAIN generateRecommendations FUNCTION ==========
export async function generateRecommendations(input: RecommendationInput): Promise<RecommendationOutput> {
  const structuredList: RecommendationItem[] = [];
  const { hasSoilTest, soilAnalysis, fertilizerPlan, crop, farmerData } = input;
  const lowerCrop = crop.toLowerCase();
  const country = farmerData.country || 'kenya';
  const language = farmerData.language || 'en';
  const isSwahili = language === 'sw';
  const isFrench = language === 'fr';
  const isSpanish = language === 'es';

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

    const ph = soilAnalysis.ph !== undefined && soilAnalysis.ph !== null && soilAnalysis.ph !== 0 ? soilAnalysis.ph : '?';
    const phRating = soilAnalysis.phRating || '';
    const phosphorus = soilAnalysis.phosphorus !== undefined && soilAnalysis.phosphorus !== null && soilAnalysis.phosphorus !== 0 ? soilAnalysis.phosphorus : '?';
    const phosphorusRating = soilAnalysis.phosphorusRating || '';
    const potassium = soilAnalysis.potassium !== undefined && soilAnalysis.potassium !== null && soilAnalysis.potassium !== 0 ? soilAnalysis.potassium : '?';
    const potassiumRating = soilAnalysis.potassiumRating || '';
    const calcium = soilAnalysis.calcium !== undefined && soilAnalysis.calcium !== null && soilAnalysis.calcium !== 0 ? soilAnalysis.calcium : '?';
    const calciumRating = soilAnalysis.calciumRating || '';
    const magnesium = soilAnalysis.magnesium !== undefined && soilAnalysis.magnesium !== null && soilAnalysis.magnesium !== 0 ? soilAnalysis.magnesium : '?';
    const magnesiumRating = soilAnalysis.magnesiumRating || '';
    const totalNitrogen = soilAnalysis.totalNitrogen !== undefined && soilAnalysis.totalNitrogen !== null && soilAnalysis.totalNitrogen !== 0 ? soilAnalysis.totalNitrogen : '?';
    const totalNitrogenRating = soilAnalysis.totalNitrogenRating || '';
    const organicMatter = soilAnalysis.organicMatter !== undefined && soilAnalysis.organicMatter !== null && soilAnalysis.organicMatter !== 0 ? soilAnalysis.organicMatter : '?';
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
        insight: isSwahili
          ? safeT(SW.soil_business_insight, `BUSINESS INSIGHT: Kila ${currencySymbol}1 unayowekeza katika urekebishaji wa udongo hukurejeshea ${currencySymbol}3-5 kwa mavuno makubwa!`, currencySymbol)
          : isFrench
            ? safeT(FR.soil_business_insight, `BUSINESS INSIGHT: Chaque ${currencySymbol}1 investi dans la correction du sol rapporte ${currencySymbol}3-5 en rendements plus élevés!`, currencySymbol)
            : isSpanish
              ? safeT(ES.soil_business_insight, `PERSPECTIVA DE NEGOCIO: ¡Cada ${currencySymbol}1 invertido en corrección del suelo retorna ${currencySymbol}3-5 en mayores rendimientos!`, currencySymbol)
              : `BUSINESS INSIGHT: Every ${currencySymbol}1 invested in soil correction returns ${currencySymbol}3-5 in higher yields!`,
        yearly: isSwahili ? SW.soil_test_yearly : isFrench ? FR.soil_test_yearly : isSpanish ? ES.soil_test_yearly : 'TEST SOIL YEARLY to track improvements and adjust inputs.',
        symbol: currencySymbol,
        ph, phRating, phosphorus, phosphorusRating, potassium, potassiumRating,
        calcium, calciumRating, magnesium, magnesiumRating, totalNitrogen, totalNitrogenRating, organicMatter, organicMatterRating,
      }
    });
  }

  // ========== GROUP 2: CALCITIC LIME ==========
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
      if (soilAnalysis && soilAnalysis.ph < 5.5 && soilAnalysis.calcium && soilAnalysis.calcium < 400) {
        whyText = safeT(FR.calcitic_lime_why_acidic_low_ca, `Pourquoi : Votre pH est ${soilAnalysis.ph} (acide) et votre calcium est faible (${soilAnalysis.calcium} ppm). La chaux calcique résout les deux problèmes !`, soilAnalysis.ph, soilAnalysis.calcium);
      } else if (soilAnalysis && soilAnalysis.ph < 5.5) {
        whyText = safeT(FR.calcitic_lime_why_acidic, `Pourquoi : Votre pH est ${soilAnalysis.ph} (acide). La chaux calcique augmentera le pH et ajoutera du calcium.`, soilAnalysis.ph);
      } else if (soilAnalysis && soilAnalysis.calcium && soilAnalysis.calcium < 400) {
        whyText = safeT(FR.calcitic_lime_why_low_ca, `Pourquoi : Votre calcium est faible (${soilAnalysis.calcium} ppm). La chaux calcique ajoute du calcium sans ajouter de magnésium.`, soilAnalysis.calcium);
      }
    } else if (isSpanish) {
      if (soilAnalysis && soilAnalysis.ph < 5.5 && soilAnalysis.calcium && soilAnalysis.calcium < 400) {
        whyText = safeT(ES.calcitic_lime_why_acidic_low_ca, `Por qué: Su pH es ${soilAnalysis.ph} (ácido) y su calcio es bajo (${soilAnalysis.calcium} ppm). ¡La cal calcítica resuelve ambos problemas!`, soilAnalysis.ph, soilAnalysis.calcium);
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

    structuredList.push({
      key: 'calcitic_lime_grouped',
      params: {
        title: isSwahili ? SW.calcitic_lime_title : isFrench ? FR.calcitic_lime_title : isSpanish ? ES.calcitic_lime_title : 'CALCITIC LIME RECOMMENDATION FROM YOUR SOIL TEST',
        need: isSwahili ? safeT(SW.calcitic_lime_need, `Kulingana na uchambuzi wako wa udongo, unahitaji ${limeKg} kg ya chokaa kwa ekari.`, limeKg) : isFrench ? safeT(FR.calcitic_lime_need, `Selon votre analyse de sol, vous avez besoin de ${limeKg} kg de chaux par acre.`, limeKg) : isSpanish ? safeT(ES.calcitic_lime_need, `Según su análisis de suelo, necesita ${limeKg} kg de cal por acre.`, limeKg) : `Based on your soil test, you need ${limeKg} kg of calcitic lime per acre.`,
        bags: isSwahili ? safeT(SW.calcitic_lime_bags, `Hii ni magunia ${bagsNeeded} ya 50kg.`, bagsNeeded) : isFrench ? safeT(FR.calcitic_lime_bags, `Cela représente ${bagsNeeded} sacs de 50 kg.`, bagsNeeded) : isSpanish ? safeT(ES.calcitic_lime_bags, `Esto es ${bagsNeeded} sacos de 50 kg.`, bagsNeeded) : `This is ${bagsNeeded} bags of 50kg.`,
        cost: isSwahili ? safeT(SW.calcitic_lime_cost, `Gharama: ${formatCurrency(totalCost)} (${formatCurrency(limePricePerBag)} kwa gunia)`, formatCurrency(totalCost), formatCurrency(limePricePerBag)) : isFrench ? safeT(FR.calcitic_lime_cost, `Coût : ${formatCurrency(totalCost)} (${formatCurrency(limePricePerBag)} par sac)`, formatCurrency(totalCost), formatCurrency(limePricePerBag)) : isSpanish ? safeT(ES.calcitic_lime_cost, `Costo: ${formatCurrency(totalCost)} (${formatCurrency(limePricePerBag)} por saco)`, formatCurrency(totalCost), formatCurrency(limePricePerBag)) : `Cost: ${formatCurrency(totalCost)} (${formatCurrency(limePricePerBag)} per bag)`,
        why: whyText,
        application: isSwahili ? safeT(SW.calcitic_lime_application, "Weka wiki 3-4 kabla ya kupanda na uchanganye kwenye sentimita 10-15 za juu za udongo.") : isFrench ? safeT(FR.calcitic_lime_application, "Appliquez 3-4 semaines avant la plantation et incorporez dans les 10-15 cm supérieurs du sol.") : isSpanish ? safeT(ES.calcitic_lime_application, "Aplique 3-4 semanas antes de la siembra e incorpore en los primeros 10-15 cm de suelo.") : 'Apply 3-4 weeks before planting and incorporate into top 10-15cm soil.',
        wait: isSwahili ? safeT(SW.calcitic_lime_wait, "Subiri wiki 1-2 kabla ya kutumia mbolea za nitrojeni.") : isFrench ? safeT(FR.calcitic_lime_wait, "Attendez 1-2 semaines avant d'appliquer des engrais azotés.") : isSpanish ? safeT(ES.calcitic_lime_wait, "Espere 1-2 semanas antes de aplicar fertilizantes nitrogenados.") : 'Wait 1-2 weeks before applying nitrogen fertilizers.',
        business: isSwahili ? safeT(SW.calcitic_lime_business_case, "FAIDA YA BIASHARA: pH sahihi inaweza kuongeza unyonyaji wa virutubisho kwa 30-50%!") : isFrench ? safeT(FR.calcitic_lime_business_case, "AVANTAGE COMMERCIAL : Un pH correct peut augmenter l'absorption des nutriments de 30 à 50 % !") : isSpanish ? safeT(ES.calcitic_lime_business_case, "CASO DE NEGOCIO: ¡El pH adecuado puede aumentar la absorción de nutrientes en un 30-50%!") : 'BUSINESS CASE: Proper pH can increase nutrient uptake by 30-50%!',
        yearly: isSwahili ? safeT(SW.soil_test_yearly_reapply, "CHUNGUZA UDONGO KILA MWAKA kujua wakati wa kurudia.") : isFrench ? safeT(FR.soil_test_yearly_reapply, "ANALYSEZ LE SOL CHAQUE ANNÉE pour savoir quand renouveler l'application.") : isSpanish ? safeT(ES.soil_test_yearly_reapply, "ANALICE EL SUELO ANUALMENTE para saber cuándo reaplicar.") : 'TEST SOIL YEARLY to know when to reapply.',
        kg: limeKg, bags: bagsNeeded, total: formatCurrency(totalCost), perBag: formatCurrency(limePricePerBag), ph: soilAnalysis?.ph, ca: soilAnalysis?.calcium
      }
    });
  }

  // ========== DOLOMITIC LIME RECOMMENDATION ==========
  if (hasSoilTest && soilAnalysis) {
    const autoDolomitic = soilTestInterpreter.getDolomiticLimeRecommendation(soilAnalysis);
    let dolomiticNeeded = autoDolomitic.needed;
    let limeKg = autoDolomitic.kgPerAcre;

    if (farmerData.recDolomiticLime && farmerData.recDolomiticLime > 0) {
      limeKg = farmerData.recDolomiticLime;
      dolomiticNeeded = true;
    }

    if (dolomiticNeeded) {
      const dolomiticPricePerBag = farmerData.dolomiticLimePricePerBag || farmerData.limePricePerBag || 300;
      const bagsNeeded = Math.ceil(limeKg / 50);
      const totalCost = bagsNeeded * dolomiticPricePerBag;
      let whyText = autoDolomitic.reason;
      if (farmerData.recDolomiticLime && farmerData.recDolomiticLime > 0) {
        whyText = `You specified a custom rate of ${limeKg} kg/acre. ${autoDolomitic.reason}`;
      }

      const replacePlaceholdersLocal = (template: string, params: Record<string, string | number>) => {
        let result = template;
        for (const [key, value] of Object.entries(params)) {
          result = result.replace(new RegExp(`{{${key}}}`, 'g'), value.toString());
        }
        return result;
      };

      let title, need, bagsText, costText, application, wait, business, yearly;
      if (isSwahili) {
        title = SW.dolomitic_lime_title;
        need = replacePlaceholdersLocal(SW.dolomitic_lime_need, { kg: limeKg });
        bagsText = replacePlaceholdersLocal(SW.dolomitic_lime_bags, { bags: bagsNeeded });
        costText = replacePlaceholdersLocal(SW.dolomitic_lime_cost, { total: formatCurrency(totalCost), perBag: formatCurrency(dolomiticPricePerBag) });
        application = SW.dolomitic_lime_application;
        wait = SW.dolomitic_lime_wait;
        business = SW.dolomitic_lime_business_case;
        yearly = SW.dolomitic_lime_yearly;
      } else if (isFrench) {
        title = FR.dolomitic_lime_title;
        need = replacePlaceholdersLocal(FR.dolomitic_lime_need, { kg: limeKg });
        bagsText = replacePlaceholdersLocal(FR.dolomitic_lime_bags, { bags: bagsNeeded });
        costText = replacePlaceholdersLocal(FR.dolomitic_lime_cost, { total: formatCurrency(totalCost), perBag: formatCurrency(dolomiticPricePerBag) });
        application = FR.dolomitic_lime_application;
        wait = FR.dolomitic_lime_wait;
        business = FR.dolomitic_lime_business_case;
        yearly = FR.dolomitic_lime_yearly;
      } else if (isSpanish) {
        title = ES.dolomitic_lime_title;
        need = replacePlaceholdersLocal(ES.dolomitic_lime_need, { kg: limeKg });
        bagsText = replacePlaceholdersLocal(ES.dolomitic_lime_bags, { bags: bagsNeeded });
        costText = replacePlaceholdersLocal(ES.dolomitic_lime_cost, { total: formatCurrency(totalCost), perBag: formatCurrency(dolomiticPricePerBag) });
        application = ES.dolomitic_lime_application;
        wait = ES.dolomitic_lime_wait;
        business = ES.dolomitic_lime_business_case;
        yearly = ES.dolomitic_lime_yearly;
      } else {
        title = "DOLOMITIC LIME RECOMMENDATION FROM YOUR SOIL TEST";
        need = `Based on your soil test, you need ${limeKg} kg of dolomitic lime per acre.`;
        bagsText = `This is ${bagsNeeded} bags of 50kg.`;
        costText = `Cost: ${formatCurrency(totalCost)} (${formatCurrency(dolomiticPricePerBag)} per bag)`;
        application = "Apply 3-4 weeks before planting and incorporate into top 10-15cm soil.";
        wait = "Wait 1-2 weeks before applying nitrogen fertilizers.";
        business = "BUSINESS CASE: Proper magnesium improves chlorophyll synthesis and photosynthesis!";
        yearly = "TEST SOIL YEARLY to know when to reapply.";
      }

      structuredList.push({
        key: 'dolomitic_lime_grouped',
        params: { title, need, bags: bagsText, cost: costText, why: whyText, application, wait, business, yearly, kg: limeKg, bags: bagsNeeded, total: formatCurrency(totalCost), perBag: formatCurrency(dolomiticPricePerBag), mg: soilAnalysis?.magnesium, caMgRatio: soilAnalysis?.calcium && soilAnalysis?.magnesium ? (soilAnalysis.calcium / soilAnalysis.magnesium).toFixed(1) : undefined }
      });
    }
  }

  // ========== GROUP 3: FERTILIZER PLAN HEADER ==========
  if (hasSoilTest && fertilizerPlan) {
    structuredList.push({
      key: 'fertilizer_header_grouped',
      params: {
        title: isSwahili ? safeT(SW.fertilizer_plan_title, `MPANGO SAHIHI WA UWEKEZAJI WA MBOLEA kwa BIASHARA yako ya ${crop.toUpperCase()}`, crop) : isFrench ? safeT(FR.fertilizer_plan_title, `PLAN D'INVESTISSEMENT EN ENGRAIS DE PRÉCISION pour votre entreprise de ${crop.toUpperCase()}`, crop) : isSpanish ? safeT(ES.fertilizer_plan_title, `PLAN DE INVERSIÓN EN FERTILIZANTE DE PRECISIÓN para tu EMPRESA de ${crop.toUpperCase()}`, crop) : `PRECISION FERTILIZER INVESTMENT PLAN for your ${crop.toUpperCase()} ENTERPRISE`,
        farmSize: isSwahili ? safeT(SW.fertilizer_plan_farm_size, `Ukubwa wa shamba lako: ${fertilizerPlan.farmSize} ekari`, fertilizerPlan.farmSize) : isFrench ? safeT(FR.fertilizer_plan_farm_size, `La taille de votre ferme: ${fertilizerPlan.farmSize} acre(s)`, fertilizerPlan.farmSize) : isSpanish ? safeT(ES.fertilizer_plan_farm_size, `El tamaño de su finca: ${fertilizerPlan.farmSize} acre(s)`, fertilizerPlan.farmSize) : `Your farm size: ${fertilizerPlan.farmSize} acre(s)`,
        totalInvestment: isSwahili ? safeT(SW.fertilizer_plan_total_investment, `JUMLA YA UWEKEZAJI WA MBOLEA: ${formatCurrency(fertilizerPlan.totalCost || 0)} kwa shamba lako zima`, formatCurrency(fertilizerPlan.totalCost || 0)) : isFrench ? safeT(FR.fertilizer_plan_total_investment, `INVESTISSEMENT TOTAL EN ENGRAIS: ${formatCurrency(fertilizerPlan.totalCost || 0)} pour l'ensemble de votre ferme`, formatCurrency(fertilizerPlan.totalCost || 0)) : isSpanish ? safeT(ES.fertilizer_plan_total_investment, `INVERSIÓN TOTAL EN FERTILIZANTE: ${formatCurrency(fertilizerPlan.totalCost || 0)} para toda su finca`, formatCurrency(fertilizerPlan.totalCost || 0)) : `TOTAL FERTILIZER INVESTMENT: ${formatCurrency(fertilizerPlan.totalCost || 0)} for your entire farm`,
        crop: crop.toUpperCase(), size: fertilizerPlan.farmSize, amount: formatCurrency(fertilizerPlan.totalCost || 0)
      }
    });
  } else if (hasSoilTest) {
    structuredList.push({
      key: 'fertilizer_header_grouped',
      params: {
        title: isSwahili ? safeT(SW.fertilizer_plan_title, `MPANGO SAHIHI WA UWEKEZAJI WA MBOLEA kwa BIASHARA yako ya ${crop.toUpperCase()}`, crop) : isFrench ? safeT(FR.fertilizer_plan_title, `PLAN D'INVESTISSEMENT EN ENGRAIS DE PRÉCISION pour votre entreprise de ${crop.toUpperCase()}`, crop) : isSpanish ? safeT(ES.fertilizer_plan_title, `PLAN DE INVERSIÓN EN FERTILIZANTE DE PRECISIÓN para tu EMPRESA de ${crop.toUpperCase()}`, crop) : `PRECISION FERTILIZER INVESTMENT PLAN for your ${crop.toUpperCase()} ENTERPRISE`,
        farmSize: isSwahili ? safeT(SW.fertilizer_plan_farm_size, `Ukubwa wa shamba lako: 1 ekari`, 1) : isFrench ? safeT(FR.fertilizer_plan_farm_size, `La taille de votre ferme: 1 acre(s)`, 1) : isSpanish ? safeT(ES.fertilizer_plan_farm_size, `El tamaño de su finca: 1 acre(s)`, 1) : `Your farm size: 1 acre(s)`,
        totalInvestment: isSwahili ? safeT(SW.fertilizer_plan_total_investment, `JUMLA YA UWEKEZAJI WA MBOLEA: ${formatCurrency(0)} kwa shamba lako zima`, formatCurrency(0)) : isFrench ? safeT(FR.fertilizer_plan_total_investment, `INVESTISSEMENT TOTAL EN ENGRAIS: ${formatCurrency(0)} pour l'ensemble de votre ferme`, formatCurrency(0)) : isSpanish ? safeT(ES.fertilizer_plan_total_investment, `INVERSIÓN TOTAL EN FERTILIZANTE: ${formatCurrency(0)} para toda su finca`, formatCurrency(0)) : `TOTAL FERTILIZER INVESTMENT: ${formatCurrency(0)} for your entire farm`,
        crop: crop.toUpperCase(), size: 1, amount: formatCurrency(0)
      }
    });
  }

  // ========== GROUP 4: PLANTING FERTILIZERS ==========
  if (hasSoilTest && fertilizerPlan && fertilizerPlan.plantingRecommendations?.length > 0) {
    const plantingLines: string[] = [];
    plantingLines.push(isSwahili ? SW.fertilizer_planting_section : isFrench ? FR.fertilizer_planting_section : isSpanish ? ES.fertilizer_planting_section : 'PLANTING FERTILIZERS (apply at planting)');
    fertilizerPlan.plantingRecommendations.forEach((rec: any) => {
      const bagsNeeded = Math.floor(rec.amountKg / 50);
      const extraKg = rec.amountKg % 50;
      const cost = Math.round(rec.amountKg * (rec.pricePer50kg / 50));
      const providesParts = [];
      if (rec.provides.n > 0) providesParts.push(`${rec.provides.n.toFixed(1)} kg N`);
      if (rec.provides.p > 0) providesParts.push(`${rec.provides.p.toFixed(1)} kg P`);
      if (rec.provides.k > 0) providesParts.push(`${rec.provides.k.toFixed(1)} kg K`);
      const providesText = providesParts.map(part => {
        const match = part.match(/([\d.]+) kg ([NPK])/);
        if (match) {
          const amount = match[1];
          const nutrient = match[2];
          const desc = getNutrientDescription(nutrient, language);
          return `${amount} kg ${nutrient} ${desc ? `(${desc})` : ''}`;
        }
        return part;
      }).join(', ');
      if (isSwahili) {
        plantingLines.push(
          `Nunua ${rec.amountKg} kg za ${rec.brand} (${rec.npk})`,
          `Hii ni magunia ${bagsNeeded} ya 50kg + ${extraKg}kg fungua`,
          `Gharama: ${formatCurrency(cost)}`,
          `Inatoa: ${providesText}`
        );
        if (soilAnalysis?.plantingFertilizerNutrients) {
          const nutrientText = formatNutrientString(soilAnalysis.plantingFertilizerNutrients, language);
          if (nutrientText) plantingLines.push(nutrientText);
        }
        plantingLines.push(``);
      } else if (isFrench) {
        plantingLines.push(
          `Achetez ${rec.amountKg} kg de ${rec.brand} (${rec.npk})`,
          `C'est ${bagsNeeded} sac(s) de 50kg + ${extraKg}kg ouvert`,
          `Coût: ${formatCurrency(cost)}`,
          `Fournit: ${providesText}`
        );
        if (soilAnalysis?.plantingFertilizerNutrients) {
          const nutrientText = formatNutrientString(soilAnalysis.plantingFertilizerNutrients, language);
          if (nutrientText) plantingLines.push(nutrientText);
        }
        plantingLines.push(``);
      } else if (isSpanish) {
        plantingLines.push(
          `Compre ${rec.amountKg} kg de ${rec.brand} (${rec.npk})`,
          `Esto es ${bagsNeeded} saco(s) de 50kg + ${extraKg}kg sueltos`,
          `Costo: ${formatCurrency(cost)}`,
          `Proporciona: ${providesText}`
        );
        if (soilAnalysis?.plantingFertilizerNutrients) {
          const nutrientText = formatNutrientString(soilAnalysis.plantingFertilizerNutrients, language);
          if (nutrientText) plantingLines.push(nutrientText);
        }
        plantingLines.push(``);
      } else {
        plantingLines.push(
          `Buy ${rec.amountKg} kg of ${rec.brand} (${rec.npk})`,
          `This is ${bagsNeeded} bag(s) of 50kg + ${extraKg}kg open`,
          `Cost: ${formatCurrency(cost)}`,
          `Provides: ${providesText}`
        );
        if (soilAnalysis?.plantingFertilizerNutrients) {
          const nutrientText = formatNutrientString(soilAnalysis.plantingFertilizerNutrients, language);
          if (nutrientText) plantingLines.push(nutrientText);
        }
        plantingLines.push(``);
      }
    });
    structuredList.push({ key: 'planting_fertilizers_grouped', params: { content: plantingLines.join('\n') } });
  } else if (hasSoilTest) {
    structuredList.push({ key: 'planting_fertilizers_grouped', params: { content: isSwahili ? SW.fertilizer_planting_section + '\n(Hakuna mapendekezo ya mbolea ya upandaji)' : isFrench ? FR.fertilizer_planting_section + '\n(Aucune recommandation d\'engrais de plantation)' : isSpanish ? ES.fertilizer_planting_section + '\n(Sin recomendaciones de fertilizante de siembra)' : 'PLANTING FERTILIZERS (apply at planting)\n(No planting fertilizer recommendations)' } });
  }

  // ========== GROUP 5: TOP DRESSING FERTILIZERS ==========
  if (hasSoilTest && fertilizerPlan && fertilizerPlan.topDressingRecommendations?.length > 0) {
    const topdressingLines: string[] = [];
    topdressingLines.push(isSwahili ? SW.fertilizer_topdressing_section : isFrench ? FR.fertilizer_topdressing_section : isSpanish ? ES.fertilizer_topdressing_section : 'TOP DRESSING FERTILIZERS (apply 3-4 weeks after planting)');
    fertilizerPlan.topDressingRecommendations.forEach((rec: any) => {
      const bagsNeeded = Math.floor(rec.amountKg / 50);
      const extraKg = rec.amountKg % 50;
      const cost = Math.round(rec.amountKg * (rec.pricePer50kg / 50));
      const providesParts = [];
      if (rec.provides.n > 0) providesParts.push(`${rec.provides.n.toFixed(1)} kg N`);
      if (rec.provides.k > 0) providesParts.push(`${rec.provides.k.toFixed(1)} kg K`);
      const providesText = providesParts.map(part => {
        const match = part.match(/([\d.]+) kg ([NPK])/);
        if (match) {
          const amount = match[1];
          const nutrient = match[2];
          const desc = getNutrientDescription(nutrient, language);
          return `${amount} kg ${nutrient} ${desc ? `(${desc})` : ''}`;
        }
        return part;
      }).join(', ');
      if (isSwahili) {
        topdressingLines.push(
          `Nunua ${rec.amountKg} kg za ${rec.brand} (${rec.npk})`,
          `Hii ni magunia ${bagsNeeded} ya 50kg + ${extraKg}kg fungua`,
          `Gharama: ${formatCurrency(cost)}`,
          `Inatoa: ${providesText}`
        );
        if (rec.brand.includes('UREA') && soilAnalysis?.topdressingFertilizerNutrients) {
          const nutrientText = formatNutrientString(soilAnalysis.topdressingFertilizerNutrients, language);
          if (nutrientText) topdressingLines.push(nutrientText);
        } else if (rec.brand.includes('MOP') && soilAnalysis?.potassiumFertilizerNutrients) {
          const nutrientText = formatNutrientString(soilAnalysis.potassiumFertilizerNutrients, language);
          if (nutrientText) topdressingLines.push(nutrientText);
        }
        topdressingLines.push(``);
      } else if (isFrench) {
        topdressingLines.push(
          `Achetez ${rec.amountKg} kg de ${rec.brand} (${rec.npk})`,
          `C'est ${bagsNeeded} sac(s) de 50kg + ${extraKg}kg ouvert`,
          `Coût: ${formatCurrency(cost)}`,
          `Fournit: ${providesText}`
        );
        if (rec.brand.includes('UREA') && soilAnalysis?.topdressingFertilizerNutrients) {
          const nutrientText = formatNutrientString(soilAnalysis.topdressingFertilizerNutrients, language);
          if (nutrientText) topdressingLines.push(nutrientText);
        } else if (rec.brand.includes('MOP') && soilAnalysis?.potassiumFertilizerNutrients) {
          const nutrientText = formatNutrientString(soilAnalysis.potassiumFertilizerNutrients, language);
          if (nutrientText) topdressingLines.push(nutrientText);
        }
        topdressingLines.push(``);
      } else if (isSpanish) {
        topdressingLines.push(
          `Compre ${rec.amountKg} kg de ${rec.brand} (${rec.npk})`,
          `Esto es ${bagsNeeded} saco(s) de 50kg + ${extraKg}kg sueltos`,
          `Costo: ${formatCurrency(cost)}`,
          `Proporciona: ${providesText}`
        );
        if (rec.brand.includes('UREA') && soilAnalysis?.topdressingFertilizerNutrients) {
          const nutrientText = formatNutrientString(soilAnalysis.topdressingFertilizerNutrients, language);
          if (nutrientText) topdressingLines.push(nutrientText);
        } else if (rec.brand.includes('MOP') && soilAnalysis?.potassiumFertilizerNutrients) {
          const nutrientText = formatNutrientString(soilAnalysis.potassiumFertilizerNutrients, language);
          if (nutrientText) topdressingLines.push(nutrientText);
        }
        topdressingLines.push(``);
      } else {
        topdressingLines.push(
          `Buy ${rec.amountKg} kg of ${rec.brand} (${rec.npk})`,
          `This is ${bagsNeeded} bag(s) of 50kg + ${extraKg}kg open`,
          `Cost: ${formatCurrency(cost)}`,
          `Provides: ${providesText}`
        );
        if (rec.brand.includes('UREA') && soilAnalysis?.topdressingFertilizerNutrients) {
          const nutrientText = formatNutrientString(soilAnalysis.topdressingFertilizerNutrients, language);
          if (nutrientText) topdressingLines.push(nutrientText);
        } else if (rec.brand.includes('MOP') && soilAnalysis?.potassiumFertilizerNutrients) {
          const nutrientText = formatNutrientString(soilAnalysis.potassiumFertilizerNutrients, language);
          if (nutrientText) topdressingLines.push(nutrientText);
        }
        topdressingLines.push(``);
      }
    });
    structuredList.push({ key: 'topdressing_fertilizers_grouped', params: { content: topdressingLines.join('\n') } });
  } else if (hasSoilTest) {
    structuredList.push({ key: 'topdressing_fertilizers_grouped', params: { content: isSwahili ? SW.fertilizer_topdressing_section + '\n(Hakuna mapendekezo ya mbolea ya kurutubisha)' : isFrench ? FR.fertilizer_topdressing_section + '\n(Aucune recommandation d\'engrais de couverture)' : isSpanish ? ES.fertilizer_topdressing_section + '\n(Sin recomendaciones de fertilizante de cobertura)' : 'TOP DRESSING FERTILIZERS (apply 3-4 weeks after planting)\n(No top dressing fertilizer recommendations)' } });
  }

  // ========== GROUP 6: PLANT POPULATION ==========
  if (hasSoilTest && fertilizerPlan && fertilizerPlan.perPlant) {
    const perPlant = fertilizerPlan.perPlant;
    const plantLines: string[] = [];
    const spacingValue = farmerData.spacing || "your spacing";
    if (isSwahili) {
      plantLines.push(SW.plant_population_title);
      plantLines.push(`Kulingana na nafasi yako ya ${spacingValue}, una takriban mimea ${perPlant.totalPlants?.toLocaleString()} kwenye shamba lako la ekari ${fertilizerPlan.farmSize}.`);
      plantLines.push('');
      plantLines.push(SW.fertilizer_per_plant_title);
      plantLines.push(`DAP: ${perPlant.dapGrams} gramu`);
      plantLines.push(`UREA: ${perPlant.ureaGrams} gramu`);
      plantLines.push(`MOP: ${perPlant.mopGrams} gramu`);
      plantLines.push(`JUMLA: ${perPlant.totalGrams} gramu`);
    } else if (isFrench) {
      plantLines.push(FR.plant_population_title);
      plantLines.push(`Selon votre espacement de ${spacingValue}, vous avez environ ${perPlant.totalPlants?.toLocaleString()} plants sur vos ${fertilizerPlan.farmSize} acres.`);
      plantLines.push('');
      plantLines.push(FR.fertilizer_per_plant_title);
      plantLines.push(`DAP: ${perPlant.dapGrams} grammes`);
      plantLines.push(`UREA: ${perPlant.ureaGrams} grammes`);
      plantLines.push(`MOP: ${perPlant.mopGrams} grammes`);
      plantLines.push(`TOTAL: ${perPlant.totalGrams} grammes`);
    } else if (isSpanish) {
      plantLines.push(ES.plant_population_title);
      plantLines.push(`Según su espaciamiento de ${spacingValue}, tiene aproximadamente ${perPlant.totalPlants?.toLocaleString()} plantas en sus ${fertilizerPlan.farmSize} acres.`);
      plantLines.push('');
      plantLines.push(ES.fertilizer_per_plant_title);
      plantLines.push(`DAP: ${perPlant.dapGrams} gramos`);
      plantLines.push(`UREA: ${perPlant.ureaGrams} gramos`);
      plantLines.push(`MOP: ${perPlant.mopGrams} gramos`);
      plantLines.push(`TOTAL: ${perPlant.totalGrams} gramos`);
    } else {
      plantLines.push('---\nPLANT POPULATION');
      plantLines.push(`Based on your spacing of ${spacingValue}, you have approximately ${perPlant.totalPlants?.toLocaleString()} plants on your ${fertilizerPlan.farmSize} acre farm.`);
      plantLines.push('');
      plantLines.push('FERTILIZER PER PLANT');
      plantLines.push(`DAP: ${perPlant.dapGrams} grams (${perPlant.dapGuide})`);
      plantLines.push(`UREA: ${perPlant.ureaGrams} grams (${perPlant.ureaGuide})`);
      plantLines.push(`MOP: ${perPlant.mopGrams} grams (${perPlant.mopGuide})`);
      plantLines.push(`TOTAL: ${perPlant.totalGrams} grams (${perPlant.totalGuide})`);
    }
    structuredList.push({
      key: 'plant_population_grouped',
      params: { content: plantLines.join('\n'), totalPlants: perPlant.totalPlants?.toLocaleString(), farmSize: fertilizerPlan.farmSize, grams: perPlant.dapGrams, ureaGrams: perPlant.ureaGrams, mopGrams: perPlant.mopGrams, totalGrams: perPlant.totalGrams }
    });
  } else if (hasSoilTest) {
    structuredList.push({ key: 'plant_population_grouped', params: { content: isSwahili ? SW.plant_population_title + '\n(Hakuna data ya idadi ya mimea)' : isFrench ? FR.plant_population_title + '\n(Aucune donnée de population végétale)' : isSpanish ? ES.plant_population_title + '\n(Sin datos de población vegetal)' : '---\nPLANT POPULATION\n(No plant population data available)' } });
  }

  // ========== GROUP 7: BUSINESS TIP ==========
  structuredList.push({ key: 'fertilizer_business_tip', params: { symbol: currencySymbol, content: isSwahili ? `SHAURI YA BIASHARA: Nunua ukubwa unaolingana na mahitaji yako ili kuepuka upotevu. Kila ${currencySymbol} unayookoa ni ${currencySymbol} uliyopata!` : isFrench ? `CONSEIL COMMERCIAL : Achetez la taille adaptée à vos besoins pour éviter le gaspillage. Chaque ${currencySymbol} économisé est un ${currencySymbol} gagné !` : isSpanish ? `CONSEJO DE NEGOCIO: Compre tamaños que se ajusten a sus necesidades para evitar desperdicio. ¡Cada ${currencySymbol} ahorrado es ${currencySymbol} ganado!` : undefined } });

  // ========== GROUP 8: FERTILIZER REMEMBER ==========
  structuredList.push({ key: 'fertilizer_remember', params: { crop: crop.toUpperCase(), content: isSwahili ? `KUMBUKA: Hii ni BIASHARA yako ya ${crop.toUpperCase()}. Kila pembejeo lazima iongeze faida yako!` : isFrench ? `RAPPELEZ-VOUS : C'est votre ENTREPRISE ${crop.toUpperCase()}. Chaque intrant doit augmenter votre profit !` : isSpanish ? `RECUERDE: Esta es su EMPRESA de ${crop.toUpperCase()}. ¡Cada insumo debe aumentar su ganancia!` : undefined } });

  // ========== GROUP 9: GROSS MARGIN ANALYSIS ==========
  let actualYieldKg = farmerData.actualYieldKg || 0;
  let pricePerKg = farmerData.pricePerKg || 0;
  let actualCosts = farmerData.totalCosts || 0;
  if (!actualYieldKg || actualYieldKg === 0) {
    const defaultYields: Record<string, number> = { maize: 2000, rice: 3000, wheat: 2000, barley: 2000, sorghum: 1500, millet: 1200, "finger millet": 1200, teff: 1000, triticale: 2000, oats: 1500, buckwheat: 1000, quinoa: 1200, fonio: 800, spelt: 1500, kamut: 1500, "amaranth grain": 800, beans: 1200, cowpeas: 800, "green grams": 800, groundnuts: 1000, "soya beans": 1000, pigeonpeas: 1000, bambaranuts: 800, chickpea: 800, lentil: 800, "faba bean": 1000, peanut: 1000, cassava: 8000, "sweet potatoes": 7000, "irish potatoes": 10000, yams: 12000, taro: 10000, ginger: 8000, turmeric: 6000, horseradish: 5000, parsnip: 8000, turnip: 8000, rutabaga: 8000, tomatoes: 15000, onions: 8000, carrots: 10000, cabbages: 12000, kales: 8000, capsicums: 8000, chillies: 6000, brinjals: 10000, "french beans": 5000, "garden peas": 4000, spinach: 8000, okra: 7000, lettuce: 8000, broccoli: 6000, cauliflower: 6000, celery: 8000, leeks: 8000, beetroot: 8000, radish: 8000, pumpkin: 10000, courgettes: 8000, cucumbers: 10000, "pumpkin leaves": 8000, "sweet potato leaves": 8000, "ethiopian kale": 8000, "jute mallow": 6000, "spider plant": 6000, "african nightshade": 5000, amaranth: 4000, arugula: 5000, asparagus: 3000, artichoke: 5000, rhubarb: 8000, wasabi: 5000, "bok choy": 8000, "collard greens": 8000, "mustard greens": 6000, "swiss chard": 8000, radicchio: 6000, escarole: 6000, frisee: 6000, "turnip greens": 6000, bananas: 6000, mangoes: 8000, avocados: 2000, oranges: 10000, pineapples: 20000, watermelons: 15000, pawpaws: 10000, "passion fruit": 8000, grapefruit: 10000, lemons: 10000, limes: 8000, guava: 8000, jackfruit: 5000, breadfruit: 5000, pomegranate: 6000, "star fruit": 8000, coconut: 3000, cashew: 2000, macadamia: 4000, fig: 6000, "date palm": 5000, mulberry: 4000, lychee: 5000, persimmon: 6000, gooseberry: 4000, currant: 3000, elderberry: 3000, rambutan: 5000, durian: 8000, mangosteen: 4000, longan: 5000, marula: 4000, coffee: 2000, tea: 2500, cocoa: 800, cotton: 2000, sunflower: 1500, simsim: 500, sugarcane: 40000, tobacco: 2000, sisal: 5000, pyrethrum: 1000, "oil palm": 8000, rubber: 500, canavalia: 2000, crotalaria: 2000, desmodium: 5000, dolichos: 2000, mucuna: 2000, vetch: 2000, vanilla: 1000, "black pepper": 2000, cardamom: 1000, cinnamon: 2000, cloves: 1000, coriander: 1000, basil: 2000, mint: 2000, rosemary: 2000, thyme: 2000, oregano: 2000, sage: 2000, dill: 1000, fennel: 2000, lavender: 1000, chamomile: 1000, echinacea: 1000, ginseng: 1000, goldenseal: 1000, "stinging nettle": 5000, moringa: 5000, stevia: 1000, fenugreek: 800, cumin: 500, caraway: 500, anise: 500, lovage: 2000, marjoram: 2000, tarragon: 2000, sorrel: 2000, chervil: 2000, savory: 2000, calendula: 1000, nasturtium: 2000, borage: 2000, "st. john's wort": 1000, valerian: 1000, alfalfa: 8000, brachiaria: 10000, "buffel grass": 6000, "guinea grass": 8000, "italian ryegrass": 8000, "napier grass": 20000, "napier hybrid": 25000, "orchard grass": 8000, "rhodes grass": 8000, "timothy grass": 8000, "white clover": 5000, "forage sorghum": 15000, leucaena: 8000, calliandra: 8000, sesbania: 8000, cenchrus: 6000, bamboo: 5000, "aloe vera": 10000, "oyster nut": 2000, watercress: 5000, ramie: 3000, flax: 1000, hemp: 2000, jute: 2000, kenaf: 2000, "slender leaf": 4000 };
    actualYieldKg = defaultYields[lowerCrop] || 2000;
  }
  if (!pricePerKg || pricePerKg === 0) {
    const defaultPrices: Record<string, number> = { maize: 40, rice: 60, wheat: 45, barley: 40, sorghum: 45, millet: 50, "finger millet": 50, teff: 60, triticale: 45, oats: 35, buckwheat: 50, quinoa: 80, fonio: 60, spelt: 55, kamut: 60, "amaranth grain": 50, beans: 80, cowpeas: 70, "green grams": 70, groundnuts: 120, "soya beans": 60, pigeonpeas: 70, bambaranuts: 80, chickpea: 80, lentil: 70, "faba bean": 60, peanut: 120, cassava: 20, "sweet potatoes": 25, "irish potatoes": 30, yams: 50, taro: 40, ginger: 80, turmeric: 100, horseradish: 40, parsnip: 30, turnip: 25, rutabaga: 25, tomatoes: 40, onions: 50, carrots: 40, cabbages: 25, kales: 20, capsicums: 50, chillies: 80, brinjals: 40, "french beans": 60, "garden peas": 50, spinach: 25, okra: 35, lettuce: 30, broccoli: 50, cauliflower: 40, celery: 30, leeks: 40, beetroot: 30, radish: 25, pumpkin: 30, courgettes: 40, cucumbers: 30, "pumpkin leaves": 20, "sweet potato leaves": 20, "ethiopian kale": 20, "jute mallow": 20, "spider plant": 20, "african nightshade": 30, amaranth: 20, arugula: 30, asparagus: 100, artichoke: 80, rhubarb: 50, wasabi: 200, "bok choy": 30, "collard greens": 20, "mustard greens": 20, "swiss chard": 25, radicchio: 40, escarole: 30, frisee: 30, "turnip greens": 20, bananas: 30, mangoes: 50, avocados: 40, oranges: 40, pineapples: 40, watermelons: 30, pawpaws: 30, "passion fruit": 50, grapefruit: 30, lemons: 30, limes: 30, guava: 30, jackfruit: 40, breadfruit: 30, pomegranate: 50, "star fruit": 40, coconut: 20, cashew: 100, macadamia: 150, fig: 60, "date palm": 80, mulberry: 40, lychee: 80, persimmon: 60, gooseberry: 40, currant: 50, elderberry: 40, rambutan: 80, durian: 100, mangosteen: 120, longan: 70, marula: 50, coffee: 300, tea: 200, cocoa: 300, cotton: 100, sunflower: 60, simsim: 80, sugarcane: 5, tobacco: 200, sisal: 10, pyrethrum: 200, "oil palm": 300, rubber: 100, canavalia: 30, crotalaria: 30, desmodium: 30, dolichos: 40, mucuna: 30, vetch: 30, vanilla: 500, "black pepper": 300, cardamom: 200, cinnamon: 200, cloves: 300, coriander: 50, basil: 50, mint: 40, rosemary: 60, thyme: 60, oregano: 50, sage: 50, dill: 40, fennel: 50, lavender: 100, chamomile: 100, echinacea: 80, ginseng: 500, goldenseal: 200, "stinging nettle": 20, moringa: 30, stevia: 100, fenugreek: 50, cumin: 80, caraway: 60, anise: 70, lovage: 40, marjoram: 50, tarragon: 60, sorrel: 30, chervil: 40, savory: 50, calendula: 40, nasturtium: 30, borage: 30, "st. john's wort": 40, valerian: 50, alfalfa: 10, brachiaria: 8, "buffel grass": 8, "guinea grass": 8, "italian ryegrass": 8, "napier grass": 5, "napier hybrid": 6, "orchard grass": 8, "rhodes grass": 8, "timothy grass": 8, "white clover": 10, "forage sorghum": 6, leucaena: 8, calliandra: 8, sesbania: 8, cenchrus: 8, bamboo: 50, "aloe vera": 10, "oyster nut": 100, watercress: 30, ramie: 20, flax: 40, hemp: 50, jute: 30, kenaf: 30, "slender leaf": 20 };
    pricePerKg = defaultPrices[lowerCrop] || 40;
  }
  if (!actualCosts || actualCosts === 0) actualCosts = fertilizerPlan?.totalCost || 25000;

  const LOW_PERCENT = 0.33;
  const HIGH_PERCENT = 1.26;
  const lowYieldKg = Math.round(actualYieldKg * LOW_PERCENT);
  const lowRevenue = lowYieldKg * pricePerKg;
  const lowCosts = Math.round(actualCosts * LOW_PERCENT);
  const lowGM = lowRevenue - lowCosts;
  const mediumYieldKg = actualYieldKg;
  const mediumRevenue = actualYieldKg * pricePerKg;
  const mediumCosts = actualCosts;
  const mediumGM = mediumRevenue - mediumCosts;
  const highYieldKg = Math.round(actualYieldKg * HIGH_PERCENT);
  const highRevenue = highYieldKg * pricePerKg;
  const highCosts = Math.round(actualCosts * HIGH_PERCENT);
  const highGM = highRevenue - highCosts;
  const gmLines: string[] = [];

  if (isSwahili) {
    gmLines.push(`UCHAMBUZI WA FAIDA KWA BIASHARA YAKO YA ${crop.toUpperCase()} (kwa ekari)`);
    gmLines.push("Kulingana na DATA yako halisi ya shamba, hivi ndivyo viwango tofauti vya usimamizi vinavyolinganishwa");
    gmLines.push('');
    gmLines.push("USIMAMIZI WA CHINI (33% ya kiwango chako cha sasa)");
    gmLines.push(`Mavuno ${lowYieldKg.toLocaleString()} kg × ${formatCurrency(pricePerKg)} = ${formatCurrency(lowRevenue)}`);
    gmLines.push(`Gharama ${formatCurrency(lowCosts)}`);
    gmLines.push(`FAIDA ${formatCurrency(lowGM)}`);
    gmLines.push('');
    gmLines.push("USIMAMIZI WA KATI (KIWANGO CHAKO CHA SASA)");
    gmLines.push(`Mavuno ${mediumYieldKg.toLocaleString()} kg × ${formatCurrency(pricePerKg)} = ${formatCurrency(mediumRevenue)}`);
    gmLines.push(`Gharama ${formatCurrency(mediumCosts)}`);
    gmLines.push(`FAIDA ${formatCurrency(mediumGM)}`);
    gmLines.push('');
    gmLines.push("USIMAMIZI WA JUU (126% ya kiwango chako cha sasa)");
    gmLines.push(`Mavuno ${highYieldKg.toLocaleString()} kg × ${formatCurrency(pricePerKg)} = ${formatCurrency(highRevenue)}`);
    gmLines.push(`Gharama ${formatCurrency(highCosts)}`);
    gmLines.push(`FAIDA ${formatCurrency(highGM)}`);
    gmLines.push('');
  } else if (isFrench) {
    gmLines.push(`ANALYSE DE LA MARGE BRUTE POUR VOTRE ENTREPRISE ${crop.toUpperCase()} (par acre)`);
    gmLines.push("D'après vos DONNÉES réelles de ferme, voici comment les différents niveaux de gestion se comparent");
    gmLines.push('');
    gmLines.push("GESTION FAIBLE (33% de votre niveau actuel)");
    gmLines.push(`Rendement: ${lowYieldKg.toLocaleString()} kg × ${formatCurrency(pricePerKg)} = ${formatCurrency(lowRevenue)}`);
    gmLines.push(`Coûts: ${formatCurrency(lowCosts)}`);
    gmLines.push(`MARGE BRUTE: ${formatCurrency(lowGM)}`);
    gmLines.push('');
    gmLines.push("GESTION MOYENNE (VOTRE NIVEAU ACTUEL)");
    gmLines.push(`Rendement: ${mediumYieldKg.toLocaleString()} kg × ${formatCurrency(pricePerKg)} = ${formatCurrency(mediumRevenue)}`);
    gmLines.push(`Coûts: ${formatCurrency(mediumCosts)}`);
    gmLines.push(`MARGE BRUTE: ${formatCurrency(mediumGM)}`);
    gmLines.push('');
    gmLines.push("GESTION ÉLEVÉE (126% de votre niveau actuel)");
    gmLines.push(`Rendement: ${highYieldKg.toLocaleString()} kg × ${formatCurrency(pricePerKg)} = ${formatCurrency(highRevenue)}`);
    gmLines.push(`Coûts: ${formatCurrency(highCosts)}`);
    gmLines.push(`MARGE BRUTE: ${formatCurrency(highGM)}`);
    gmLines.push('');
  } else if (isSpanish) {
    gmLines.push(`ANÁLISIS DE MARGEN BRUTO PARA SU EMPRESA ${crop.toUpperCase()} (por acre)`);
    gmLines.push("Basado en SUS datos reales de finca, aquí se comparan diferentes niveles de gestión");
    gmLines.push('');
    gmLines.push("GESTIÓN BAJA (33% de su nivel actual)");
    gmLines.push(`Rendimiento: ${lowYieldKg.toLocaleString()} kg × ${formatCurrency(pricePerKg)} = ${formatCurrency(lowRevenue)}`);
    gmLines.push(`Costos: ${formatCurrency(lowCosts)}`);
    gmLines.push(`MARGEN BRUTO: ${formatCurrency(lowGM)}`);
    gmLines.push('');
    gmLines.push("GESTIÓN MEDIA (SU NIVEL ACTUAL)");
    gmLines.push(`Rendimiento: ${mediumYieldKg.toLocaleString()} kg × ${formatCurrency(pricePerKg)} = ${formatCurrency(mediumRevenue)}`);
    gmLines.push(`Costos: ${formatCurrency(mediumCosts)}`);
    gmLines.push(`MARGEN BRUTO: ${formatCurrency(mediumGM)}`);
    gmLines.push('');
    gmLines.push("GESTIÓN ALTA (126% de su nivel actual)");
    gmLines.push(`Rendimiento: ${highYieldKg.toLocaleString()} kg × ${formatCurrency(pricePerKg)} = ${formatCurrency(highRevenue)}`);
    gmLines.push(`Costos: ${formatCurrency(highCosts)}`);
    gmLines.push(`MARGEN BRUTO: ${formatCurrency(highGM)}`);
    gmLines.push('');
  } else {
    gmLines.push(`GROSS MARGIN ANALYSIS FOR YOUR ${crop.toUpperCase()} ENTERPRISE (per acre)`);
    gmLines.push('Based on YOUR actual farm data, here\'s how different management levels compare');
    gmLines.push('');
    gmLines.push('LOW MANAGEMENT (33% of your current level)');
    gmLines.push(`Yield: ${lowYieldKg.toLocaleString()} kg × ${formatCurrency(pricePerKg)} = ${formatCurrency(lowRevenue)}`);
    gmLines.push(`Costs: ${formatCurrency(lowCosts)}`);
    gmLines.push(`GROSS MARGIN: ${formatCurrency(lowGM)}`);
    gmLines.push('');
    gmLines.push('MEDIUM MANAGEMENT (YOUR CURRENT LEVEL)');
    gmLines.push(`Yield: ${mediumYieldKg.toLocaleString()} kg × ${formatCurrency(pricePerKg)} = ${formatCurrency(mediumRevenue)}`);
    gmLines.push(`Costs: ${formatCurrency(mediumCosts)}`);
    gmLines.push(`GROSS MARGIN: ${formatCurrency(mediumGM)}`);
    gmLines.push('');
    gmLines.push('HIGH MANAGEMENT (126% of your current level)');
    gmLines.push(`Yield: ${highYieldKg.toLocaleString()} kg × ${formatCurrency(pricePerKg)} = ${formatCurrency(highRevenue)}`);
    gmLines.push(`Costs: ${formatCurrency(highCosts)}`);
    gmLines.push(`GROSS MARGIN: ${formatCurrency(highGM)}`);
    gmLines.push('');
  }

  const lowToMediumIncrease = lowGM !== 0 ? Math.round((mediumGM / lowGM - 1) * 100) : 0;
  const mediumToHighIncrease = mediumGM !== 0 ? Math.round((highGM / mediumGM - 1) * 100) : 0;
  const roi = mediumCosts !== 0 ? (mediumRevenue / mediumCosts).toFixed(1) : "0";

  if (isSwahili) {
    gmLines.push(`Kutoka Chini hadi Kati: +${lowToMediumIncrease}% ongezeko la faida`);
    gmLines.push(`Kutoka Kati hadi Juu: +${mediumToHighIncrease}% ongezeko la faida`);
    gmLines.push(`Kila ${currencySymbol}1 inayowekezwa inarudisha ${roi} faida katika kiwango chako cha sasa`);
    gmLines.push(`Kiwango chako cha sasa: ${farmerData.managementLevel || "Kati"}`);
    gmLines.push('');
    gmLines.push("MATOKEO YA MWISHO");
    gmLines.push(`Kuhama kutoka ${farmerData.managementLevel || "Kati"} hadi Juu kunaweza kuweka ziada ya ${formatCurrency(highGM - mediumGM)} mfukoni mwako`);
  } else if (isFrench) {
    gmLines.push(`De Faible à Moyen : +${lowToMediumIncrease}% d'augmentation du profit`);
    gmLines.push(`De Moyen à Élevé : +${mediumToHighIncrease}% d'augmentation du profit`);
    gmLines.push(`Chaque ${currencySymbol}1 investi rapporte ${roi} de profit à votre niveau actuel`);
    gmLines.push(`Votre niveau actuel : ${farmerData.managementLevel || "Moyen"}`);
    gmLines.push('');
    gmLines.push("CONCLUSION");
    gmLines.push(`Passer de ${farmerData.managementLevel || "Moyen"} à Élevé pourrait mettre ${formatCurrency(highGM - mediumGM)} supplémentaire dans votre poche`);
  } else if (isSpanish) {
    gmLines.push(`De Bajo a Medio: +${lowToMediumIncrease}% aumento de ganancia`);
    gmLines.push(`De Medio a Alto: +${mediumToHighIncrease}% aumento de ganancia`);
    gmLines.push(`Cada ${currencySymbol}1 invertido retorna ${roi} de ganancia a su nivel actual`);
    gmLines.push(`Su nivel actual: ${farmerData.managementLevel || "Medio"}`);
    gmLines.push('');
    gmLines.push("RESULTADO FINAL");
    gmLines.push(`Pasar de ${farmerData.managementLevel || "Medio"} a Alto podría poner un extra de ${formatCurrency(highGM - mediumGM)} en su bolsillo`);
  } else {
    gmLines.push(`From Low to Medium: +${lowToMediumIncrease}% profit increase`);
    gmLines.push(`From Medium to High: +${mediumToHighIncrease}% profit increase`);
    gmLines.push(`Every ${currencySymbol}1 invested returns ${roi} profit at your current level`);
    gmLines.push(`Your current level: ${farmerData.managementLevel || "Medium"}`);
    gmLines.push('');
    gmLines.push('BOTTOM LINE');
    gmLines.push(`Moving from ${farmerData.managementLevel || "Medium"} to High could put an extra ${formatCurrency(highGM - mediumGM)} in your pocket`);
  }

  structuredList.push({
    key: 'gross_margin_grouped',
    params: { content: gmLines.join('\n'), crop: crop.toUpperCase(), lowYield: lowYieldKg.toLocaleString(), mediumYield: mediumYieldKg.toLocaleString(), highYield: highYieldKg.toLocaleString(), price: formatCurrency(pricePerKg), lowRevenue: formatCurrency(lowRevenue), mediumRevenue: formatCurrency(mediumRevenue), highRevenue: formatCurrency(highRevenue), lowCosts: formatCurrency(lowCosts), mediumCosts: formatCurrency(mediumCosts), highCosts: formatCurrency(highCosts), lowGM: formatCurrency(lowGM), mediumGM: formatCurrency(mediumGM), highGM: formatCurrency(highGM), percentLowToMedium: lowToMediumIncrease, percentMediumToHigh: mediumToHighIncrease, roi: roi, level: farmerData.managementLevel || (isSwahili ? "Kati" : isFrench ? "Moyen" : isSpanish ? "Medio" : "Medium"), from: farmerData.managementLevel || (isSwahili ? "Kati" : isFrench ? "Moyen" : isSpanish ? "Medio" : "Medium"), amount: formatCurrency(highGM - mediumGM), symbol: currencySymbol }
  });

  // ========== GROUP 10: GAP ==========
  const gapKeys: Record<string, string> = { maize: "gap_maize", wheat: "gap_wheat", barley: "gap_barley", rice: "gap_rice", sorghum: "gap_sorghum", "finger millet": "gap_finger_millet", millet: "gap_millet", teff: "gap_teff", triticale: "gap_triticale", oats: "gap_oats", buckwheat: "gap_buckwheat", quinoa: "gap_quinoa", fonio: "gap_fonio", spelt: "gap_spelt", kamut: "gap_kamut", "amaranth grain": "gap_amaranth_grain", beans: "gap_beans", "soya beans": "gap_soya_beans", cowpeas: "gap_cowpeas", "green grams": "gap_green_grams", groundnuts: "gap_groundnuts", pigeonpeas: "gap_pigeonpeas", "bambara nuts": "gap_bambaranuts", chickpea: "gap_chickpea", "faba bean": "gap_faba_bean", lentil: "gap_lentil", peanut: "gap_peanut", clover: "gap_clover", vetch: "gap_vetch", desmodium: "gap_desmodium", dolichos: "gap_dolichos", mucuna: "gap_mucuna", canavalia: "gap_canavalia", "sunn hemp": "gap_sunn_hemp", "slender leaf": "gap_slender_leaf", "crotalaria paulina": "gap_crotalaria_paulina", cassava: "gap_cassava", "sweet potatoes": "gap_sweet_potatoes", "irish potatoes": "gap_irish_potatoes", potatoes: "gap_potatoes", yams: "gap_yams", taro: "gap_taro", carrots: "gap_carrots", beetroot: "gap_beetroot", radish: "gap_radish", parsnip: "gap_parsnip", turnip: "gap_turnip", rutabaga: "gap_rutabaga", ginger: "gap_ginger", turmeric: "gap_turmeric", horseradish: "gap_horseradish", tomatoes: "gap_tomatoes", kales: "gap_kales", cabbages: "gap_cabbages", capsicums: "gap_capsicums", brinjals: "gap_brinjals", eggplants: "gap_brinjals", "french beans": "gap_french_beans", "garden peas": "gap_garden_peas", spinach: "gap_spinach", okra: "gap_okra", onions: "gap_onions", cauliflower: "gap_cauliflower", broccoli: "gap_broccoli", leeks: "gap_leeks", celery: "gap_celery", lettuce: "gap_lettuce", "african nightshade": "gap_african_nightshade", amaranth: "gap_amaranth", "spider plant": "gap_spider_plant", "pumpkin leaves": "gap_pumpkin_leaves", "jute mallow": "gap_jute_mallow", "ethiopian kale": "gap_ethiopian_kale", pumpkin: "gap_pumpkin", courgettes: "gap_courgettes", cucumbers: "gap_cucumbers", endive: "gap_endive", kohlrabi: "gap_kohlrabi", "sweet potato leaves": "gap_sweet_potato_leaves", watercress: "gap_watercress", rhubarb: "gap_rhubarb", artichoke: "gap_artichoke", asparagus: "gap_asparagus", arugula: "gap_arugula", "bok choy": "gap_bok_choy", "collard greens": "gap_collard_greens", "mustard greens": "gap_mustard_greens", "swiss chard": "gap_swiss_chard", radicchio: "gap_radicchio", escarole: "gap_escarole", frisee: "gap_frisee", "turnip greens": "gap_turnip_greens", wasabi: "gap_wasabi", bananas: "gap_bananas", mangoes: "gap_mangoes", pineapples: "gap_pineapples", watermelons: "gap_watermelons", avocado: "gap_avocados", avocados: "gap_avocados", oranges: "gap_oranges", pawpaws: "gap_pawpaws", "passion fruit": "gap_passion_fruit", lemons: "gap_lemons", limes: "gap_limes", grapefruit: "gap_grapefruit", guava: "gap_guava", jackfruit: "gap_jackfruit", breadfruit: "gap_breadfruit", pomegranate: "gap_pomegranate", "star fruit": "gap_star_fruit", coconut: "gap_coconut", cashew: "gap_cashew", "oil palm": "gap_oil_palm", fig: "gap_fig", "date palm": "gap_date_palm", mulberry: "gap_mulberry", lychee: "gap_lychee", persimmon: "gap_persimmon", gooseberry: "gap_gooseberry", currant: "gap_currant", elderberry: "gap_elderberry", rambutan: "gap_rambutan", durian: "gap_durian", mangosteen: "gap_mangosteen", longan: "gap_longan", marula: "gap_marula", coffee: "gap_coffee", cocoa: "gap_cocoa", tea: "gap_tea", cotton: "gap_cotton", sugarcane: "gap_sugarcane", tobacco: "gap_tobacco", sunflower: "gap_sunflower", simsim: "gap_simsim", sesame: "gap_simsim", sisal: "gap_sisal", rubber: "gap_rubber", hemp: "gap_hemp", flax: "gap_flax", jute: "gap_jute", kenaf: "gap_kenaf", pyrethrum: "gap_pyrethrum", macadamia: "gap_macadamia", almond: "gap_almond", chestnut: "gap_chestnut", hazelnut: "gap_hazelnut", walnut: "gap_walnut", pecan: "gap_pecan", pistachio: "gap_pistachio", "brazil nut": "gap_brazil_nut", "pili nut": "gap_pili_nut", shea: "gap_shea", vanilla: "gap_vanilla", cardamom: "gap_cardamom", cinnamon: "gap_cinnamon", cloves: "gap_cloves", "black pepper": "gap_black_pepper", "lemon grass": "gap_lemon_grass", rosemary: "gap_rosemary", thyme: "gap_thyme", parsley: "gap_parsley", coriander: "gap_coriander", basil: "gap_basil", mint: "gap_mint", oregano: "gap_oregano", sage: "gap_sage", dill: "gap_dill", fennel: "gap_fennel", lavender: "gap_lavender", chamomile: "gap_chamomile", echinacea: "gap_echinacea", ginseng: "gap_ginseng", goldenseal: "gap_goldenseal", moringa: "gap_moringa", mustard: "gap_mustard", stevia: "gap_stevia", fenugreek: "gap_fenugreek", cumin: "gap_cumin", caraway: "gap_caraway", anise: "gap_anise", lovage: "gap_lovage", marjoram: "gap_marjoram", tarragon: "gap_tarragon", sorrel: "gap_sorrel", chervil: "gap_chervil", savory: "gap_savory", calendula: "gap_calendula", nasturtium: "gap_nasturtium", borage: "gap_borage", "st. john's wort": "gap_st_johns_wort", valerian: "gap_valerian", "birds eye chili": "gap_birds_eye_chili", cayenne: "gap_cayenne", jalapeno: "gap_jalapeno", alfalfa: "gap_alfalfa", lucerne: "gap_lucerne", brachiaria: "gap_brachiaria", "guinea grass": "gap_guinea_grass", "buffel grass": "gap_buffel_grass", "napier grass": "gap_napier_grass", "napier hybrid": "gap_napier_hybrid", "rhodes grass": "gap_rhodes_grass", "italian ryegrass": "gap_italian_ryegrass", "timothy grass": "gap_timothy_grass", "orchard grass": "gap_orchard_grass", "white clover": "gap_white_clover", "forage sorghum": "gap_forage_sorghum", leucaena: "gap_leucaena", calliandra: "gap_calliandra", sesbania: "gap_sesbania", cenchrus: "gap_cenchrus", bamboo: "gap_bamboo", "aloe vera": "gap_aloe_vera", hibiscus: "gap_hibiscus", "stinging nettle": "gap_stinging_nettle", mushroom: "gap_mushroom", "oyster nut": "gap_oyster_nut", ramie: "gap_ramie" };
  const gapKey = lowerCrop in gapKeys ? gapKeys[lowerCrop] : 'gap_generic';

  let gapText = "";
  if (isFrench) {
    gapText = (FR[gapKey] as string) || (SW[gapKey] as string) || "Suivez les bonnes pratiques agricoles pour votre culture.";
  } else if (isSwahili) {
    gapText = (SW[gapKey] as string) || (FR[gapKey] as string) || "Fuata kanuni nzuri za kilimo kwa mazao yako.";
  } else if (isSpanish) {
    gapText = (ES[gapKey] as string) || (SW[gapKey] as string) || (FR[gapKey] as string) || "Siga las buenas prácticas agrícolas para su cultivo.";
  } else {
    gapText = (SW[gapKey] as string) || (FR[gapKey] as string) || "Follow recommended agricultural practices for your crop.";
  }
  gapText = replacePlaceholders(gapText, { crop: crop.toUpperCase() });

  let gapTitle = "";
  if (isSwahili) {
    gapTitle = replacePlaceholders(SW.gap_title as string, { crop: crop.toUpperCase() }) || `KANUNI NZURI ZA KILIMO KWA BIASHARA YAKO YA ${crop.toUpperCase()}`;
  } else if (isFrench) {
    gapTitle = replacePlaceholders(FR.gap_title as string, { crop: crop.toUpperCase() }) || `BONNES PRATIQUES AGRICOLES POUR VOTRE ENTREPRISE ${crop.toUpperCase()}`;
  } else if (isSpanish) {
    gapTitle = replacePlaceholders(ES.gap_title as string, { crop: crop.toUpperCase() }) || `BUENAS PRÁCTICAS AGRÍCOLAS PARA SU EMPRESA ${crop.toUpperCase()}`;
  } else {
    gapTitle = `GOOD AGRICULTURAL PRACTICES FOR YOUR ${crop.toUpperCase()} ENTERPRISE`;
  }

  structuredList.push({ key: 'gap_grouped', params: { title: gapTitle, gapText: gapText, remember: isSwahili ? SW.gap_remember : isFrench ? FR.gap_remember : isSpanish ? ES.gap_remember : 'REMEMBER: Every practice you do well puts more money in your pocket', crop: crop.toUpperCase() } });

  // ========== GROUP 11: DISEASE MANAGEMENT ==========
  if (farmerData.commonDiseases) {
    const diseaseLines: string[] = [];
    const diseaseTitle = replacePlaceholders(isSwahili ? (SW.disease_management_title as string) : isFrench ? (FR.disease_management_title as string) : isSpanish ? (ES.disease_management_title as string) : null, { crop: crop.toUpperCase() }) || (isSwahili ? `UDHIBITI JUMUISHI WA MAGONJWA KWA BIASHARA YAKO YA ${crop.toUpperCase()}` : isFrench ? `GESTION INTÉGRÉE DES MALADIES POUR VOTRE ENTREPRISE ${crop.toUpperCase()}` : isSpanish ? `MANEJO INTEGRADO DE ENFERMEDADES PARA SU EMPRESA ${crop.toUpperCase()}` : `INTEGRATED DISEASE MANAGEMENT FOR YOUR ${crop.toUpperCase()} ENTERPRISE`);
    diseaseLines.push(diseaseTitle);

    const diseaseReported = replacePlaceholders(isSwahili ? (SW.disease_reported as string) : isFrench ? (FR.disease_reported as string) : isSpanish ? (ES.disease_reported as string) : null, { diseases: farmerData.commonDiseases }) || (isSwahili ? `Magonjwa uliyoripoti: ${farmerData.commonDiseases}` : isFrench ? `Les maladies signalées : ${farmerData.commonDiseases}` : isSpanish ? `Enfermedades reportadas: ${farmerData.commonDiseases}` : `The diseases affecting your ${crop.toUpperCase()} ENTERPRISE: ${farmerData.commonDiseases}`);
    diseaseLines.push(diseaseReported);

    const diseaseList = farmerData.commonDiseases.split(',').map(d => d.trim()).filter(d => d);
    diseaseList.forEach(disease => { diseaseLines.push(`• ${disease}`); });
    diseaseLines.push('');
    diseaseLines.push(isSwahili ? (SW.disease_prevention_title || "KUZUIA (Rahisi kuliko kutibu)") : isFrench ? (FR.disease_prevention_title || "PRÉVENTION (Moins cher que guérir)") : isSpanish ? (ES.disease_prevention_title || "PREVENCIÓN (Más barato que curar)") : 'PREVENTION (Cheaper than cure)');
    diseaseLines.push(isSwahili ? (SW.disease_prevention_list || "• Tumia aina zinazostahimili magonjwa\n• Zoea mzunguko wa mazao (miaka 3-4)\n• Hakikisha nafasi sahihi kwa mzunguko wa hewa\n• Epuka kufanya kazi kwenye mashamba yenye unyevu\n• Ondoa na uharibu mimea iliyoathirika mara moja\n• Sababisha zana kati ya mashamba") : isFrench ? (FR.disease_prevention_list || "• Utilisez des variétés résistantes\n• Pratiquez la rotation des cultures (3-4 ans)\n• Assurez un espacement adéquat\n• Évitez de travailler dans les champs humides\n• Retirez et détruisez les plantes infectées\n• Désinfectez les outils") : isSpanish ? (ES.disease_prevention_list || "• Use variedades resistentes\n• Practique la rotación de cultivos (3-4 años)\n• Asegure un espaciamiento adecuado\n• Evite trabajar en campos húmedos\n• Retire y destruya plantas infectadas\n• Desinfecte herramientas entre campos") : '• Use disease-resistant varieties where available\n• Practice crop rotation (3-4 years)\n• Ensure proper spacing for air circulation\n• Avoid working in wet fields\n• Remove and destroy infected plants immediately\n• Disinfect tools between fields');
    diseaseLines.push('');
    diseaseLines.push(isSwahili ? (SW.disease_control_title || "CHAGUO ZA UDHIBITI WA MAGONJWA SHAMBANI MWAKO:") : isFrench ? (FR.disease_control_title || "OPTIONS DE LUTTE CONTRE LES MALADIES DANS VOTRE FERME :") : isSpanish ? (ES.disease_control_title || "OPCIONES DE CONTROL DE ENFERMEDADES EN SU FINCA:") : 'CONTROL OPTIONS FOR DISEASES IN YOUR FARM:');

    const cropLookupKey = lowerCrop.replace(/\s+/g, '');
    const cropPestsAndDiseases = cropPestDiseaseMap[cropLookupKey] || cropPestDiseaseMap[lowerCrop] || [];
    const cropDiseases = cropPestsAndDiseases.filter((pd: PestDisease) => pd.type === "disease");
    const userDiseases = farmerData.commonDiseases.split(',').map(d => d.trim().toLowerCase());
    const filteredDiseases = userDiseases.length > 0 ? cropDiseases.filter(disease => userDiseases.some(userDisease => disease.name.toLowerCase().includes(userDisease))) : cropDiseases;

    const spanishControlMap: Record<string, string> = {
      "Use resistant varieties (Ruiru 11, Batian)": "Use variedades resistentes (Ruiru 11, Batian)",
      "Prune for good air circulation (remove suckers, open canopy)": "Pode para una buena circulación de aire (elimine chupones, abra el dosel)",
      "Maintain good soil fertility (apply 5-10 tons manure/acre annually)": "Mantenga una buena fertilidad del suelo (aplique 5-10 toneladas de estiércol/acre al año)",
      "Remove and destroy infected leaves (burn)": "Retire y destruya las hojas infectadas (queme)",
      "Apply nitrogenous fertilizer (CAN 50kg/acre) after heavy rains": "Aplique fertilizante nitrogenado (CAN 50kg/acre) después de lluvias intensas",
      "Conserve natural enemies (parasitic wasps)": "Conserve enemigos naturales (avispas parasitoides)",
      "Prune to remove infested leaves": "Pode para eliminar hojas infestadas",
      "Maintain proper shade (40-50%)": "Mantenga una sombra adecuada (40-50%)"
    };

    if (filteredDiseases.length > 0) {
      filteredDiseases.forEach(disease => {
        diseaseLines.push('');
        diseaseLines.push(`📌 ${disease.name.toUpperCase()}`);

        if (disease.culturalControls && disease.culturalControls.length > 0) {
          diseaseLines.push(isSwahili ? "Udhibiti wa kitamaduni:" : isFrench ? "Lutte cultural :" : isSpanish ? "Control cultural:" : "Cultural Control:");
          disease.culturalControls.forEach(control => {
            let translatedControl = control;
            if (isSpanish && spanishControlMap[control]) translatedControl = spanishControlMap[control];
            diseaseLines.push(`  • ${translatedControl}`);
          });
        }

        if (disease.organicControls && disease.organicControls.length > 0) {
          diseaseLines.push(isSwahili ? "Udhibiti wa kikaboni:" : isFrench ? "Lutte biologique :" : isSpanish ? "Control orgánico:" : "Organic Control:");
          disease.organicControls.forEach(organic => {
            let method = organic.method;
            let prep = organic.preparation;
            let app = organic.application;
            if (isSpanish) {
              method = translateOrganic(method, 'es');
              prep = translateRate(prep, 'es');
              app = translateTiming(app, 'es');
            } else if (isFrench) {
              method = translateOrganic(method, 'fr');
              prep = translateRate(prep, 'fr');
              app = translateTiming(app, 'fr');
            } else if (isSwahili) {
              method = translateOrganic(method, 'sw');
              prep = translateRate(prep, 'sw');
              app = translateTiming(app, 'sw');
            }
            diseaseLines.push(`  • ${method}`);
            diseaseLines.push(`    Preparación: ${prep}`);
            diseaseLines.push(`    Aplicación: ${app}`);
          });
        } else {
          diseaseLines.push(isSwahili ? "Udhibiti wa kikaboni: Hakuna (hakuna tiba ya virusi)" : isFrench ? "Lutte biologique : Aucun (pas de remède pour les virus)" : isSpanish ? "Control orgánico: Ninguno (sin cura para virus)" : "Organic Control: None (no cure for viruses)");
        }

        if (disease.chemicalControls && disease.chemicalControls.length > 0) {
          diseaseLines.push(isSwahili ? "Udhibiti wa kemikali:" : isFrench ? "Lutte chimique :" : isSpanish ? "Control químico:" : "Chemical Control:");
          disease.chemicalControls.forEach(chem => {
            let rate = chem.rate;
            let timing = chem.timing;
            let safety = chem.safetyInterval || '';
            if (isSpanish) {
              rate = translateRate(rate, 'es');
              timing = translateTiming(timing, 'es');
              safety = translateSafety(safety, 'es');
            } else if (isFrench) {
              rate = translateRate(rate, 'fr');
              timing = translateTiming(timing, 'fr');
              safety = translateSafety(safety, 'fr');
            } else if (isSwahili) {
              rate = translateRate(rate, 'sw');
              timing = translateTiming(timing, 'sw');
              safety = translateSafety(safety, 'sw');
            }
            diseaseLines.push(`  • ${chem.productName} (${chem.activeIngredient})`);
            diseaseLines.push(`    Dosis: ${rate}`);
            diseaseLines.push(`    Dosis por acre: ${chem.ratePerAcre}`);
            diseaseLines.push(`    Momento: ${timing}`);
            if (safety) diseaseLines.push(`    Seguridad: ${safety}`);
            const statusText = translateStatus(chem.status === 'restricted' ? '⚠️ RESTRICTED' : chem.status === 'banned' ? '❌ BANNED' : '✅ Active', language);
            diseaseLines.push(`    Estado: ${statusText}`);
          });
        } else {
          diseaseLines.push(isSwahili ? "Udhibiti wa kemikali: Hakuna (hakuna tiba ya virusi)" : isFrench ? "Lutte chimique : Aucun (pas de remède pour les virus)" : isSpanish ? "Control químico: Ninguno (sin cura para virus)" : "Chemical Control: None (no cure for viruses)");
        }

        let businessNote = disease.businessNote;
        if (isSwahili) {
          if (disease.name === "Coffee leaf rust (Hemileia vastatrix)") businessNote = "Kutu kunaweza kupunguza mavuno kwa 70%. Aina zinazostahimili zinagharimu sawa na zile nyeti!";
        } else if (isFrench) {
          if (disease.name === "Coffee leaf rust (Hemileia vastatrix)") businessNote = "La rouille peut réduire le rendement de 70%. Les variétés résistantes coûtent le même prix que les sensibles !";
        } else if (isSpanish) {
          if (disease.name === "Coffee leaf rust (Hemileia vastatrix)") businessNote = "La roya puede reducir el rendimiento en un 70%. ¡Las variedades resistentes cuestan lo mismo que las susceptibles!";
        }
        if (businessNote) diseaseLines.push(`  💼 ${businessNote}`);
      });
    }

    diseaseLines.push('');
    diseaseLines.push(isSwahili ? (SW.disease_business_case_title || "HALI YA BIASHARA") : isFrench ? (FR.disease_business_case_title || "CAS COMMERCIAL") : isSpanish ? (ES.disease_business_case_title || "CASO DE NEGOCIO") : 'BUSINESS CASE');
    diseaseLines.push(isSwahili ? `Bila udhibiti: Uwezekano wa hasara ya mavuno ya 30-100%\nKwa kuzuia: Gharama ${formatCurrency(2000)}-${formatCurrency(5000)}/ekari = OKOA ${formatCurrency(100000)}+!\nKila ${currencySymbol}1 inayotumika kuzuia magonjwa inarudisha ${currencySymbol}20-50 katika mavuno yaliyookolewa` : isFrench ? `Sans contrôle : Pertes de rendement possibles de 30 à 100 %\nAvec prévention : Coût ${formatCurrency(2000)}-${formatCurrency(5000)}/acre = ÉCONOMISEZ ${formatCurrency(100000)}+ !\nChaque ${currencySymbol}1 dépensé en prévention des maladies rapporte ${currencySymbol}20-50 en rendement économisé` : isSpanish ? `Sin control: Pérdidas de rendimiento del 30-100% posibles\nCon prevención: Costo ${formatCurrency(2000)}-${formatCurrency(5000)}/acre = ¡AHORRE ${formatCurrency(100000)}+!\nCada ${currencySymbol}1 gastado en prevención de enfermedades retorna ${currencySymbol}20-50 en rendimiento salvado` : `Without control: Yield losses of 30-100% possible\nWith prevention: Cost ${formatCurrency(2000)}-${formatCurrency(5000)}/acre = SAVE ${formatCurrency(100000)}+!\nEvery ${currencySymbol}1 spent on disease prevention returns ${currencySymbol}20-50 in saved yield`);
    structuredList.push({ key: 'disease_management_grouped', params: { content: diseaseLines.join('\n'), crop: crop.toUpperCase(), diseases: farmerData.commonDiseases, low: formatCurrency(2000), high: formatCurrency(5000), saved: formatCurrency(100000), symbol: currencySymbol } });
  } else {
    structuredList.push({ key: 'disease_management_grouped', params: { content: isSwahili ? (SW.disease_management_title || `UDHIBITI JUMUISHI WA MAGONJWA KWA BIASHARA YAKO YA ${crop.toUpperCase()}`) + '\n(Hakuna magonjwa yaliyoripotiwa)' : isFrench ? (FR.disease_management_title || `GESTION INTÉGRÉE DES MALADIES POUR VOTRE ENTREPRISE ${crop.toUpperCase()}`) + '\n(Aucune maladie signalée)' : isSpanish ? (ES.disease_management_title || `MANEJO INTEGRADO DE ENFERMEDADES PARA SU EMPRESA ${crop.toUpperCase()}`) + '\n(Ninguna enfermedad reportada)' : `INTEGRATED DISEASE MANAGEMENT FOR YOUR ${crop.toUpperCase()} ENTERPRISE\n(No diseases reported)`, crop: crop.toUpperCase(), diseases: '', low: formatCurrency(2000), high: formatCurrency(5000), saved: formatCurrency(100000), symbol: currencySymbol } });
  }

  // ========== GROUP 12: PEST MANAGEMENT ==========
  if (farmerData.commonPests) {
    const pestLines: string[] = [];
    const pestTitle = replacePlaceholders(isSwahili ? (SW.pest_management_title as string) : isFrench ? (FR.pest_management_title as string) : isSpanish ? (ES.pest_management_title as string) : null, { crop: crop.toUpperCase() }) || (isSwahili ? `UDHIBITI JUMUISHI WA WADUDU (IPM) KWA BIASHARA YAKO YA ${crop.toUpperCase()}` : isFrench ? `GESTION INTÉGRÉE DES RAVAGEURS (IPM) POUR VOTRE ENTREPRISE ${crop.toUpperCase()}` : isSpanish ? `MANEJO INTEGRADO DE PLAGAS (MIP) PARA SU EMPRESA ${crop.toUpperCase()}` : `INTEGRATED PEST MANAGEMENT (IPM) FOR YOUR ${crop.toUpperCase()} ENTERPRISE`);
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

    const spanishPestControlMap: Record<string, string> = {
      "Conserve natural enemies (parasitic wasps)": "Conserve enemigos naturales (avispas parasitoides)",
      "Prune to remove infested leaves": "Pode para eliminar hojas infestadas",
      "Maintain proper shade (40-50%)": "Mantenga una sombra adecuada (40-50%)"
    };

    if (filteredPests.length > 0) {
      pestLines.push(isSwahili ? "CHAGUO ZA UDHIBITI:" : isFrench ? "OPTIONS DE LUTTE :" : isSpanish ? "OPCIONES DE CONTROL:" : "CONTROL OPTIONS FOR PESTS IN YOUR FARM:");
      filteredPests.forEach(pest => {
        pestLines.push('');
        pestLines.push(`🐛 ${pest.name.toUpperCase()}`);

        if (pest.culturalControls && pest.culturalControls.length > 0) {
          pestLines.push(isSwahili ? "Udhibiti wa kitamaduni:" : isFrench ? "Lutte cultural :" : isSpanish ? "Control cultural:" : "Cultural Control:");
          pest.culturalControls.forEach(control => {
            let translatedControl = control;
            if (isSpanish && spanishPestControlMap[control]) translatedControl = spanishPestControlMap[control];
            pestLines.push(`  • ${translatedControl}`);
          });
        }

        if (pest.organicControls && pest.organicControls.length > 0) {
          pestLines.push(isSwahili ? "Udhibiti wa kikaboni:" : isFrench ? "Lutte biologique :" : isSpanish ? "Control orgánico:" : "Organic Control:");
          pest.organicControls.forEach(organic => {
            let method = organic.method;
            let prep = organic.preparation;
            let app = organic.application;
            if (isSpanish) {
              method = translateOrganic(method, 'es');
              prep = translateRate(prep, 'es');
              app = translateTiming(app, 'es');
            } else if (isFrench) {
              method = translateOrganic(method, 'fr');
              prep = translateRate(prep, 'fr');
              app = translateTiming(app, 'fr');
            } else if (isSwahili) {
              method = translateOrganic(method, 'sw');
              prep = translateRate(prep, 'sw');
              app = translateTiming(app, 'sw');
            }
            pestLines.push(`  • ${method}`);
            pestLines.push(`    Preparación: ${prep}`);
            pestLines.push(`    Aplicación: ${app}`);
          });
        } else {
          pestLines.push(isSwahili ? "Udhibiti wa kikaboni: Hakuna" : isFrench ? "Lutte biologique : Aucune" : isSpanish ? "Control orgánico: Ninguno" : "Organic Control: None");
        }

        if (pest.chemicalControls && pest.chemicalControls.length > 0) {
          pestLines.push(isSwahili ? "Udhibiti wa kemikali:" : isFrench ? "Lutte chimique :" : isSpanish ? "Control químico:" : "Chemical Control:");
          pest.chemicalControls.forEach(chem => {
            let rate = chem.rate;
            let timing = chem.timing;
            let safety = chem.safetyInterval || '';
            if (isSpanish) {
              rate = translateRate(rate, 'es');
              timing = translateTiming(timing, 'es');
              safety = translateSafety(safety, 'es');
            } else if (isFrench) {
              rate = translateRate(rate, 'fr');
              timing = translateTiming(timing, 'fr');
              safety = translateSafety(safety, 'fr');
            } else if (isSwahili) {
              rate = translateRate(rate, 'sw');
              timing = translateTiming(timing, 'sw');
              safety = translateSafety(safety, 'sw');
            }
            pestLines.push(`  • ${chem.productName} (${chem.activeIngredient})`);
            pestLines.push(`    Dosis: ${rate}`);
            pestLines.push(`    Dosis por acre: ${chem.ratePerAcre}`);
            pestLines.push(`    Momento: ${timing}`);
            if (safety) pestLines.push(`    Seguridad: ${safety}`);
            const statusText = translateStatus(chem.status === 'restricted' ? '⚠️ RESTRICTED' : chem.status === 'banned' ? '❌ BANNED' : '✅ Active', language);
            pestLines.push(`    Estado: ${statusText}`);
          });
        } else {
          pestLines.push(isSwahili ? "Udhibiti wa kemikali: Hakuna" : isFrench ? "Lutte chimique : Aucune" : isSpanish ? "Control químico: Ninguno" : "Chemical Control: None");
        }

        let businessNote = pest.businessNote;
        if (isSwahili) {
          if (pest.name === "Coffee berry borer (Hypothenemus hampei)") businessNote = "Kisazi cha buni huweza kuharibu hadi 50% ya mavuno! Usafi wa shamba na uvunaji wa mara kwa mara ni muhimu.";
        } else if (isFrench) {
          if (pest.name === "Coffee leaf miner (Leucoptera coffeella)") businessNote = "La mineuse réduit la photosynthèse et le rendement. Un contrôle précoce est essentiel.";
        } else if (isSpanish) {
          if (pest.name === "Coffee leaf miner (Leucoptera coffeella)") businessNote = "El minador reduce la fotosíntesis y el rendimiento. El control temprano es esencial.";
        }
        if (businessNote) pestLines.push(`  💼 ${businessNote}`);
      });
    }

    pestLines.push('');
    pestLines.push(isSwahili ? (SW.pest_business_calc_title || "HESABU YA BIASHARA") : isFrench ? (FR.pest_business_calc_title || "CALCUL COMMERCIAL") : isSpanish ? (ES.pest_business_calc_title || "CÁLCULO DE NEGOCIO") : 'BUSINESS CALCULATION');
    pestLines.push(isSwahili ? `Bila udhibiti: Hasara 40-60% ya mavuno = hasara ${formatCurrency(80000)}-${formatCurrency(120000)}/ekari\nKwa IPM: Gharama ${formatCurrency(1500)}-${formatCurrency(3000)} = OKOA ${formatCurrency(100000)}+ faida\nKila ${currencySymbol}1 inayotumika kudhibiti wadudu inarudisha ${currencySymbol}30-40 katika mavuno yaliyookolewa` : isFrench ? `Sans contrôle : Perte de rendement de 40 à 60 % = perte de ${formatCurrency(80000)}-${formatCurrency(120000)}/acre\nAvec IPM : Coût ${formatCurrency(1500)}-${formatCurrency(3000)} = ÉCONOMISEZ ${formatCurrency(100000)}+ de profit\nChaque ${currencySymbol}1 dépensé en lutte antiparasitaire rapporte ${currencySymbol}30-40 en rendement économisé` : isSpanish ? `Sin control: Pérdida del 40-60% del rendimiento = pérdida de ${formatCurrency(80000)}-${formatCurrency(120000)}/acre\nCon MIP: Costo ${formatCurrency(1500)}-${formatCurrency(3000)} = ¡AHORRE ${formatCurrency(100000)}+ de ganancia\nCada ${currencySymbol}1 gastado en control de plagas retorna ${currencySymbol}30-40 en rendimiento salvado` : `Without control: Loss 40-60% yield = ${formatCurrency(80000)}-${formatCurrency(120000)} loss/acre\nWith IPM: Cost ${formatCurrency(1500)}-${formatCurrency(3000)} = SAVE ${formatCurrency(100000)}+ profit\nEvery ${currencySymbol}1 spent on pest control returns ${currencySymbol}30-40 in saved yield`);
    structuredList.push({ key: 'pest_management_grouped', params: { content: pestLines.join('\n'), crop: crop.toUpperCase(), pests: farmerData.commonPests, lowLoss: formatCurrency(80000), highLoss: formatCurrency(120000), lowCost: formatCurrency(1500), highCost: formatCurrency(3000), saved: formatCurrency(100000), symbol: currencySymbol } });
  } else {
    structuredList.push({ key: 'pest_management_grouped', params: { content: isSwahili ? (SW.pest_management_title || `UDHIBITI JUMUISHI WA WADUDU (IPM) KWA BIASHARA YAKO YA ${crop.toUpperCase()}`) + '\n(Hakuna wadudu waliyoripotiwa)' : isFrench ? (FR.pest_management_title || `GESTION INTÉGRÉE DES RAVAGEURS (IPM) POUR VOTRE ENTREPRISE ${crop.toUpperCase()}`) + '\n(Aucun ravageur signalé)' : isSpanish ? (ES.pest_management_title || `MANEJO INTEGRADO DE PLAGAS (MIP) PARA SU EMPRESA ${crop.toUpperCase()}`) + '\n(Ninguna plaga reportada)' : `INTEGRATED PEST MANAGEMENT (IPM) FOR YOUR ${crop.toUpperCase()} ENTERPRISE\n(No pests reported)`, crop: crop.toUpperCase(), pests: '', lowLoss: formatCurrency(80000), highLoss: formatCurrency(120000), lowCost: formatCurrency(1500), highCost: formatCurrency(3000), saved: formatCurrency(100000), symbol: currencySymbol } });
  }

  // ========== GROUP 13: NUTRIENT DEFICIENCY ==========
  if (farmerData.deficiencySymptoms && farmerData.deficiencySymptoms.trim() !== '') {
    const deficiencyLines: string[] = [];
    const symptoms = farmerData.deficiencySymptoms;
    const location = farmerData.deficiencyLocation || 'not specified';
    const deficiencies = getDeficienciesForCrop(crop, farmerData.deficiencySymptoms, farmerData.deficiencyLocation);
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
          if (def.correction.organic && def.correction.organic.length > 0) {
            deficiencyLines.push(`  Njia za kikaboni: ${def.correction.organic.join(', ')}`);
          }
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
          if (def.correction.organic && def.correction.organic.length > 0) {
            deficiencyLines.push(`  Biologique : ${def.correction.organic.join(', ')}`);
          }
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
          if (def.correction.organic && def.correction.organic.length > 0) {
            deficiencyLines.push(`  Opciones orgánicas: ${def.correction.organic.join(', ')}`);
          }
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
          if (def.correction.organic && def.correction.organic.length > 0) {
            deficiencyLines.push(`  Organic: ${def.correction.organic.join(', ')}`);
          }
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
    structuredList.push({ key: 'deficiency_management_grouped', params: { title: isSwahili ? `UCHAMBUZI WA UPUNGUFU WA VIRUTUBISHO KWA BIASHARA YAKO YA ${crop.toUpperCase()}` : isFrench ? `ANALYSE DES CARENCES NUTRITIONNELLES POUR VOTRE ENTREPRISE ${crop.toUpperCase()}` : isSpanish ? `ANÁLISIS DE DEFICIENCIA DE NUTRIENTES PARA SU EMPRESA ${crop.toUpperCase()}` : `NUTRIENT DEFICIENCY ANALYSIS FOR YOUR ${crop.toUpperCase()} ENTERPRISE`, symptoms, location, content: deficiencyLines.join('\n'), crop: crop.toUpperCase() } });
  }

  // ========== GROUP 14: DAMAGE REPORT ==========
  if (farmerData.plantsDamaged && farmerData.plantsDamaged > 0) {
    structuredList.push({ key: 'damage_report_grouped', params: { title: isSwahili ? `RIPOTI YA UHARIBIFU KWA BIASHARA YAKO YA ${crop.toUpperCase()}` : isFrench ? `RAPPORT DE DÉGÂTS POUR VOTRE ENTREPRISE ${crop.toUpperCase()}` : isSpanish ? `INFORME DE DAÑOS PARA SU EMPRESA ${crop.toUpperCase()}` : `DAMAGE REPORT FOR YOUR ${crop.toUpperCase()} ENTERPRISE`, plantsDamaged: farmerData.plantsDamaged, message: isSwahili ? `Umeripoti mimea ${farmerData.plantsDamaged} iliyoharibiwa zaidi ya kurejeshwa.` : isFrench ? `Vous avez signalé ${farmerData.plantsDamaged} plantes endommagées au-delà de tout rétablissement.` : isSpanish ? `Reportó ${farmerData.plantsDamaged} plantas dañadas más allá de toda recuperación.` : `You reported ${farmerData.plantsDamaged} plants damaged beyond recovery.`, advice: isSwahili ? "Fikiria kukagua mikakati yako ya udhibiti wa wadudu na magonjwa ili kuzuia hasara za baadaye." : isFrench ? "Envisagez de revoir vos stratégies de lutte contre les ravageurs et les maladies pour éviter de futures pertes." : isSpanish ? "Considere revisar sus estrategias de manejo de plagas y enfermedades para evitar pérdidas futuras." : 'Consider reviewing your pest and disease management strategies to prevent future losses.', followUp: isSwahili ? "Kwa ushauri wa kibinafsi juu ya kupunguza uharibifu wa mimea, uliza mfumo wetu wa Maswali na Majibu kuhusu udhibiti wa wadudu au kuzuia magonjwa." : isFrench ? "Pour des conseils personnalisés sur la réduction des dégâts aux plantes, interrogez notre système Q&A sur la lutte antiparasitaire ou la prévention des maladies." : isSpanish ? "Para consejos personalizados sobre cómo reducir el daño a las plantas, consulte nuestro sistema de P&R sobre control de plagas o prevención de enfermedades." : 'For personalized advice on reducing plant damage, ask our Q&A system about pest control or disease prevention.', crop: crop.toUpperCase(), plants: farmerData.plantsDamaged } });
  } else {
    structuredList.push({ key: 'damage_report_grouped', params: { title: isSwahili ? `RIPOTI YA UHARIBIFU KWA BIASHARA YAKO YA ${crop.toUpperCase()}` : isFrench ? `RAPPORT DE DÉGÂTS POUR VOTRE ENTREPRISE ${crop.toUpperCase()}` : isSpanish ? `INFORME DE DAÑOS PARA SU EMPRESA ${crop.toUpperCase()}` : `DAMAGE REPORT FOR YOUR ${crop.toUpperCase()} ENTERPRISE`, plantsDamaged: 0, message: isSwahili ? "Hakuna uharibifu ulioripotiwa." : isFrench ? "Aucun dommage signalé." : isSpanish ? "Ningún daño reportado." : "No damage reported.", advice: isSwahili ? "Endelea kufuatilia afya ya shamba lako." : isFrench ? "Continuez à surveiller la santé de votre exploitation." : isSpanish ? "Continúe monitoreando la salud de su finca." : "Continue monitoring your farm health.", followUp: isSwahili ? "Kwa ushauri zaidi, tumia mfumo wetu wa Maswali na Majibu." : isFrench ? "Pour plus de conseils, utilisez notre système Q&A." : isSpanish ? "Para más consejos, use nuestro sistema de P&R." : "For more advice, use our Q&A system.", crop: crop.toUpperCase(), plants: 0 } });
  }

  // ========== GROUP 15: CONSERVATION ==========
  const conservationPractices = farmerData.conservationPractices ? farmerData.conservationPractices.split(',').map(p => p.trim()) : [];
  if (conservationPractices.length > 0) {
    const conservationLines: string[] = [];
    conservationLines.push(isSwahili ? `UHIFADHI WA UDONGO NA MAJI KWA BIASHARA YAKO YA ${crop.toUpperCase()}` : isFrench ? `CONSERVATION DES SOLS ET DE L'EAU POUR VOTRE ENTREPRISE ${crop.toUpperCase()}` : isSpanish ? `CONSERVACIÓN DE SUELO Y AGUA PARA SU EMPRESA ${crop.toUpperCase()}` : `SOIL AND WATER CONSERVATION FOR YOUR ${crop.toUpperCase()} ENTERPRISE`);
    conservationLines.push(isSwahili ? `Tayari unatumia: ${conservationPractices.filter(p => p !== 'None').join(', ')}. Kazi nzuri!` : isFrench ? `Vous utilisez déjà : ${conservationPractices.filter(p => p !== 'None').join(', ')}. Bon travail !` : isSpanish ? `Ya está usando: ${conservationPractices.filter(p => p !== 'None').join(', ')}. ¡Buen trabajo!` : `You're already using: ${conservationPractices.filter(p => p !== 'None').join(', ')}. Great job!`);
    conservationLines.push('');
    conservationLines.push(isSwahili ? "NJIA ZILIZOPENDEKEZWA" : isFrench ? "PRATIQUES RECOMMANDÉES" : isSpanish ? "PRÁCTICAS RECOMENDADAS" : 'RECOMMENDED PRACTICES');
    conservationLines.push(isSwahili ? "Samadi: Endelea kuweka tani 5-10 kwa ekari. Inaboresha muundo wa udongo na uwezo wa kuhifadhi maji." : isFrench ? "Fumier : Continuez à appliquer 5-10 tonnes par acre. Améliore la structure du sol et la capacité de rétention d'eau." : isSpanish ? "Estiércol: Continúe aplicando 5-10 toneladas por acre. Mejora la estructura del suelo y la capacidad de retención de agua." : '• Organic Manure: Continue applying 5-10 tons per acre. It improves soil structure and water holding capacity.');
    conservationLines.push(isSwahili ? "Matuta: Bora kwa miteremko! Inapunguza mmonyoko wa udongo hadi 80%." : isFrench ? "Terrasses : Excellentes pour les pentes ! Réduit l'érosion du sol jusqu'à 80%." : isSpanish ? "Terrazas: ¡Excelentes para pendientes! Reduce la erosión del suelo hasta en un 80%." : '• Terracing: Excellent for slopes! Reduces soil erosion by up to 80%.');
    conservationLines.push(isSwahili ? `Kufunika: Kuhifadhi unyevu, kupunguza palizi. Tumia mabaki ya mazao - NI BURE! (Saves ${formatCurrency(5000)}/acre)` : isFrench ? `Paillage : Retient l'humidité, réduit le désherbage. Utilisez les résidus de culture - c'est GRATUIT ! (Économise ${formatCurrency(5000)}/acre)` : isSpanish ? `Acolchado: Retiene humedad, reduce deshierbe. Use residuos de cultivos - ¡es GRATIS! (Ahorra ${formatCurrency(5000)}/acre)` : `• Mulching: Retains moisture, reduces weeding. Use crop residues - it's FREE! (Saves ${formatCurrency(5000)}/acre)`);
    conservationLines.push(isSwahili ? `Mazao ya kufunika: Panda mucuna au dolichos kati ya mistari. Hutoa kilo 40 N/ekari kiasili! (Yanaokoa ${formatCurrency(3500)} ya mbolea)` : isFrench ? `Cultures de couverture : Plantez du mucuna ou du dolichos entre les rangs. Fixe 40 kg N/acre naturellement ! (Économise ${formatCurrency(3500)} d'engrais)` : isSpanish ? `Cultivos de cobertura: Plante mucuna o dolichos entre hileras. ¡Fija 40 kg N/acre naturalmente! (Ahorra ${formatCurrency(3500)} de fertilizante)` : `• Cover crops: Plant mucuna or dolichos between rows. Fixes 40kg N/acre naturally! (Saves ${formatCurrency(3500)} fertilizer)`);
    conservationLines.push(isSwahili ? `Kuvuna maji ya mvua: Jenga mabirika - 1,000m³ yanagharimu ${formatCurrency(200000)}, yanadumu miaka 10.` : isFrench ? `Collecte des eaux de pluie : Construisez des bassins - un bassin de 1 000 m³ coûte ${formatCurrency(200000)} et dure 10 ans.` : isSpanish ? `Captación de agua de lluvia: Construya reservorios - un reservorio de 1,000 m³ cuesta ${formatCurrency(200000)} y dura 10 años.` : `• Rainwater harvesting: Build water pans - 1,000m³ pan costs ${formatCurrency(200000)}, lasts 10 years.`);
    conservationLines.push(isSwahili ? "Kilimo cha mtaro: Kwenye miteremko >5% - inapunguza mmonyoko kwa 50% na kuhifadhi maji." : isFrench ? "Culture en courbes de niveau : Sur les pentes >5% - réduit l'érosion de 50% et retient l'eau." : isSpanish ? "Siembra en curvas de nivel: En pendientes >5% - reduce la erosión en un 50% y retiene agua." : '• Contour farming: On slopes >5% - reduces erosion by 50% and retains water.');
    conservationLines.push('');
    conservationLines.push(isSwahili ? "HALI YA BIASHARA" : isFrench ? "CAS COMMERCIAL" : isSpanish ? "CASO DE NEGOCIO" : 'BUSINESS CASE');
    conservationLines.push(isSwahili ? `Kufunika kunaokoa palizi mara 2 = ${formatCurrency(5000)}/ekari iliyookolewa\nMazao ya kufunika hutoa kilo 40 N/ekari = yanaokoa ${formatCurrency(3500)} ya mbolea\nKila ${currencySymbol}1 inayowekezwa katika uhifadhi inarudisha ${currencySymbol}5 katika kuokoa pembejeo na kuongeza mavuno` : isFrench ? `Le paillage permet d'économiser 2 désherbages = ${formatCurrency(5000)}/acre économisés\nLes cultures de couverture fixent 40 kg N/acre = économisent ${formatCurrency(3500)} d'engrais\nChaque ${currencySymbol}1 investi dans la conservation rapporte ${currencySymbol}5 en intrants économisés et en rendements accrus` : isSpanish ? `El acolchado ahorra 2 rondas de deshierbe = ${formatCurrency(5000)}/acre ahorrados\nLos cultivos de cobertura fijan 40 kg N/acre = ahorran ${formatCurrency(3500)} de fertilizante\nCada ${currencySymbol}1 invertido en conservación retorna ${currencySymbol}5 en ahorro de insumos y mayores rendimientos` : `Mulching saves 2 weeding rounds = ${formatCurrency(5000)}/acre saved\nCover crops fix 40kg N/acre = saves ${formatCurrency(3500)} fertilizer\nEvery ${currencySymbol}1 invested in conservation returns ${currencySymbol}5 in saved inputs and increased yields`);
    structuredList.push({ key: 'conservation_grouped', params: { content: conservationLines.join('\n'), crop: crop.toUpperCase(), practices: conservationPractices.filter(p => p !== 'None').join(', '), mulchingSaved: formatCurrency(5000), coverCropsSaved: formatCurrency(3500), amount: formatCurrency(200000), symbol: currencySymbol } });
  } else {
    structuredList.push({ key: 'conservation_grouped', params: { content: isSwahili ? `${`UHIFADHI WA UDONGO NA MAJI KWA BIASHARA YAKO YA ${crop.toUpperCase()}`}\nNJIA ZILIZOPENDEKEZWA\nSamadi: Weka tani 5-10 kwa ekari.\nMatuta: Bora kwa miteremko!\nKufunika: Kuhifadhi unyevu, kupunguza palizi.\nMazao ya kufunika: Hutoa kilo 40 N/ekari kiasili!\nKuvuna maji ya mvua: Jenga mabirika.\nKilimo cha mtaro: Kwenye miteremko >5%.\nHALI YA BIASHARA\nKufunika kunaokoa palizi mara 2.\nMazao ya kufunika hutoa kilo 40 N/ekari.\nKila ${currencySymbol}1 inayowekezwa inarudisha ${currencySymbol}5.` : isFrench ? `${`CONSERVATION DES SOLS ET DE L'EAU POUR VOTRE ENTREPRISE ${crop.toUpperCase()}`}\nPRATIQUES RECOMMANDÉES\nFumier : Appliquez 5-10 tonnes par acre.\nTerrasses : Excellentes pour les pentes !\nPaillage : Retient l'humidité, réduit le désherbage.\nCultures de couverture : Fixent 40 kg N/acre naturellement !\nCollecte des eaux de pluie : Construisez des bassins.\nCulture en courbes de niveau : Sur les pentes >5%.\nCAS COMMERCIAL\nLe paillage permet d'économiser 2 désherbages.\nLes cultures de couverture fixent 40 kg N/acre.\nChaque ${currencySymbol}1 investi rapporte ${currencySymbol}5.` : isSpanish ? `${`CONSERVACIÓN DE SUELO Y AGUA PARA SU EMPRESA ${crop.toUpperCase()}`}\nPRÁCTICAS RECOMENDADAS\nEstiércol: Aplique 5-10 toneladas por acre.\nTerrazas: ¡Excelentes para pendientes!\nAcolchado: Retiene humedad, reduce deshierbe.\nCultivos de cobertura: ¡Fijan 40 kg N/acre naturalmente!\nCaptación de agua de lluvia: Construya reservorios.\nSiembra en curvas de nivel: En pendientes >5%.\nCASO DE NEGOCIO\nEl acolchado ahorra 2 rondas de deshierbe.\nLos cultivos de cobertura fijan 40 kg N/acre.\nCada ${currencySymbol}1 invertido retorna ${currencySymbol}5.` : `SOIL AND WATER CONSERVATION FOR YOUR ${crop.toUpperCase()} ENTERPRISE\nRECOMMENDED PRACTICES\n• Organic Manure: Apply 5-10 tons per acre.\n• Terracing: Excellent for slopes!\n• Mulching: Retains moisture, reduces weeding.\n• Cover crops: Fix 40kg N/acre naturally!\n• Rainwater harvesting: Build water pans.\n• Contour farming: On slopes >5%.\nBUSINESS CASE\nMulching saves 2 weeding rounds.\nCover crops fix 40kg N/acre.\nEvery ${currencySymbol}1 invested returns ${currencySymbol}5.`, crop: crop.toUpperCase(), practices: 'None', mulchingSaved: formatCurrency(5000), coverCropsSaved: formatCurrency(3500), amount: formatCurrency(200000), symbol: currencySymbol } });
  }

  // ========== GROUP 16: POST-HARVEST HANDLING & STORAGE ==========
  if (farmerData.storageMethod) {
    const storageMethod = farmerData.storageMethod;
    const phLines: string[] = [];
    phLines.push(isSwahili ? `USHUGHULIKAJI NA UHIFADHI WA MAVUNO KWA BIASHARA YAKO YA ${crop.toUpperCase()}` : isFrench ? `MANUTENTION ET STOCKAGE POST-RÉCOLTE POUR VOTRE ENTREPRISE ${crop.toUpperCase()}` : isSpanish ? `MANIPULACIÓN Y ALMACENAMIENTO POST-COSECHA PARA SU EMPRESA ${crop.toUpperCase()}` : `POST-HARVEST HANDLING & STORAGE FOR YOUR ${crop.toUpperCase()} ENTERPRISE`);
    phLines.push(isSwahili ? `Njia yako ya uhifadhi: ${storageMethod}` : isFrench ? `Votre méthode de stockage : ${storageMethod}` : isSpanish ? `Su método de almacenamiento: ${storageMethod}` : `Your storage method: ${storageMethod}`);
    phLines.push('');
    const lossWarning = getPostHarvestLossWarning(crop, language);
    phLines.push(lossWarning);
    phLines.push('');
    const methodLower = storageMethod.toLowerCase();
    let advice = '';
    if (methodLower.includes('hermetic')) {
      advice = isSwahili ? "Tumia magunia yasiyopitisha hewa. Funga vizuri na hifadhi mahali pakavu. Huzuia wadudu na kuhifadhi ubora kwa miezi 12+." : isFrench ? "Utilisez des sacs hermétiques. Fermez bien et stockez dans un endroit sec. Empêche les insectes et préserve la qualité pendant 12+ mois." : isSpanish ? "Use sacos herméticos. Selle bien y almacene en lugar seco. Previene insectos y preserva la calidad por 12+ meses." : "Use hermetic bags – seal properly and store in a dry place. Prevents insects and preserves quality for 12+ months.";
    } else if (methodLower.includes('sold immediately')) {
      advice = isSwahili ? "Kuuza mara moja kunakupa pesa haraka, lakini unaweza kupoteza fursa ya bei ya juu baadaye. Hifadhi sehemu ya mavuno kwa miezi 2-3. Panga na chemsha mavuno ili kupata bei bora." : isFrench ? "Vendre immédiatement donne de l'argent rapidement, mais vous manquez des prix plus élevés plus tard. Stockez une partie de votre récolte pendant 2-3 mois. Triez et calibrez pour obtenir de meilleurs prix." : isSpanish ? "Vender inmediatamente da dinero rápido, pero puede perder precios más altos después. Almacene parte de su cosecha por 2-3 meses. Seleccione y calibre para obtener mejores precios." : "Selling immediately gives quick cash, but you miss higher prices later. Store part of your harvest for 2-3 months. Sort and grade to get better prices.";
    } else {
      advice = isSwahili ? "Kausha vizuri, ondoa mabaki, na hifadhi mahali pakavu, baridi, na kisafi. Angalia mara kwa mara wadudu au ukungu." : isFrench ? "Séchez bien, retirez les débris et stockez dans un endroit sec, frais et propre. Inspectez régulièrement à la recherche de parasites ou de moisissures." : isSpanish ? "Seque bien, retire los residuos y almacene en un lugar seco, fresco y limpio. Inspeccione regularmente por insectos o moho." : "Dry well, remove debris, and store in a dry, cool, clean place. Inspect regularly for pests or mold.";
    }
    phLines.push(advice);
    phLines.push('');

    const sortingAdvice = getSortingGradingAdvice(crop, language);
    phLines.push(sortingAdvice);
    const valueAdvice = getValueAdditionSuggestion(crop, language);
    phLines.push(valueAdvice);
    phLines.push('');
    phLines.push(isSwahili ? "TAARIFA YA BIASHARA: Kupunguza hasara za baada ya mavuno kwa 10% kunaongeza faida yako kwa 10% bila gharama za ziada za uzalishaji! Panga na chemsha mavuno yako kwa bei bora." : isFrench ? "CONSEIL COMMERCIAL : Réduire les pertes post-récolte de 10 % augmente votre profit de 10 % sans frais de production supplémentaires ! Triez et calibrez pour de meilleurs prix." : isSpanish ? "CONSEJO COMERCIAL: Reducir las pérdidas postcosecha en un 10% aumenta su ganancia en un 10% sin costos adicionales de producción! Seleccione y calibre para mejores precios." : "BUSINESS TIP: Reducing post-harvest losses by 10% increases your profit by 10% with no extra production costs! Sort and grade for better prices.");
    structuredList.push({ key: 'postharvest_grouped', params: { content: phLines.join('\n'), method: storageMethod, crop: crop.toUpperCase() } });
  }

  // ========== GROUP 17: BUSINESS ==========
  const businessLines: string[] = [];
  if (isSwahili) {
    businessLines.push("KILIMO KAMA BIASHARA - ONGEZA FAIDA YAKO");
    businessLines.push('');
    businessLines.push("1. JUA GHARAMA ZAKO");
    businessLines.push("Fuatilia KILA pembejeo: mbegu, mbolea, kazi, usafirishaji, magunia");
    businessLines.push(`Mfano mahindi ya kati: Gharama ${formatCurrency(40000)}/hekta`);
    businessLines.push('');
    businessLines.push("2. NUNUA KWA JUMLA (Okoa 20-30%)");
    businessLines.push(`DAP: gunia 50kg ${formatCurrency(3500)} -> Nunua magunia 10 ${formatCurrency(31500)} (okoa ${formatCurrency(3500)})`);
    businessLines.push(`CAN: gunia 50kg ${formatCurrency(3200)} -> Nunua magunia 10 ${formatCurrency(28800)} (okoa ${formatCurrency(3200)})`);
    businessLines.push('');
    businessLines.push("3. UNDA VIKUNDI VYA WAKULIMA");
    businessLines.push("Ununuzi wa jumla wa pembejeo: Okoa 15-25%");
    businessLines.push(`Usafirishaji wa pamoja: Okoa ${formatCurrency(5000)}/ekari`);
    businessLines.push("Uuzaji wa pamoja: Pata bei 10-20% za juu");
    businessLines.push('');
    businessLines.push("4. AWAMU YA KUONGEZEKA");
    businessLines.push(`Kila ${currencySymbol}1 ya ziada inayowekezwa inarudisha ${currencySymbol}3-5 faida`);
    businessLines.push("Endelea kuwekeza - pembejeo zaidi = faida zaidi");
    businessLines.push('');
    businessLines.push(`MATOKEO YA MWISHO: Kilimo ni BIASHARA. Fanya kila shilingi ikufanyie kazi`);
  } else if (isFrench) {
    businessLines.push("L'AGRICULTURE COMME ENTREPRISE - MAXIMISEZ VOTRE PROFIT");
    businessLines.push('');
    businessLines.push("1. CONNAISSEZ VOS COÛTS");
    businessLines.push("Suivez CHAQUE intrant : semences, engrais, main-d'œuvre, transport, sacs");
    businessLines.push(`Exemple maïs moyen : Coûts ${formatCurrency(40000)}/hectare`);
    businessLines.push('');
    businessLines.push("2. ACHETEZ EN VRAC (Économisez 20-30%)");
    businessLines.push(`DAP : sac de 50 kg ${formatCurrency(3500)} -> Achetez 10 sacs ${formatCurrency(31500)} (économisez ${formatCurrency(3500)})`);
    businessLines.push(`CAN : sac de 50 kg ${formatCurrency(3200)} -> Achetez 10 sacs ${formatCurrency(28800)} (économisez ${formatCurrency(3200)})`);
    businessLines.push('');
    businessLines.push("3. FORMEZ DES GROUPES D'AGRICULTEURS");
    businessLines.push("Achats groupés d'intrants : Économisez 15-25%");
    businessLines.push(`Transport partagé : Économisez ${formatCurrency(5000)}/acre`);
    businessLines.push("Marketing collectif : Obtenez des prix 10-20% plus élevés");
    businessLines.push('');
    businessLines.push("4. PHASE EXPONENTIELLE");
    businessLines.push(`Chaque ${currencySymbol}1 supplémentaire investi rapporte ${currencySymbol}3-5 de profit`);
    businessLines.push("Continuez à investir - plus d'intrants = plus de profits");
    businessLines.push('');
    businessLines.push(`CONCLUSION : L'agriculture est une ENTREPRISE. Faites travailler chaque centime pour vous`);
  } else if (isSpanish) {
    businessLines.push("AGRICULTURA COMO NEGOCIO - MAXIMICE SU GANANCIA");
    businessLines.push('');
    businessLines.push("1. CONOZCA SUS COSTOS");
    businessLines.push("Registre CADA insumo: semillas, fertilizante, mano de obra, transporte, sacos");
    businessLines.push(`Ejemplo maíz medio: Costos ${formatCurrency(40000)}/hectárea`);
    businessLines.push('');
    businessLines.push("2. COMPRE AL POR MAYOR (Ahorre 20-30%)");
    businessLines.push(`DAP: saco 50kg ${formatCurrency(3500)} -> Compre 10 sacos ${formatCurrency(31500)} (ahorre ${formatCurrency(3500)})`);
    businessLines.push(`CAN: saco 50kg ${formatCurrency(3200)} -> Compre 10 sacos ${formatCurrency(28800)} (ahorre ${formatCurrency(3200)})`);
    businessLines.push('');
    businessLines.push("3. FORME GRUPOS DE AGRICULTORES");
    businessLines.push("Compras al por mayor de insumos: Ahorre 15-25%");
    businessLines.push(`Transporte compartido: Ahorre ${formatCurrency(5000)}/acre`);
    businessLines.push("Comercialización colectiva: Obtenga precios 10-20% más altos");
    businessLines.push('');
    businessLines.push("4. FASE EXPONENCIAL");
    businessLines.push(`Cada ${currencySymbol}1 adicional invertido retorna ${currencySymbol}3-5 de ganancia`);
    businessLines.push("Siga invirtiendo - más insumos = más ganancias");
    businessLines.push('');
    businessLines.push(`RESULTADO FINAL: La agricultura es un NEGOCIO. ¡Haga que cada ${currencySymbol} trabaje para usted!`);
  } else {
    businessLines.push('FARMING AS A BUSINESS - MAXIMIZE YOUR PROFIT');
    businessLines.push('');
    businessLines.push('1. KNOW YOUR COSTS');
    businessLines.push('Track EVERY input: seeds, fertilizer, labour, transport, bags');
    businessLines.push(`Example maize medium: Costs ${formatCurrency(40000)}/hectare`);
    businessLines.push('');
    businessLines.push('2. BUY IN BULK (Save 20-30%)');
    businessLines.push(`DAP: 50kg bag ${formatCurrency(3500)} -> Buy 10 bags ${formatCurrency(31500)} (save ${formatCurrency(3500)})`);
    businessLines.push(`CAN: 50kg bag ${formatCurrency(3200)} -> Buy 10 bags ${formatCurrency(28800)} (save ${formatCurrency(3200)})`);
    businessLines.push('');
    businessLines.push('3. FORM FARMER GROUPS');
    businessLines.push('Bulk input purchases: Save 15-25%');
    businessLines.push(`Shared transport: Save ${formatCurrency(5000)}/acre`);
    businessLines.push('Collective marketing: Get 10-20% higher prices');
    businessLines.push('');
    businessLines.push('4. EXPONENTIAL PHASE');
    businessLines.push(`Every additional ${currencySymbol}1 input returns ${currencySymbol}3-5 profit`);
    businessLines.push('Keep investing - more inputs = more profits');
    businessLines.push('');
    businessLines.push(`BOTTOM LINE: Farming is a BUSINESS. Make every ${currencySymbol} work for you`);
  }
  structuredList.push({ key: 'business_grouped', params: { content: businessLines.join('\n'), amount: formatCurrency(40000), single: formatCurrency(3500), ten: formatCurrency(31500), saved: formatCurrency(3500), symbol: currencySymbol } });

  // ========== FINANCIAL ADVICE ==========
  const financialParams: Record<string, any> = { symbol: currencySymbol };
  if (hasSoilTest && fertilizerPlan?.totalCost) { financialParams.totalInvestment = formatCurrency(fertilizerPlan.totalCost); }
  const structuredFinancialAdvice: RecommendationItem = { key: 'financial_advice', params: financialParams };

  // ========== GROUP: CROP NUTRITION & HEALTH BENEFITS (with Spanish) ==========
  if (farmerData.wantsNutritionBenefits === true) {
    const { getCropBenefits } = await import('@/lib/data/cropBenefits');
    const cropBenefits = getCropBenefits(crop);

    // Translation maps for Swahili, French, Spanish (nutrients – short phrase replacement is fine)
    const nutrientTranslations: Record<string, Record<string, string>> = {
      sw: {
        'Caffeine': 'Kafeini',
        'Riboflavin': 'Riboflavini',
        'Magnesium': 'Magnesiamu',
        'Potassium': 'Potasiamu',
        'Antioxidants': 'Vioksidishaji',
        'Niacin': 'Niasini',
        'Manganese': 'Manganesi',
        'Chlorogenic acid': 'Asidi Klorojeniki',
        'high': 'nyingi',
        'varies': 'inatofautiana',
        '% of Daily Value': '% ya Kiwango cha Kila Siku'
      },
      fr: {
        'Caffeine': 'Caféine',
        'Riboflavin': 'Riboflavine',
        'Magnesium': 'Magnésium',
        'Potassium': 'Potassium',
        'Antioxidants': 'Antioxydants',
        'Niacin': 'Niacine',
        'Manganese': 'Manganèse',
        'Chlorogenic acid': 'Acide chlorogénique',
        'high': 'élevé',
        'varies': 'varie',
        '% of Daily Value': '% de l\'apport journalier'
      },
      es: {
        'Caffeine': 'Cafeína',
        'Riboflavin': 'Riboflavina',
        'Magnesium': 'Magnesio',
        'Potassium': 'Potasio',
        'Antioxidants': 'Antioxidantes',
        'Niacin': 'Niacina',
        'Manganese': 'Manganeso',
        'Chlorogenic acid': 'Ácido clorogénico',
        'high': 'alto',
        'varies': 'varía',
        '% of Daily Value': '% del valor diario'
      }
    };

    // FULL‑SENTENCE HEALTH TRANSLATIONS
    const healthTranslationsFull: Record<string, Record<string, string>> = {
      sw: {
        'Loves your heart – potassium lowers blood pressure':
          'Hupenda moyo wako – potasiamu hupunguza shinikizo la damu',
        'Gently lowers blood pressure – potassium balances fluids':
          'Hupunguza shinikizo la damu kwa upole – potasiamu husawazisha maji mwilini',
        'Aids digestion – pectin and resistant starch':
          'Husaidia usagaji chakula – pectin na wanga sugu',
        'Boosts exercise recovery – carbohydrates and potassium':
          'Huongeza nafuu baada ya mazoezi – wanga na potasiamu',
        'Lifts your mood – vitamin B6 aids serotonin production':
          'Huongeza hisia zako – Vitamini B6 husaidia uzalishaji wa serotonini',
        'Helps with weight control – satiety':
          'Husaidia kudhibiti uzito – kushibisha',
        'Strengthens bones – manganese':
          'Hunyosha mifupa – manganesi',
        'Protects your kidneys – may reduce risk of kidney stones':
          'Hulinda figo zako – hupunguza hatari ya mawe ya figo',
        'Antioxidant – dopamine and catechins':
          'Kioksidishaji – dopamini na katekisini'
      },
      fr: {
        'Alertness – caffeine blocks adenosine': 'Éveille votre vigilance – la caféine bloque l\'adénosine',
        'Antioxidant – reduces oxidative stress': 'Antioxydant – réduit le stress oxydatif',
        'Brain health – may lower risk of Alzheimer\'s': 'Santé du cerveau – pourrait réduire le risque d\'Alzheimer',
        'Liver health – reduces risk of cirrhosis': 'Santé du foie – réduit le risque de cirrhose',
        'Metabolism – may boost metabolic rate': 'Métabolisme – pourrait augmenter le taux de combustion',
        'Heart health – moderate consumption protective': 'Santé cardiaque – une consommation modérée est protectrice',
        'Type 2 diabetes – may reduce risk': 'Diabète de type 2 – pourrait réduire le risque',
        'Depression – may lower risk': 'Dépression – pourrait réduire le risque',
      },
      es: {
        'Loves your heart – potassium lowers blood pressure': 'Beneficioso para el corazón – el potasio reduce la presión arterial',
        'Gently lowers blood pressure – potassium balances fluids': 'Reduce suavemente la presión arterial – el potasio equilibra los fluidos',
        'Aids digestion – pectin and resistant starch': 'Ayuda a la digestión – pectina y almidón resistente',
        'Boosts exercise recovery – carbohydrates and potassium': 'Mejora la recuperación después del ejercicio – carbohidratos y potasio',
        'Lifts your mood – vitamin B6 aids serotonin production': 'Mejora el estado de ánimo – la vitamina B6 ayuda a producir serotonina',
        'Helps with weight control – satiety': 'Ayuda a controlar el peso – sensación de saciedad',
        'Strengthens bones – manganese': 'Fortalece los huesos – manganeso',
        'Protects your kidneys – may reduce risk of kidney stones': 'Protege los riñones – puede reducir el riesgo de cálculos renales',
        'Antioxidant – dopamine and catechins': 'Antioxidante – dopamina y catequinas'
      }
    };

    const langCode = isSwahili ? 'sw' : isFrench ? 'fr' : isSpanish ? 'es' : 'en';
    const currentNutrientMap = nutrientTranslations[langCode] || {};
    const currentHealthFullMap = healthTranslationsFull[langCode] || {};

    if (cropBenefits) {
      // Translate nutrients (keyword‑based – fine)
      let nutrientsList = cropBenefits.nutrients.map(n =>
        `• ${n.name}: ${n.amount} (${n.dailyValuePercent}% of Daily Value)`
      ).join('\n');
      for (const [eng, trans] of Object.entries(currentNutrientMap)) {
        nutrientsList = nutrientsList.replace(new RegExp(eng, 'gi'), trans.toString());
      }

      // Translate health benefits – NO Swahili fallback for French or Spanish
      let healthList = cropBenefits.healthBenefits.map(benefit => {
        if (currentHealthFullMap[benefit]) {
          return currentHealthFullMap[benefit];
        }
        if (langCode === 'fr' || langCode === 'es') {
          console.warn(`⚠️ Missing health translation for "${benefit}" in ${langCode}`);
          return benefit;
        }
        if (langCode === 'sw') {
          let translated = benefit;
          const oldHealthMap: Record<string, string> = {
            'Alertness': 'Kuamka',
            'caffeine blocks adenosine': 'kafeini huzuia adenosine',
            'Antioxidant': 'Kioksidishaji',
            'reduces oxidative stress': 'hupunguza mkazo wa oksidishaji',
            'Brain health': 'Afya ya ubongo',
            'may lower risk of Alzheimer\'s': 'huweza kupunguza hatari ya Alzheimer',
            'Liver health': 'Afya ya ini',
            'reduces risk of cirrhosis': 'hupunguza hatari ya uhaba wa ini',
            'Metabolism': 'Uchomaji wa chakula',
            'may boost metabolic rate': 'huweza kuongeza kasi ya uchomaji',
            'Heart health': 'Afya ya moyo',
            'moderate consumption protective': 'matumizi ya wastani yanalinda',
            'Type 2 diabetes': 'Kisukari cha aina ya 2',
            'may reduce risk': 'huweza kupunguza hatari',
            'Depression': 'Unagoni',
            'may lower risk': 'huweza kupunguza hatari'
          };
          for (const [key, val] of Object.entries(oldHealthMap)) {
            translated = translated.replace(new RegExp(key, 'gi'), val);
          }
          return translated;
        }
        return benefit;
      }).join('\n');

      structuredList.push({
        key: 'crop_benefits_grouped',
        params: {
          title: isSwahili ? `🌿 LISHE NA FAIDA ZA KIAFYA – ${crop.toUpperCase()}` : isFrench ? `🌿 NUTRITION ET BIENFAITS POUR LA SANTÉ – ${crop.toUpperCase()}` : isSpanish ? `🌿 NUTRICIÓN Y BENEFICIOS PARA LA SALUD – ${crop.toUpperCase()}` : `🌿 NUTRITION & HEALTH BENEFITS – ${crop.toUpperCase()}`,
          subtitle: isSwahili ? "Kwa kila gramu 100 ya zao mbichi" : isFrench ? "Pour 100g de produit frais" : isSpanish ? "Por cada 100 g de peso fresco" : 'Per 100g fresh weight',
          nutrientsHeader: isSwahili ? "Virutubisho Muhimu" : isFrench ? "Nutriments Clés" : isSpanish ? "Nutrientes Clave" : 'Key Nutrients',
          nutrientsList: nutrientsList,
          healthHeader: isSwahili ? "Faida za Kiafya" : isFrench ? "Bienfaits pour la Santé" : isSpanish ? "Beneficios para la Salud" : 'Health Benefits',
          healthList: healthList
        }
      });
    } else {
      let nutrientsList = isSwahili ? "• Virutubisho mbalimbali kulingana na aina" : isFrench ? "• Nutriments variés selon la variété" : isSpanish ? "• Nutrientes variados según la variedad" : '• Varied nutrients depending on variety';
      let healthList = isSwahili ? "• Inasaidia afya kwa ujumla\n• Ina vitamini na madini mbalimbali" : isFrench ? "• Soutient la santé globale\n• Riche en vitamines et minéraux" : isSpanish ? "• Apoya la salud en general\n• Rico en vitaminas y minerales" : '• Supports overall health\n• Rich in vitamins and minerals';

      structuredList.push({
        key: 'crop_benefits_grouped',
       params: {
          title: isSwahili ? `🌿 LISHE NA FAIDA ZA KIAFYA – ${crop.toUpperCase()} (Kwa Ujumla)` : isFrench ? `🌿 NUTRITION ET BIENFAITS POUR LA SANTÉ – ${crop.toUpperCase()} (Général)` : isSpanish ? `🌿 NUTRICIÓN Y BENEFICIOS – ${crop.toUpperCase()} (General)` : `🌿 NUTRITION & HEALTH BENEFITS – ${crop.toUpperCase()} (General)`,
          subtitle: isSwahili ? "Kwa kila gramu 100 ya zao mbichi" : isFrench ? "Pour 100g de produit frais" : isSpanish ? "Por cada 100 g de peso fresco" : 'Per 100g fresh weight',
          nutrientsHeader: isSwahili ? "Virutubisho Muhimu" : isFrench ? "Nutriments Clés" : isSpanish ? "Nutrientes Clave" : 'Key Nutrients',
          nutrientsList: nutrientsList,
          healthHeader: isSwahili ? "Faida za Kiafya" : isFrench ? "Bienfaits pour la Santé" : isSpanish ? "Beneficios para la Salud" : 'Health Benefits',
          healthList: healthList
        }
      });
    }
  }

  // ========== FINAL STEPS ==========
  const list = structuredList.map(item => item.key + (item.params ? JSON.stringify(item.params) : ''));
  const financialAdvice = structuredFinancialAdvice.key;

  return { list, financialAdvice, structuredList, structuredFinancialAdvice };
}