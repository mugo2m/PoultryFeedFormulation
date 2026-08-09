// lib/feedFormulation.ts
// Complete Poultry Feed Formulation Engine
// This module calculates custom feed formulations based on breed, stage, quantity, available ingredients, and custom prices.

export interface Ingredient {
  name: string;
  amountKg: number;      // Amount needed for the batch (after adjusting for available ingredients)
  percent: number;       // Percentage in the formula
  cost: number;          // Total cost for this ingredient in the batch
  pricePerKg: number;    // Price per kg (in KES equivalent)
  available: boolean;    // True if the farmer already has this ingredient
}

export interface NutritionalSummary {
  protein: number;       // Crude protein %
  calcium: number;       // Calcium %
  energy: number;        // Energy in kcal/kg (ME)
}

export interface FeedResult {
  ingredients: Ingredient[];
  totalCost: number;     // Total cost in base currency (KES or local)
  nutritionalSummary: NutritionalSummary;
  mixingInstructions: string;
  warnings: string[];
  structuredList: Array<{ key: string; params: { content: string } }>; // For voice/display
}

// ========== DEFAULT INGREDIENT PRICES (KES per kg) ==========
const DEFAULT_INGREDIENT_PRICES: Record<string, number> = {
  'broken maize': 40,
  'soya bean meal': 150,
  'fish meal': 200,
  'sunflower cake': 80,
  'wheat bran': 30,
  'maize bran': 25,
  'wheat pollard': 35,
  'cotton seed cake': 100,
  'lime': 20,
  'dcp': 120,
  'premix': 300,
  'methionine': 600,
  'lysine': 500,
  'threonine': 600,
  'tryptophan': 800,
  'salt': 50,
  'toxin binder': 200,
};

// ========== COUNTRY PRICE MULTIPLIERS ==========
const COUNTRY_PRICE_MULTIPLIERS: Record<string, number> = {
  'kenya': 1.0,
  'uganda': 1.1,
  'tanzania': 1.05,
  'rwanda': 1.1,
  'burundi': 1.15,
  'south africa': 0.9,
  'zambia': 1.1,
  'zimbabwe': 1.2,
  'malawi': 1.15,
  'nigeria': 1.3,
  'ghana': 1.25,
  'ethiopia': 1.2,
};

// ========== GET INGREDIENT PRICE (with custom override) ==========
function getIngredientPrice(
  ingredient: string,
  country: string = 'kenya',
  customPrices?: Record<string, number>
): number {
  const normalizedIngredient = ingredient.toLowerCase().trim();
  // If custom price provided and valid, use it
  if (customPrices && customPrices[normalizedIngredient] !== undefined && customPrices[normalizedIngredient] > 0) {
    return customPrices[normalizedIngredient];
  }
  // Otherwise use default with country multiplier
  const basePrice = DEFAULT_INGREDIENT_PRICES[normalizedIngredient] || 100;
  const multiplier = COUNTRY_PRICE_MULTIPLIERS[country.toLowerCase()] || 1.0;
  return basePrice * multiplier;
}

// ========== FEED FORMULAS ==========
// Each formula is a percentage breakdown of ingredients for 100 kg of feed.
// Format: { ingredientName: percentage }
// ALL FORMULAS NOW SUM TO EXACTLY 100.00%
interface FeedFormula {
  [ingredient: string]: number;
}

const FORMULAS: Record<string, Record<string, FeedFormula>> = {
  // BREED: Local
  'local': {
    'starter': {
      'broken maize': 53.45,
      'soya bean meal': 22,
      'fish meal': 6,
      'sunflower cake': 4,
      'wheat bran': 0,
      'maize bran': 3,
      'wheat pollard': 2,
      'cotton seed cake': 5,
      'lime': 2.0,
      'dcp': 1.2,
      'premix': 0.5,
      'methionine': 0.2,
      'lysine': 0.12,
      'threonine': 0.08,
      'tryptophan': 0.05,
      'salt': 0.3,
      'toxin binder': 0.1,
    },
    'grower': {
      'broken maize': 59.12,
      'soya bean meal': 19,
      'fish meal': 4,
      'sunflower cake': 4,
      'wheat bran': 0,
      'maize bran': 3,
      'wheat pollard': 2,
      'cotton seed cake': 5,
      'lime': 1.8,
      'dcp': 0.8,
      'premix': 0.5,
      'methionine': 0.15,
      'lysine': 0.1,
      'threonine': 0.08,
      'tryptophan': 0.05,
      'salt': 0.3,
      'toxin binder': 0.1,
    },
    'layer': {
      'broken maize': 53.95,
      'soya bean meal': 17,
      'fish meal': 3.5,
      'sunflower cake': 4,
      'wheat bran': 0,
      'maize bran': 2,
      'wheat pollard': 3,
      'cotton seed cake': 4,
      'lime': 10.0,
      'dcp': 1.2,
      'premix': 0.5,
      'methionine': 0.2,
      'lysine': 0.12,
      'threonine': 0.08,
      'tryptophan': 0.05,
      'salt': 0.3,
      'toxin binder': 0.1,
    },
  },

  // BREED: Layers (commercial)
  'layers': {
    'starter': {
      'broken maize': 53.45,
      'soya bean meal': 22,
      'fish meal': 6,
      'sunflower cake': 4,
      'wheat bran': 0,
      'maize bran': 3,
      'wheat pollard': 2,
      'cotton seed cake': 5,
      'lime': 2.0,
      'dcp': 1.2,
      'premix': 0.5,
      'methionine': 0.2,
      'lysine': 0.12,
      'threonine': 0.08,
      'tryptophan': 0.05,
      'salt': 0.3,
      'toxin binder': 0.1,
    },
    'grower': {
      'broken maize': 59.12,
      'soya bean meal': 19,
      'fish meal': 4,
      'sunflower cake': 4,
      'wheat bran': 0,
      'maize bran': 3,
      'wheat pollard': 2,
      'cotton seed cake': 5,
      'lime': 1.8,
      'dcp': 0.8,
      'premix': 0.5,
      'methionine': 0.15,
      'lysine': 0.1,
      'threonine': 0.08,
      'tryptophan': 0.05,
      'salt': 0.3,
      'toxin binder': 0.1,
    },
    'layer': {
      'broken maize': 53.95,
      'soya bean meal': 17,
      'fish meal': 3.5,
      'sunflower cake': 4,
      'wheat bran': 0,
      'maize bran': 2,
      'wheat pollard': 3,
      'cotton seed cake': 4,
      'lime': 10.0,
      'dcp': 1.2,
      'premix': 0.5,
      'methionine': 0.2,
      'lysine': 0.12,
      'threonine': 0.08,
      'tryptophan': 0.05,
      'salt': 0.3,
      'toxin binder': 0.1,
    },
  },

  // BREED: Sasso
  'sasso': {
    'starter': {
      'broken maize': 53.45,
      'soya bean meal': 22,
      'fish meal': 6,
      'sunflower cake': 4,
      'wheat bran': 0,
      'maize bran': 3,
      'wheat pollard': 2,
      'cotton seed cake': 5,
      'lime': 2.0,
      'dcp': 1.2,
      'premix': 0.5,
      'methionine': 0.2,
      'lysine': 0.12,
      'threonine': 0.08,
      'tryptophan': 0.05,
      'salt': 0.3,
      'toxin binder': 0.1,
    },
    'grower': {
      'broken maize': 59.12,
      'soya bean meal': 19,
      'fish meal': 4,
      'sunflower cake': 4,
      'wheat bran': 0,
      'maize bran': 3,
      'wheat pollard': 2,
      'cotton seed cake': 5,
      'lime': 1.8,
      'dcp': 0.8,
      'premix': 0.5,
      'methionine': 0.15,
      'lysine': 0.1,
      'threonine': 0.08,
      'tryptophan': 0.05,
      'salt': 0.3,
      'toxin binder': 0.1,
    },
    'layer': {
      'broken maize': 53.95,
      'soya bean meal': 17,
      'fish meal': 3.5,
      'sunflower cake': 4,
      'wheat bran': 0,
      'maize bran': 2,
      'wheat pollard': 3,
      'cotton seed cake': 4,
      'lime': 10.0,
      'dcp': 1.2,
      'premix': 0.5,
      'methionine': 0.2,
      'lysine': 0.12,
      'threonine': 0.08,
      'tryptophan': 0.05,
      'salt': 0.3,
      'toxin binder': 0.1,
    },
  },

  // BREED: Kenbrew
  'kenbrew': {
    'starter': {
      'broken maize': 53.45,
      'soya bean meal': 22,
      'fish meal': 6,
      'sunflower cake': 4,
      'wheat bran': 0,
      'maize bran': 3,
      'wheat pollard': 2,
      'cotton seed cake': 5,
      'lime': 2.0,
      'dcp': 1.2,
      'premix': 0.5,
      'methionine': 0.2,
      'lysine': 0.12,
      'threonine': 0.08,
      'tryptophan': 0.05,
      'salt': 0.3,
      'toxin binder': 0.1,
    },
    'grower': {
      'broken maize': 59.12,
      'soya bean meal': 19,
      'fish meal': 4,
      'sunflower cake': 4,
      'wheat bran': 0,
      'maize bran': 3,
      'wheat pollard': 2,
      'cotton seed cake': 5,
      'lime': 1.8,
      'dcp': 0.8,
      'premix': 0.5,
      'methionine': 0.15,
      'lysine': 0.1,
      'threonine': 0.08,
      'tryptophan': 0.05,
      'salt': 0.3,
      'toxin binder': 0.1,
    },
    'layer': {
      'broken maize': 53.95,
      'soya bean meal': 17,
      'fish meal': 3.5,
      'sunflower cake': 4,
      'wheat bran': 0,
      'maize bran': 2,
      'wheat pollard': 3,
      'cotton seed cake': 4,
      'lime': 10.0,
      'dcp': 1.2,
      'premix': 0.5,
      'methionine': 0.2,
      'lysine': 0.12,
      'threonine': 0.08,
      'tryptophan': 0.05,
      'salt': 0.3,
      'toxin binder': 0.1,
    },
  },

  // BREED: Kroiler
  'kroiler': {
    'starter': {
      'broken maize': 53.45,
      'soya bean meal': 22,
      'fish meal': 6,
      'sunflower cake': 4,
      'wheat bran': 0,
      'maize bran': 3,
      'wheat pollard': 2,
      'cotton seed cake': 5,
      'lime': 2.0,
      'dcp': 1.2,
      'premix': 0.5,
      'methionine': 0.2,
      'lysine': 0.12,
      'threonine': 0.08,
      'tryptophan': 0.05,
      'salt': 0.3,
      'toxin binder': 0.1,
    },
    'grower': {
      'broken maize': 59.12,
      'soya bean meal': 19,
      'fish meal': 4,
      'sunflower cake': 4,
      'wheat bran': 0,
      'maize bran': 3,
      'wheat pollard': 2,
      'cotton seed cake': 5,
      'lime': 1.8,
      'dcp': 0.8,
      'premix': 0.5,
      'methionine': 0.15,
      'lysine': 0.1,
      'threonine': 0.08,
      'tryptophan': 0.05,
      'salt': 0.3,
      'toxin binder': 0.1,
    },
    'layer': {
      'broken maize': 53.95,
      'soya bean meal': 17,
      'fish meal': 3.5,
      'sunflower cake': 4,
      'wheat bran': 0,
      'maize bran': 2,
      'wheat pollard': 3,
      'cotton seed cake': 4,
      'lime': 10.0,
      'dcp': 1.2,
      'premix': 0.5,
      'methionine': 0.2,
      'lysine': 0.12,
      'threonine': 0.08,
      'tryptophan': 0.05,
      'salt': 0.3,
      'toxin binder': 0.1,
    },
  },

  // BREED: Broiler
  'broiler': {
    'starter': {
      'broken maize': 52.65,
      'soya bean meal': 25,
      'fish meal': 6,
      'sunflower cake': 4,
      'wheat bran': 0,
      'maize bran': 2,
      'wheat pollard': 2,
      'cotton seed cake': 4,
      'lime': 1.5,
      'dcp': 1.2,
      'premix': 0.5,
      'methionine': 0.3,
      'lysine': 0.2,
      'threonine': 0.15,
      'tryptophan': 0.1,
      'salt': 0.3,
      'toxin binder': 0.1,
    },
    'finisher': {
      'broken maize': 57.3,
      'soya bean meal': 22,
      'fish meal': 4,
      'sunflower cake': 4,
      'wheat bran': 0,
      'maize bran': 3,
      'wheat pollard': 2,
      'cotton seed cake': 4,
      'lime': 1.5,
      'dcp': 0.8,
      'premix': 0.5,
      'methionine': 0.2,
      'lysine': 0.15,
      'threonine': 0.1,
      'tryptophan': 0.05,
      'salt': 0.3,
      'toxin binder': 0.1,
    },
  },

  // BREED: Sussex
  'sussex': {
    'starter': {
      'broken maize': 53.45,
      'soya bean meal': 22,
      'fish meal': 6,
      'sunflower cake': 4,
      'wheat bran': 0,
      'maize bran': 3,
      'wheat pollard': 2,
      'cotton seed cake': 5,
      'lime': 2.0,
      'dcp': 1.2,
      'premix': 0.5,
      'methionine': 0.2,
      'lysine': 0.12,
      'threonine': 0.08,
      'tryptophan': 0.05,
      'salt': 0.3,
      'toxin binder': 0.1,
    },
    'grower': {
      'broken maize': 59.12,
      'soya bean meal': 19,
      'fish meal': 4,
      'sunflower cake': 4,
      'wheat bran': 0,
      'maize bran': 3,
      'wheat pollard': 2,
      'cotton seed cake': 5,
      'lime': 1.8,
      'dcp': 0.8,
      'premix': 0.5,
      'methionine': 0.15,
      'lysine': 0.1,
      'threonine': 0.08,
      'tryptophan': 0.05,
      'salt': 0.3,
      'toxin binder': 0.1,
    },
    'layer': {
      'broken maize': 53.95,
      'soya bean meal': 17,
      'fish meal': 3.5,
      'sunflower cake': 4,
      'wheat bran': 0,
      'maize bran': 2,
      'wheat pollard': 3,
      'cotton seed cake': 4,
      'lime': 10.0,
      'dcp': 1.2,
      'premix': 0.5,
      'methionine': 0.2,
      'lysine': 0.12,
      'threonine': 0.08,
      'tryptophan': 0.05,
      'salt': 0.3,
      'toxin binder': 0.1,
    },
  },
};

// ========== NUTRITIONAL TARGETS ==========
const NUTRITION_TARGETS: Record<string, { protein: number; calcium: number; energy: number }> = {
  'starter': { protein: 19, calcium: 1.0, energy: 2800 },
  'grower': { protein: 16.5, calcium: 0.9, energy: 2700 },
  'layer': { protein: 16.5, calcium: 3.8, energy: 2750 },
  'finisher': { protein: 20, calcium: 0.7, energy: 2900 },
};

// ========== MAIN FORMULATION FUNCTION ==========
export function formulateFeed(params: {
  breed: string;
  stage: string;
  quantityKg: number;
  includeCoccidiostat: boolean;
  availableIngredients?: string[];
  country?: string;
  ingredientPrices?: Record<string, number>;
}): FeedResult {
  const {
    breed,
    stage,
    quantityKg,
    includeCoccidiostat,
    availableIngredients = [],
    country = 'kenya',
    ingredientPrices = {},
  } = params;

  // Normalize inputs
  const breedKey = breed.toLowerCase().trim();
  const stageKey = stage.toLowerCase().includes('starter') ? 'starter' :
                   stage.toLowerCase().includes('grower') ? 'grower' :
                   stage.toLowerCase().includes('layer') ? 'layer' :
                   stage.toLowerCase().includes('finisher') ? 'finisher' : 'starter';

  // Validate breed and stage exist
  const breedFormulas = FORMULAS[breedKey];
  if (!breedFormulas) {
    throw new Error(`Unsupported breed: ${breed}. Supported breeds are: ${Object.keys(FORMULAS).join(', ')}`);
  }
  const formula = breedFormulas[stageKey];
  if (!formula) {
    throw new Error(`Unsupported stage: ${stage} for breed ${breed}. Supported stages are: ${Object.keys(breedFormulas).join(', ')}`);
  }

  // Calculate ingredient amounts (percentages * factor)
  const factor = quantityKg / 100;
  const ingredients: Ingredient[] = Object.entries(formula).map(([name, percent]) => {
    const amount = percent * factor;
    const pricePerKg = getIngredientPrice(name, country, ingredientPrices);
    const cost = amount * pricePerKg;
    return {
      name,
      amountKg: parseFloat(amount.toFixed(3)),
      percent: parseFloat(percent.toFixed(2)),
      cost: parseFloat(cost.toFixed(2)),
      pricePerKg: parseFloat(pricePerKg.toFixed(2)),
      available: false,
    };
  });

  // Subtract available ingredients (reduce needed quantity by 50% if farmer has some)
  const adjustedIngredients = ingredients.map(ing => {
    const hasIngredient = availableIngredients.some(avail =>
      avail.toLowerCase().includes(ing.name.toLowerCase())
    );
    if (hasIngredient) {
      const reducedAmount = ing.amountKg * 0.5;
      const reducedCost = reducedAmount * ing.pricePerKg;
      return {
        ...ing,
        amountKg: parseFloat(reducedAmount.toFixed(3)),
        cost: parseFloat(reducedCost.toFixed(2)),
        available: true,
      };
    }
    return ing;
  });

  // Remove ingredients with zero amount
  const finalIngredients = adjustedIngredients.filter(ing => ing.amountKg > 0.01);

  // Calculate total cost
  const totalCost = finalIngredients.reduce((sum, ing) => sum + ing.cost, 0);

  // Build ingredient lines for display
  const ingredientLines = finalIngredients.map(ing => {
    const availText = ing.available ? ' (you have some)' : '';
    return `${ing.name}: ${ing.amountKg.toFixed(2)} kg (${ing.cost.toFixed(2)})${availText}`;
  });

  // Nutritional summary
  const nutrition = NUTRITION_TARGETS[stageKey] || NUTRITION_TARGETS['starter'];

  // Warnings
  const warnings: string[] = [];
  if (stageKey === 'layer' && includeCoccidiostat) {
    warnings.push("⚠️ Coccidiostat is NOT allowed for laying hens – it has been removed from this formula.");
  }
  if (stageKey === 'finisher') {
    warnings.push("⚠️ Withdraw coccidiostat 5–7 days before slaughter if used.");
  }
  if (finalIngredients.length === 0) {
    warnings.push("⚠️ You seem to have all ingredients already – you may not need to buy anything!");
  }

  // Mixing instructions
  let mixingInstructions = "Mix all ingredients thoroughly. For best results, grind maize and soya meal to a fine powder before mixing.";
  if (stageKey === 'starter') {
    mixingInstructions += " Starter feed should be crumbled or mashed for young chicks.";
  } else if (stageKey === 'layer') {
    mixingInstructions += " For layers, ensure calcium is evenly distributed to prevent shell defects.";
  } else if (stageKey === 'finisher') {
    mixingInstructions += " For broiler finisher, mix with a little vegetable oil to reduce dust and increase energy.";
  }

  // Build structured list (voice_script will be added by the API route)
  const structuredList = [
    {
      key: "feed_summary",
      params: {
        content: `Feed formula for ${breed} ${stage} – ${quantityKg} kg batch`
      }
    },
    {
      key: "ingredient_list",
      params: {
        content: `Ingredients:\n${ingredientLines.join('\n')}`
      }
    },
    {
      key: "nutritional_info",
      params: {
        content: `Nutritional Summary: Protein ~${nutrition.protein}%, Calcium ~${nutrition.calcium}%, Energy ~${nutrition.energy} kcal/kg`
      }
    },
    {
      key: "total_cost",
      params: {
        content: `Total Cost: ${totalCost.toFixed(2)}`
      }
    },
    {
      key: "mixing_instructions",
      params: {
        content: mixingInstructions
      }
    }
  ];

  if (warnings.length > 0) {
    structuredList.push({
      key: "safety_warnings",
      params: {
        content: `Warnings:\n${warnings.join('\n')}`
      }
    });
  }

  return {
    ingredients: finalIngredients,
    totalCost,
    nutritionalSummary: nutrition,
    mixingInstructions,
    warnings,
    structuredList,
  };
}