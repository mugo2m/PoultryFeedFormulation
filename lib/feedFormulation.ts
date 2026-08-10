// lib/feedFormulation.ts
// Complete Poultry Feed Formulation Engine with LP Cost Optimization using yalps

import yalps from 'yalps';

export interface Ingredient {
  name: string;
  amountKg: number;
  percent: number;
  cost: number;
  pricePerKg: number;
  available: boolean;
}

export interface NutritionalSummary {
  protein: number;
  calcium: number;
  energy: number;
}

export interface FeedResult {
  ingredients: Ingredient[];
  totalCost: number;
  nutritionalSummary: NutritionalSummary;
  mixingInstructions: string;
  warnings: string[];
  structuredList: Array<{ key: string; params: { content: string } }>;
}

// ========== NUTRITIONAL COMPOSITION OF EACH INGREDIENT ==========
const INGREDIENT_NUTRIENTS: Record<string, { protein: number; calcium: number; energy: number }> = {
  'broken maize': { protein: 0.08, calcium: 0.0005, energy: 3500 },
  'soya bean meal': { protein: 0.45, calcium: 0.002, energy: 2400 },
  'fish meal': { protein: 0.60, calcium: 0.05, energy: 2000 },
  'sunflower cake': { protein: 0.35, calcium: 0.005, energy: 2000 },
  'wheat bran': { protein: 0.14, calcium: 0.001, energy: 1200 },
  'maize bran': { protein: 0.10, calcium: 0.0005, energy: 1500 },
  'wheat pollard': { protein: 0.15, calcium: 0.0008, energy: 1400 },
  'cotton seed cake': { protein: 0.38, calcium: 0.0015, energy: 1800 },
  'lime': { protein: 0, calcium: 0.38, energy: 0 },
  'dcp': { protein: 0, calcium: 0.22, energy: 0 },
  'premix': { protein: 0, calcium: 0, energy: 0 },
  'methionine': { protein: 0, calcium: 0, energy: 0 },
  'lysine': { protein: 0, calcium: 0, energy: 0 },
  'threonine': { protein: 0, calcium: 0, energy: 0 },
  'tryptophan': { protein: 0, calcium: 0, energy: 0 },
  'salt': { protein: 0, calcium: 0, energy: 0 },
  'toxin binder': { protein: 0, calcium: 0, energy: 0 },
};

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

function getIngredientPrice(
  ingredient: string,
  country: string = 'kenya',
  customPrices?: Record<string, number>
): number {
  const normalized = ingredient.toLowerCase().trim();
  if (customPrices && customPrices[normalized] !== undefined && customPrices[normalized] > 0) {
    return customPrices[normalized];
  }
  const base = DEFAULT_INGREDIENT_PRICES[normalized] || 100;
  const multiplier = COUNTRY_PRICE_MULTIPLIERS[country.toLowerCase()] || 1.0;
  return base * multiplier;
}

// ========== FEED FORMULAS ==========
const DUAL_PURPOSE_FORMULAS = {
  starter: {
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
  grower: {
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
  layer: {
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
};

const BROILER_FORMULAS = {
  starter: {
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
  finisher: {
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
};

const DUAL_PURPOSE_BREEDS = ['local', 'layers', 'sasso', 'kenbrew', 'kroiler', 'sussex'];
const FORMULAS: Record<string, Record<string, Record<string, number>>> = {};

for (const breed of DUAL_PURPOSE_BREEDS) {
  FORMULAS[breed] = {
    starter: { ...DUAL_PURPOSE_FORMULAS.starter },
    grower: { ...DUAL_PURPOSE_FORMULAS.grower },
    layer: { ...DUAL_PURPOSE_FORMULAS.layer },
  };
}

FORMULAS['broiler'] = {
  starter: { ...BROILER_FORMULAS.starter },
  finisher: { ...BROILER_FORMULAS.finisher },
};

// ========== NUTRITIONAL TARGETS ==========
const NUTRITION_TARGETS: Record<string, { protein: number; calcium: number; energy: number }> = {
  'starter': { protein: 19, calcium: 1.0, energy: 2800 },
  'grower': { protein: 16.5, calcium: 0.9, energy: 2700 },
  'layer': { protein: 16.5, calcium: 3.8, energy: 2750 },
  'finisher': { protein: 20, calcium: 0.7, energy: 2900 },
};

// ========== LP OPTIMIZATION ENGINE (using yalps) ==========
function optimizeWithLP(
  ingredientNames: string[],
  prices: Record<string, number>,
  targets: { protein: number; calcium: number; energy: number },
  quantityKg: number
): Record<string, number> | null {
  try {
    // Build objective (cost per kg)
    const objective: Record<string, number> = {};
    for (const name of ingredientNames) {
      objective[name] = prices[name] || 0;
    }

    // Define max limits for each ingredient
    const MAX_LIMITS: Record<string, number> = {
      'broken maize': 100,
      'soya bean meal': 50,
      'fish meal': 25,
      'sunflower cake': 40,
      'wheat bran': 25,
      'maize bran': 25,
      'wheat pollard': 25,
      'cotton seed cake': 30,
      'lime': 20,
      'dcp': 10,
      'premix': 2,
      'methionine': 0.5,
      'lysine': 0.5,
      'threonine': 0.5,
      'tryptophan': 0.5,
      'salt': 1.5,
      'toxin binder': 0.5,
    };

    // Build variables array
    const variables: any[] = [];
    for (const name of ingredientNames) {
      const maxLimit = MAX_LIMITS[name] || quantityKg;
      variables.push({
        name: name,
        bounds: { min: 0, max: Math.min(maxLimit, quantityKg) },
        coefficient: objective[name],
      });
    }

    // Build constraints
    const constraints = [];

    // Constraint 1: total weight
    constraints.push({
      name: 'total',
      coefficients: ingredientNames.reduce((acc, name) => {
        acc[name] = 1;
        return acc;
      }, {} as Record<string, number>),
      bounds: { min: quantityKg - 1.0, max: quantityKg + 1.0 },
    });

    // Constraint 2: protein
    constraints.push({
      name: 'protein',
      coefficients: ingredientNames.reduce((acc, name) => {
        const nutri = INGREDIENT_NUTRIENTS[name];
        acc[name] = nutri ? nutri.protein : 0;
        return acc;
      }, {} as Record<string, number>),
      bounds: { min: ((targets.protein / 100) * quantityKg) - 0.3 },
    });

    // Constraint 3: calcium
    constraints.push({
      name: 'calcium',
      coefficients: ingredientNames.reduce((acc, name) => {
        const nutri = INGREDIENT_NUTRIENTS[name];
        acc[name] = nutri ? nutri.calcium : 0;
        return acc;
      }, {} as Record<string, number>),
      bounds: { min: ((targets.calcium / 100) * quantityKg) - 0.1 },
    });

    // Constraint 4: energy
    constraints.push({
      name: 'energy',
      coefficients: ingredientNames.reduce((acc, name) => {
        const nutri = INGREDIENT_NUTRIENTS[name];
        acc[name] = nutri ? nutri.energy : 0;
        return acc;
      }, {} as Record<string, number>),
      bounds: { min: (targets.energy * quantityKg) - 150 },
    });

    // Add upper bounds for protein, calcium, energy
    constraints.forEach(c => {
      if (c.name === 'protein') {
        c.bounds.max = ((targets.protein / 100) * quantityKg) + 0.3;
      }
      if (c.name === 'calcium') {
        c.bounds.max = ((targets.calcium / 100) * quantityKg) + 0.1;
      }
      if (c.name === 'energy') {
        c.bounds.max = (targets.energy * quantityKg) + 150;
      }
    });

    // Solve the LP
    const result = yalps({
      direction: 'min',
      objective: objective,
      constraints: constraints,
      variables: variables,
    });

    console.log('📊 yalps result status:', result.status);

    if (result && result.status === 'optimal') {
      const amounts: Record<string, number> = {};
      for (const name of ingredientNames) {
        amounts[name] = result.variables[name] || 0;
      }
      const total = Object.values(amounts).reduce((s, v) => s + v, 0);
      if (total < quantityKg - 0.5 || total > quantityKg + 0.5) {
        console.warn('LP total weight out of range:', total);
        return null;
      }
      return amounts;
    }

    console.warn('LP not optimal:', result?.status);
    return null;
  } catch (error) {
    console.warn('LP optimization failed:', error);
    return null;
  }
}

// ========== MAIN EXPORT FUNCTION ==========
export async function formulateFeed(params: {
  breed: string;
  stage: string;
  quantityKg: number;
  includeCoccidiostat: boolean;
  availableIngredients?: string[];
  country?: string;
  ingredientPrices?: Record<string, number>;
}): Promise<FeedResult> {
  const {
    breed,
    stage,
    quantityKg,
    includeCoccidiostat,
    availableIngredients = [],
    country = 'kenya',
    ingredientPrices = {},
  } = params;

  const breedKey = breed.toLowerCase().trim();
  const stageKey = stage.toLowerCase().includes('starter') ? 'starter' :
                   stage.toLowerCase().includes('grower') ? 'grower' :
                   stage.toLowerCase().includes('layer') ? 'layer' :
                   stage.toLowerCase().includes('finisher') ? 'finisher' : 'starter';

  const breedFormulas = FORMULAS[breedKey];
  if (!breedFormulas) {
    throw new Error(`Unsupported breed: ${breed}. Supported breeds: ${Object.keys(FORMULAS).join(', ')}`);
  }

  const fallbackFormula = breedFormulas[stageKey];
  if (!fallbackFormula) {
    const availableStages = Object.keys(breedFormulas).join(', ');
    throw new Error(`Unsupported stage: ${stage}. Available stages for ${breed}: ${availableStages}`);
  }

  const nutrition = NUTRITION_TARGETS[stageKey] || NUTRITION_TARGETS['starter'];
  const allIngredientNames = Object.keys(fallbackFormula);

  const priceMap: Record<string, number> = {};
  for (const name of allIngredientNames) {
    priceMap[name] = getIngredientPrice(name, country, ingredientPrices);
  }

  const adjustedPrices = { ...priceMap };
  for (const name of allIngredientNames) {
    if (availableIngredients.some(a => a.toLowerCase().includes(name.toLowerCase()))) {
      adjustedPrices[name] = 0;
    }
  }

  let optimizedAmounts: Record<string, number> | null = null;
  let lpSuccess = false;
  try {
    optimizedAmounts = optimizeWithLP(allIngredientNames, adjustedPrices, nutrition, quantityKg);
    if (optimizedAmounts) {
      lpSuccess = true;
    }
  } catch (e) {
    console.warn('LP error, falling back to fixed formula:', e);
  }

  let finalIngredients: Ingredient[] = [];

  if (lpSuccess && optimizedAmounts) {
    for (const name of allIngredientNames) {
      const amount = optimizedAmounts[name] || 0;
      const pricePerKg = priceMap[name] || 0;
      const cost = amount * pricePerKg;
      const percent = quantityKg > 0 ? (amount / quantityKg) * 100 : 0;
      const hasAvailable = availableIngredients.some(a => a.toLowerCase().includes(name.toLowerCase()));
      if (amount > 0.001) {
        finalIngredients.push({
          name,
          amountKg: parseFloat(amount.toFixed(3)),
          percent: parseFloat(percent.toFixed(2)),
          cost: parseFloat(cost.toFixed(2)),
          pricePerKg: parseFloat(pricePerKg.toFixed(2)),
          available: hasAvailable,
        });
      }
    }
  } else {
    const factor = quantityKg / 100;
    for (const [name, percent] of Object.entries(fallbackFormula)) {
      const amount = percent * factor;
      const pricePerKg = priceMap[name] || 0;
      const cost = amount * pricePerKg;
      const hasAvailable = availableIngredients.some(a => a.toLowerCase().includes(name.toLowerCase()));
      if (amount > 0.001) {
        finalIngredients.push({
          name,
          amountKg: parseFloat(amount.toFixed(3)),
          percent: parseFloat(percent.toFixed(2)),
          cost: parseFloat(cost.toFixed(2)),
          pricePerKg: parseFloat(pricePerKg.toFixed(2)),
          available: hasAvailable,
        });
      }
    }
  }

  const totalCost = finalIngredients.reduce((sum, ing) => sum + ing.cost, 0);

  const warnings: string[] = [];
  if (stageKey === 'layer' && includeCoccidiostat) {
    warnings.push("⚠️ Coccidiostat is NOT allowed for laying hens – it has been removed.");
  }
  if (stageKey === 'finisher') {
    warnings.push("⚠️ Withdraw coccidiostat 5–7 days before slaughter.");
  }

  const baseMixing = "For best results, first pre-mix all minerals (lime, dcp, salt, premix, methionine, lysine, threonine, tryptophan, and toxin binder) with 3 kg of maize bran, wheat bran, or maize germ. Mix thoroughly to ensure even distribution. Then combine this mineral premix with the remaining ingredients. Grind maize and soya meal to a fine powder before final mixing.";

  let mixingInstructions = baseMixing;
  if (stageKey === 'starter') {
    mixingInstructions += " Starter feed should be crumbled or mashed for young chicks.";
  } else if (stageKey === 'layer') {
    mixingInstructions += " For layers, ensure calcium is evenly distributed to prevent shell defects.";
  } else if (stageKey === 'finisher') {
    mixingInstructions += " For broiler finisher, mix with a little vegetable oil to reduce dust and increase energy.";
  }
  mixingInstructions += " Designed by Mugo to assist farmers globally.";

  const ingredientLines = finalIngredients.map(ing => {
    const avail = ing.available ? ' (you have some)' : '';
    return `${ing.name}: ${ing.amountKg.toFixed(2)} kg (${ing.cost.toFixed(2)})${avail}`;
  });

  const structuredList = [];

  structuredList.push({
    key: "feed_summary",
    params: {
      content: `Feed formula for ${breed} ${stage} – ${quantityKg} kg batch`
    }
  });

  if (lpSuccess) {
    structuredList.push({
      key: "optimization_status",
      params: {
        content: "✅ LP optimization succeeded and calculated the cheapest mix for your selected ingredients and prices."
      }
    });
  } else {
    structuredList.push({
      key: "optimization_status",
      params: {
        content: "ℹ️ Using fixed formula – LP optimization did not find a feasible solution. Try adding more ingredients for cost optimization."
      }
    });
  }

  structuredList.push({
    key: "ingredient_list",
    params: {
      content: `Ingredients:\n${ingredientLines.join('\n')}`
    }
  });

  structuredList.push({
    key: "nutritional_info",
    params: {
      content: `Nutritional Summary: Protein ~${nutrition.protein}%, Calcium ~${nutrition.calcium}%, Energy ~${nutrition.energy} kcal/kg`
    }
  });

  structuredList.push({
    key: "total_cost",
    params: {
      content: `Total Cost: ${totalCost.toFixed(2)}`
    }
  });

  structuredList.push({
    key: "mixing_instructions",
    params: {
      content: mixingInstructions
    }
  });

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