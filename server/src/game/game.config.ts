// Durée d'un round en millisecondes (doit être alignée avec le front)
export const ROUND_DURATION = 1500;
// Nouveau: nombre de "lignes" par héros (fractionnement des troupes)
export const LINES_PER_HERO = 3;

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
  WARRIOR_V2: 'WARRIOR_V2',
  ARCHER_V2: 'ARCHER_V2',
  GOBLIN: 'GOBLIN',
};

export const RARITY = {
  COMMON: 'COMMON',
  UNCOMMON: 'UNCOMMON',
  RARE: 'RARE',
  EPIC: 'EPIC',
  LEGENDARY: 'LEGENDARY',
  MYTHIC: 'MYTHIC'
} as const;

export const RARITY_LABELS = {
  [RARITY.COMMON]: 'Commun',
  [RARITY.UNCOMMON]: 'Peu commun',
  [RARITY.RARE]: 'Rare',
  [RARITY.EPIC]: 'Epic',
  [RARITY.LEGENDARY]: 'Legendaire',
  [RARITY.MYTHIC]: 'Mythique'
} as const;

export const RARITY_COLORS = {
  [RARITY.COMMON]: '#FFFFFF',
  [RARITY.UNCOMMON]: '#2ECC71',
  [RARITY.RARE]: '#3498DB',
  [RARITY.EPIC]: '#9B59B6',
  [RARITY.LEGENDARY]: '#E67E22',
  [RARITY.MYTHIC]: '#E74C3C'
} as const;

export const HERO_XP_BASE = 75;
export const getHeroXpForNextLevel = (level: number) => {
  return HERO_XP_BASE * Math.pow(level, 2);
};

const HERO_ARCHETYPE_DEFS = {
  [HERO_TYPES.WARRIOR]: {
    attack: 10,
    defense: 10,
    maxTroops: 100,
    imageUrl: '/Heroes/Warrior.png',
    rarity: RARITY.COMMON,
    growth: { attack: 0.12, defense: 0.12, maxTroops: 0.16 }
  },
  [HERO_TYPES.ARCHER]: {
    attack: 15,
    defense: 5,
    maxTroops: 80,
    imageUrl: '/Heroes/Archer.png',
    rarity: RARITY.COMMON,
    growth: { attack: 0.14, defense: 0.1, maxTroops: 0.14 }
  },
  [HERO_TYPES.WARRIOR_V2]: {
    attack: 20,
    defense: 20,
    maxTroops: 200,
    imageUrl: '/Heroes/Warrior.png',
    rarity: RARITY.UNCOMMON,
    growth: { attack: 0.14, defense: 0.14, maxTroops: 0.18 }
  },
  [HERO_TYPES.ARCHER_V2]: {
    attack: 30,
    defense: 10,
    maxTroops: 160,
    imageUrl: '/Heroes/Archer.png',
    rarity: RARITY.UNCOMMON,
    growth: { attack: 0.16, defense: 0.1, maxTroops: 0.16 }
  },
  [HERO_TYPES.GOBLIN]: {
    attack: 5,
    defense: 2,
    maxTroops: 50,
    imageUrl: '/Heroes/Goblin.png',
    rarity: RARITY.COMMON,
    growth: { attack: 0.08, defense: 0.06, maxTroops: 0.08 }
  },
} as const;

export const HERO_STATS = HERO_ARCHETYPE_DEFS;

export const PLAYER_HERO_LIMIT = 4;
export const PLAYER_RECRUITABLE_HERO_TYPES = [
  HERO_TYPES.WARRIOR,
  HERO_TYPES.ARCHER,
  HERO_TYPES.WARRIOR_V2,
  HERO_TYPES.ARCHER_V2,
];

const getScaledValue = (base: number, ratio: number, level: number) => {
  return Math.max(1, Math.floor(base * Math.pow(1 + ratio, Math.max(0, level - 1))));
};

export const getHeroScaledStats = (type: string, level: number) => {
  const def = HERO_ARCHETYPE_DEFS[type] || HERO_ARCHETYPE_DEFS[HERO_TYPES.WARRIOR];
  return {
    attack: getScaledValue(def.attack, def.growth.attack, level),
    defense: getScaledValue(def.defense, def.growth.defense, level),
    maxTroops: getScaledValue(def.maxTroops, def.growth.maxTroops, level),
    imageUrl: def.imageUrl,
    rarity: def.rarity,
    rarityLabel: RARITY_LABELS[def.rarity],
    rarityColor: RARITY_COLORS[def.rarity],
    growth: def.growth
  };
};

export const getHeroBaseStats = (type: string) => {
  return getHeroScaledStats(type, 1);
};

export const PVE_ENEMY_ARCHETYPES = {
  GOBLIN_SCOUT: {
    id: 'GOBLIN_SCOUT',
    name: 'Goblin Scout',
    type: HERO_TYPES.GOBLIN,
    rarity: RARITY.COMMON
  },
  GOBLIN_BRUTE: {
    id: 'GOBLIN_BRUTE',
    name: 'Goblin Brute',
    type: HERO_TYPES.GOBLIN,
    rarity: RARITY.COMMON
  }
} as const;

export type PvEEnemyConfig = {
  archetypeId: string;
  level?: number;
  troops?: number;
  attackBonus?: number;
  defenseBonus?: number;
  queueOrder?: number;
};

export type PvEBattlePreset = {
  id: string;
  name: string;
  enemies: PvEEnemyConfig[];
};

export const PVE_BATTLE_PRESETS: PvEBattlePreset[] = [
  {
    id: 'goblin_patrol',
    name: 'Patrouille gobeline',
    enemies: [
      { archetypeId: PVE_ENEMY_ARCHETYPES.GOBLIN_SCOUT.id, level: 1, troops: 50, queueOrder: 0 },
      { archetypeId: PVE_ENEMY_ARCHETYPES.GOBLIN_BRUTE.id, level: 1, troops: 50, attackBonus: 2, queueOrder: 1 }
    ]
  },
  {
    id: 'goblin_warband',
    name: 'Bande gobeline renforcee',
    enemies: [
      { archetypeId: PVE_ENEMY_ARCHETYPES.GOBLIN_SCOUT.id, level: 1, troops: 100, queueOrder: 0 },
      { archetypeId: PVE_ENEMY_ARCHETYPES.GOBLIN_BRUTE.id, level: 1, troops: 100, attackBonus: 2, queueOrder: 1 }
    ]
  },
  {
    id: 'grotte_gobline_dev',
    name: 'la grottes gobline (dev)',
    enemies: Array.from({ length: 100 }, (_, i) => ({
      archetypeId: PVE_ENEMY_ARCHETYPES.GOBLIN_SCOUT.id,
      level: 1,
      troops: 50,
      queueOrder: i
    }))
  }
];

export const getPvEBattlePreset = (presetId: string) => {
  return PVE_BATTLE_PRESETS.find((p) => p.id === presetId) || null;
};

export const getPvEPresetsCatalog = () => {
  return PVE_BATTLE_PRESETS.map((preset) => ({
    id: preset.id,
    name: preset.name,
    enemies: preset.enemies.map((enemy) => {
      const arch = Object.values(PVE_ENEMY_ARCHETYPES).find((a) => a.id === enemy.archetypeId);
      const level = enemy.level ?? 1;
      const base = getHeroScaledStats(arch?.type || HERO_TYPES.GOBLIN, level);
      const attack = base.attack + (enemy.attackBonus ?? 0);
      const defense = base.defense + (enemy.defenseBonus ?? 0);
      const maxTroops = enemy.troops ?? base.maxTroops;

      return {
        archetypeId: enemy.archetypeId,
        name: arch?.name || 'Enemy',
        type: arch?.type || HERO_TYPES.GOBLIN,
        level,
        attack,
        defense,
        troops: maxTroops,
        rarity: arch?.rarity || RARITY.COMMON,
        rarityLabel: RARITY_LABELS[arch?.rarity || RARITY.COMMON],
        rarityColor: RARITY_COLORS[arch?.rarity || RARITY.COMMON],
        imageUrl: base.imageUrl
      };
    })
  }));
};
