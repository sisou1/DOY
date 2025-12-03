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
    time: level * 5
  };
};

/**
 * Calcule l'XP nécessaire pour passer du niveau actuel au niveau suivant.
 * Formule basique : 100 * (niveau actuel)^2
 * Niv 1 -> 2 : 100 XP
 * Niv 2 -> 3 : 400 XP
 * Niv 3 -> 4 : 900 XP
 */
export const getXpForNextLevel = (level: number) => {
  return 100 * Math.pow(level, 2);
};

// Définition des bâtiments gagnés par niveau
export const LEVEL_REWARDS: Record<number, { type: string }[]> = {
  5:  [{ type: BUILDING_TYPES.FARM }],
  10: [{ type: BUILDING_TYPES.SAWMILL }],
  15: [{ type: BUILDING_TYPES.FARM }],
  20: [{ type: BUILDING_TYPES.SAWMILL }, { type: BUILDING_TYPES.IRON_MINE }],
  25: [{ type: BUILDING_TYPES.FARM }, { type: BUILDING_TYPES.IRON_MINE }],
  30: [{ type: BUILDING_TYPES.SAWMILL }, { type: BUILDING_TYPES.IRON_MINE }],
};

// --- CONFIG HÉROS ---

export const HERO_TYPES = {
  WARRIOR: 'WARRIOR',
  ARCHER: 'ARCHER',
  GOBLIN: 'GOBLIN',
};

export const HERO_STATS = {
  [HERO_TYPES.WARRIOR]: {
    attack: 10,
    defense: 10,
    maxTroops: 100,
    imageUrl: '/Heroes/Warrior.png'
  },
  [HERO_TYPES.ARCHER]: {
    attack: 15,
    defense: 5,
    maxTroops: 80,
    imageUrl: '/Heroes/Archer.png'
  },
  // Un monstre faible pour tester
  [HERO_TYPES.GOBLIN]: {
    attack: 5,
    defense: 2,
    maxTroops: 50,
    imageUrl: '/Heroes/Goblin.png'
  },
};
export const getHeroBaseStats = (type: string) => {
  return HERO_STATS[type] || HERO_STATS[HERO_TYPES.WARRIOR];
};