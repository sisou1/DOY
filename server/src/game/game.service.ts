import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
    BUILDING_TYPES,
    getBuildingStats,
    getXpForNextLevel,
    LEVEL_REWARDS,
    HERO_TYPES,
    getHeroBaseStats,
    HERO_STATS
} from './game.config';

// Constante : 1 Round = 1 Seconde (1000ms)
const ROUND_DURATION = 1000;

@Injectable()
export class GameService {
    constructor(private prisma: PrismaService) {}

    // Simple proxy vers la config
    getNextLevelStats(type: string, level: number) {
        return getBuildingStats(type, level);
    }

    async createProfile(userId: number) {
        const profile = await this.prisma.playerProfile.create({
            data: {
                userId,
                food: 1000,
                wood: 1000,
                iron: 500,
                gold: 0,
                foodPerHour: 0,
                woodPerHour: 0,
                ironPerHour: 0,
                level: 1,
                experience: 0
            }
        });

        // Création des bâtiments de base
        await this.prisma.building.createMany({
            data: [
                { profileId: profile.id, type: BUILDING_TYPES.SAWMILL, level: 1, status: 'ACTIVE' },
                { profileId: profile.id, type: BUILDING_TYPES.FARM, level: 1, status: 'ACTIVE' },
                { profileId: profile.id, type: BUILDING_TYPES.IRON_MINE, level: 1, status: 'ACTIVE' },
            ]
        });

        // Création du Héros de départ
        const baseStats = getHeroBaseStats(HERO_TYPES.WARRIOR);
        await this.prisma.hero.create({
            data: {
                profileId: profile.id,
                name: 'General',
                type: HERO_TYPES.WARRIOR,
                attack: baseStats.attack,
                defense: baseStats.defense,
                troops: baseStats.maxTroops,
                maxTroops: baseStats.maxTroops,
            }
        });

        await this.recalculateProduction(profile.id);
        return this.getProfile(userId);
    }

    /**
     * Cette méthode est le coeur du système de temps.
     * Elle vérifie si des bâtiments en construction sont terminés.
     */
    private async processFinishedConstructions(profileId: number) {
        const now = new Date();

        // 1. Trouver les bâtiments dont la construction est finie (date passée)
        const finishedBuildings = await this.prisma.building.findMany({
            where: {
                profileId,
                status: 'UPGRADING',
                constructionEndsAt: { lte: now } // "Less Than or Equal to" now
            }
        });

        if (finishedBuildings.length === 0) return;

        // 2. Pour chaque bâtiment fini, on applique le niveau
        for (const building of finishedBuildings) {
            await this.prisma.building.update({
                where: { id: building.id },
                data: {
                    level: { increment: 1 }, // On monte le niveau
                    status: 'ACTIVE',        // On repasse en actif
                    constructionEndsAt: null // On vide le timer
                }
            });
        }

        // 3. On recalcul la production car les niveaux ont changé
        await this.recalculateProduction(profileId);
    }

    async getProfile(userId: number) {
        const profile = await this.prisma.playerProfile.findUnique({
            where: { userId },
            include: {
                buildings: true,
                heroes: true,
                user: {
                    select: { username: true, isDev: true }
                }
            }
        });

        if (!profile) return null;

        // --- NOUVEAU : MISE À JOUR DES BATAILLES EN COURS ---
        // On vérifie si un héros est dans une bataille active
        const activeHero = profile.heroes.find(h => h.battleId !== null);

        if (activeHero && activeHero.battleId) {
            // On force le calcul de cette bataille pour mettre à jour les PV
            const battle = await this.prisma.battle.findUnique({
                where: { id: activeHero.battleId },
                include: { heroes: true }
            });

            if (battle && battle.status === 'IN_PROGRESS') {
                await this.processBattleRounds(battle);
            }
        }
        // -----------------------------------------------------

        await this.processFinishedConstructions(profile.id);

        const refreshedProfile = await this.prisma.playerProfile.findUnique({
            where: { id: profile.id },
            include: {
                buildings: true,
                heroes: true
            },
        });

        if (!refreshedProfile) return null;

        const now = new Date();
        const lastUpdate = new Date(refreshedProfile.lastUpdate);
        const diffInMs = now.getTime() - lastUpdate.getTime();
        const diffInHours = diffInMs / (1000 * 60 * 60);

        if (diffInHours <= 0) return refreshedProfile;

        const newFood = refreshedProfile.food + (refreshedProfile.foodPerHour * diffInHours);
        const newWood = refreshedProfile.wood + (refreshedProfile.woodPerHour * diffInHours);
        const newIron = refreshedProfile.iron + (refreshedProfile.ironPerHour * diffInHours);

        const updatedProfile = await this.prisma.playerProfile.update({
            where: { id: refreshedProfile.id },
            data: {
                food: newFood,
                wood: newWood,
                iron: newIron,
                lastUpdate: now,
            },
            include: {
                buildings: true,
                heroes: true,
                user: {
                    select: { username: true, isDev: true }
                }
            },
        });

            // --- TRANSFORMATION DES DONNÉES AVANT ENVOI ---
            // On ajoute l'URL de l'image dynamiquement en fonction du type
            const formattedHeroes = updatedProfile.heroes.map(hero => {
                const stats = HERO_STATS[hero.type];
                return {
                    ...hero,
                    imageUrl: stats ? stats.imageUrl : '/Heroes/Warrior.png' // Fallback sécurité
                };
            });

            return {
                ...updatedProfile,
                heroes: formattedHeroes
            };
        }

    async recalculateProduction(profileId: number) {
        const buildings = await this.prisma.building.findMany({
            where: { profileId, status: 'ACTIVE' } // Seuls les bâtiments actifs produisent
        });

        let foodProd = 0;
        let woodProd = 0;
        let ironProd = 0;

        for (const b of buildings) {
            const stats = getBuildingStats(b.type, b.level);
            if (stats) {
                if (b.type === BUILDING_TYPES.FARM) foodProd += stats.production;
                if (b.type === BUILDING_TYPES.SAWMILL) woodProd += stats.production;
                if (b.type === BUILDING_TYPES.IRON_MINE) ironProd += stats.production;
            }
        }

        await this.prisma.playerProfile.update({
            where: { id: profileId },
            data: {
                foodPerHour: foodProd,
                woodPerHour: woodProd,
                ironPerHour: ironProd
            }
        });
    }

    async upgradeBuilding(userId: number, type: string) {
        // On utilise getProfile pour s'assurer que les timers précédents sont traités
        const profile = await this.getProfile(userId);
        if (!profile) throw new BadRequestException('Profile not found');

        // On cherche un bâtiment de ce type qui est prêt à être amélioré
        // On ne prend PAS ceux qui sont déjà en 'UPGRADING'
        const existingBuilding = profile.buildings.find(b => b.type === type && b.status === 'ACTIVE');

        if (!existingBuilding) {
            // Soit il n'existe pas, soit il est déjà en train d'être amélioré
            const isUpgrading = profile.buildings.find(b => b.type === type && b.status === 'UPGRADING');
            if (isUpgrading) throw new BadRequestException('Building is already upgrading');

            throw new BadRequestException('Building not available or busy');
        }

        const levelToBuild = existingBuilding.level + 1;
        const stats = getBuildingStats(type, levelToBuild);

        if (!stats) throw new BadRequestException('Invalid building type');

        if (profile.food < stats.cost.food ||
            profile.wood < stats.cost.wood ||
            profile.iron < stats.cost.iron) {
            throw new BadRequestException('Not enough resources');
        }

        // 1. Paiement immédiat
        await this.prisma.playerProfile.update({
            where: { id: profile.id },
            data: {
                food: profile.food - stats.cost.food,
                wood: profile.wood - stats.cost.wood,
                iron: profile.iron - stats.cost.iron,
            }
        });

        // 2. Calcul de la date de fin
        const constructionTimeMs = stats.time * 1000; // stats.time est en secondes
        const constructionEndsAt = new Date(Date.now() + constructionTimeMs);

        // 3. Mise à jour du statut : On ne monte PAS le niveau tout de suite
        await this.prisma.building.update({
            where: { id: existingBuilding.id },
            data: {
                status: 'UPGRADING',
                constructionEndsAt: constructionEndsAt
            }
        });

        // On renvoie le profil à jour (le front verra le status UPGRADING)
        return this.getProfile(userId);
    }

    async resetProfile(userId: number) {
        const profile = await this.prisma.playerProfile.findUnique({ where: { userId } });
        if (profile) {
            // IMPORTANT : On supprime d'abord les dépendances
            await this.prisma.building.deleteMany({ where: { profileId: profile.id } });
            await this.prisma.hero.deleteMany({ where: { profileId: profile.id } }); // Suppression des héros
            
            await this.prisma.playerProfile.delete({ where: { id: profile.id } });
        }
        return this.createProfile(userId);
    }

    async addExperience(userId: number, amount: number) {
        const profile = await this.prisma.playerProfile.findUnique({ where: { userId } });
        if (!profile) return;

        let currentXp = profile.experience + amount;
        let currentLevel = profile.level;
        let xpNeeded = getXpForNextLevel(currentLevel);
        let hasLeveledUp = false;

        while (currentXp >= xpNeeded) {
            currentXp -= xpNeeded;
            currentLevel++;
            xpNeeded = getXpForNextLevel(currentLevel);
            hasLeveledUp = true;

            const rewards = LEVEL_REWARDS[currentLevel];
            if (rewards) {
                for (const reward of rewards) {
                    await this.prisma.building.create({
                        data: {
                            profileId: profile.id,
                            type: reward.type,
                            level: 1,
                            status: 'ACTIVE'
                        }
                    });
                }
            }
        }

        if (currentXp !== profile.experience || currentLevel !== profile.level) {
            await this.prisma.playerProfile.update({
                where: { id: profile.id },
                data: {
                    experience: currentXp,
                    level: currentLevel
                }
            });

            if (hasLeveledUp) {
                await this.recalculateProduction(profile.id);
            }
        }
    }

    // --- SYSTÈME DE BATAILLE ---

    async startPvEBattle(userId: number) {
        const profile = await this.getProfile(userId);
        if (!profile) throw new BadRequestException('Profile not found');

        // 1. Trouver un héros disponible (pas déjà en combat)
        const myHero = profile.heroes.find(h => h.troops > 0 && !h.battleId);
        if (!myHero) throw new BadRequestException('No available heroes (dead or busy)');

        // 2. Créer le Monstre (Bot)
        const goblinStats = getHeroBaseStats(HERO_TYPES.GOBLIN);
        const mob = await this.prisma.hero.create({
            data: {
                name: 'Goblin Scout',
                type: HERO_TYPES.GOBLIN,
                attack: goblinStats.attack,
                defense: goblinStats.defense,
                troops: goblinStats.maxTroops,
                maxTroops: goblinStats.maxTroops,
                side: 'DEFENDER',
                queueOrder: 0 // Premier en ligne
            }
        });

        // 3. Mettre à jour mon héros
        await this.prisma.hero.update({
            where: { id: myHero.id },
            data: {
                side: 'ATTACKER',
                queueOrder: 0 // Premier en ligne
            }
        });

        // 4. Créer l'instance de Bataille
        const battle = await this.prisma.battle.create({
            data: {
                status: 'IN_PROGRESS',
                lastUpdate: new Date(), // Le chrono démarre maintenant
                heroes: {
                    connect: [
                        { id: myHero.id },
                        { id: mob.id }
                    ]
                }
            },
            include: { heroes: true }
        });

        return battle;
    }

    async getBattle(battleId: number) {
        // 1. Récupérer l'état brut en base
        let battle = await this.prisma.battle.findUnique({
            where: { id: battleId },
            include: { heroes: { orderBy: { queueOrder: 'asc' } } }
        });

        if (!battle) throw new BadRequestException('Battle not found');

        // 2. SI le combat est en cours, on calcule ce qui s'est passé depuis la dernière fois
        if (battle.status === 'IN_PROGRESS') {
            await this.processBattleRounds(battle);
            
            // On recharge la version à jour
            battle = await this.prisma.battle.findUnique({
                where: { id: battleId },
                include: { heroes: { orderBy: { queueOrder: 'asc' } } }
            });
        }

        return battle;
    }

    // C'est ici que la magie opère (Simulation Lazy)
    private async processBattleRounds(battle: any) {
        const now = new Date().getTime();
        const lastUpdate = new Date(battle.lastUpdate).getTime();
        
        // Combien de temps s'est écoulé ?
        const timeDiff = now - lastUpdate;
        
        // Combien de rounds entiers on doit jouer ?
        const roundsToPlay = Math.floor(timeDiff / ROUND_DURATION);

        if (roundsToPlay <= 0) return; // Rien à faire, on est à jour

        let newLogs = [...(battle.logs as any[])];
        let isBattleFinished = false;
        
        // On récupère les listes vivantes
        // Note: on travaille sur des objets JS ici, on sauvegardera à la fin
        const attackers = battle.heroes.filter(h => h.side === 'ATTACKER' && h.troops > 0);
        const defenders = battle.heroes.filter(h => h.side === 'DEFENDER' && h.troops > 0);

        // BOUCLE DE RATTRAPAGE TEMPOREL
        for (let i = 0; i < roundsToPlay; i++) {
            if (attackers.length === 0 || defenders.length === 0) {
                isBattleFinished = true;
                break;
            }

            // Le premier de chaque file se tape dessus
            const activeAttacker = attackers[0];
            const activeDefender = defenders[0];

            // Logique simple : Dégâts = Attaque (On pourra complexifier avec la défense plus tard)
            // On peut dire Dégats = Max(1, Attaque - Defense/2)
            const dmgToDefender = Math.max(1, Math.floor(activeAttacker.attack - (activeDefender.defense * 0.2)));
            const dmgToAttacker = Math.max(1, Math.floor(activeDefender.attack - (activeAttacker.defense * 0.2)));

            // Application des dégâts
            activeDefender.troops -= dmgToDefender;
            activeAttacker.troops -= dmgToAttacker;

            // Ajout au log
            newLogs.push({
                round_time: lastUpdate + ((i + 1) * ROUND_DURATION), // Timestamp virtuel du coup
                actions: [
                    { from: activeAttacker.id, to: activeDefender.id, dmg: dmgToDefender },
                    { from: activeDefender.id, to: activeAttacker.id, dmg: dmgToAttacker }
                ]
            });

            // Gestion des morts
            if (activeDefender.troops <= 0) {
                activeDefender.troops = 0;
                defenders.shift(); // Il sort de la file active
                newLogs.push({ type: 'DEATH', heroId: activeDefender.id });
            }
            if (activeAttacker.troops <= 0) {
                activeAttacker.troops = 0;
                attackers.shift(); // Il sort de la file active
                newLogs.push({ type: 'DEATH', heroId: activeAttacker.id });
            }
        }

        // SAUVEGARDE DE L'ÉTAT
        const finalStatus = (attackers.length === 0 || defenders.length === 0) ? 'FINISHED' : 'IN_PROGRESS';
        
        // 1. Update Battle
        await this.prisma.battle.update({
            where: { id: battle.id },
            data: {
                status: finalStatus,
                lastUpdate: new Date(lastUpdate + (roundsToPlay * ROUND_DURATION)), // On avance l'heure officielle
                logs: newLogs
            }
        });

        // 2. Update Heroes (Sauvegarde des PVs)
        for (const hero of battle.heroes) {
            // On prépare les données à mettre à jour
            const updateData: any = { troops: hero.troops };

            // SI LE COMBAT EST FINI : On libère le héros !
            if (finalStatus === 'FINISHED') {
                updateData.battleId = null;
                updateData.side = null;
                updateData.queueOrder = null;
            }

            await this.prisma.hero.update({
                where: { id: hero.id },
                data: updateData
            });
        }
    }
}