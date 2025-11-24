export const BUILDING_TYPES = {
  SAWMILL: 'SAWMILL',
  FARM: 'FARM',
  IRON_MINE: 'IRON_MINE',
};

// On définit juste les constantes de l'équation pour chaque type
export const BUILDINGS_FORMULAS = {
  [BUILDING_TYPES.SAWMILL]: {
    costBase: 100,    // Prix Niv 1
    prodBase: 100,    // Prod Niv 1
    costFactor: 1.5,  // x1.5 prix / niveau
    prodFactor: 1.2   // x1.2 prod / niveau
  },
  [BUILDING_TYPES.FARM]: {
    costBase: 150,
    prodBase: 120,
    costFactor: 1.5,
    prodFactor: 1.2
  },
  [BUILDING_TYPES.IRON_MINE]: {
    costBase: 500,
    prodBase: 50,
    costFactor: 1.6,
    prodFactor: 1.15
  }
};

// Fonction Helper pour calculer à la volée n'importe quel niveau
export const getBuildingStats = (type: string, level: number) => {
  const formula = BUILDINGS_FORMULAS[type];
  
  // Sécurité si le type n'existe pas
  if (!formula) return null;

  // Application de la formule mathématique (Suite Géométrique)
  const woodCost = Math.floor(formula.costBase * Math.pow(formula.costFactor, level - 1));
  const production = Math.floor(formula.prodBase * Math.pow(formula.prodFactor, level - 1));

  return {
    cost: { food: 0, wood: woodCost, iron: 0 },
    production: production,
    // Temps (en secondes) : On peut aussi faire une formule (ex: 10s * niveau)
    time: level * 60 
  };
};