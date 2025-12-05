import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
    BUILDING_TYPES,
    getBuildingStats,
    getXpForNextLevel,
    LEVEL_REWARDS,
    HERO_TYPES,
    getHeroBaseStats,
    HERO_STATS,
    ROUND_DURATION
} from './game.config';

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

        await this.prisma.building.createMany({
            data: [
                { profileId: profile.id, type: BUILDING_TYPES.SAWMILL, level: 1, status: 'ACTIVE' },
                { profileId: profile.id, type: BUILDING_TYPES.FARM, level: 1, status: 'ACTIVE' },
                { profileId: profile.id, type: BUILDING_TYPES.IRON_MINE, level: 1, status: 'ACTIVE' },
            ]
        });

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

        const finishedBuildings = await this.prisma.building.findMany({
            where: {
                profileId,
                status: 'UPGRADING',
                constructionEndsAt: { lte: now }
            }
        });

        if (finishedBuildings.length === 0) return;

        for (const building of finishedBuildings) {
            await this.prisma.building.update({
                where: { id: building.id },
                data: {
                    level: { increment: 1 },
                    status: 'ACTIVE',
                    constructionEndsAt: null
                }
            });
        }

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

        // On vérifie si un héros est dans une bataille active et on charge la relation
        const activeHero = profile.heroes.find(h => h.battleId !== null);
        if (activeHero && activeHero.battleId) {
            const battle = await this.prisma.battle.findUnique({
                where: { id: activeHero.battleId },
                include: { heroes: true }
            });
            if (battle && battle.status === 'IN_PROGRESS') {
                await this.processBattleRounds(battle);
            }
        }

        await this.processFinishedConstructions(profile.id);

        const refreshedProfile = await this.prisma.playerProfile.findUnique({
            where: { id: profile.id },
            include: { buildings: true, heroes: true },
        });

        if (!refreshedProfile) return null;

        const now = new Date();
        const lastUpdate = new Date(refreshedProfile.lastUpdate);
        const diffInMs = now.getTime() - lastUpdate.getTime();

        if (diffInMs <= 0) return refreshedProfile;

        const diffInHours = diffInMs / (1000 * 60 * 60);

        let newFood = refreshedProfile.food + (refreshedProfile.foodPerHour * diffInHours);
        const newWood = refreshedProfile.wood + (refreshedProfile.woodPerHour * diffInHours);
        const newIron = refreshedProfile.iron + (refreshedProfile.ironPerHour * diffInHours);

        // --- LOGIQUE DE RÉGÉNÉRATION (Corrigée - Pourcentage) ---
        const lastRegenUpdate = new Date(refreshedProfile.lastRegenUpdate || refreshedProfile.lastUpdate);
        const diffRegenMs = now.getTime() - lastRegenUpdate.getTime();

        const REGEN_TICK_MS = 10000; // 10 secondes
        const REGEN_PERCENT = 0.10; // 10%
        const FOOD_COST_PER_TROOP = 1;

        const ticksPassed = Math.floor(diffRegenMs / REGEN_TICK_MS);
        let newLastRegenUpdate = lastRegenUpdate;

        if (ticksPassed > 0) {
            // Héros éligibles : Blessés et PAS en combat
            const injuredHeroes = refreshedProfile.heroes.filter(h =>
                h.troops < h.maxTroops && !h.battleId
            );

            let totalFoodCost = 0;

            for (const hero of injuredHeroes) {
                const missingTroops = hero.maxTroops - hero.troops;

                const troopsPerTick = Math.ceil(hero.maxTroops * REGEN_PERCENT);

                const potentialRegen = ticksPassed * troopsPerTick;

                const currentFoodStock = newFood - totalFoodCost;
                const maxAffordable = Math.floor(currentFoodStock / FOOD_COST_PER_TROOP);

                const actualRegen = Math.min(missingTroops, potentialRegen, maxAffordable);

                if (actualRegen > 0) {
                    hero.troops += actualRegen;
                    totalFoodCost += (actualRegen * FOOD_COST_PER_TROOP);

                    await this.prisma.hero.update({
                        where: { id: hero.id },
                        data: { troops: hero.troops }
                    });
                }
            }

            newFood -= totalFoodCost;

            newLastRegenUpdate = new Date(lastRegenUpdate.getTime() + (ticksPassed * REGEN_TICK_MS));
        }

        // SAUVEGARDE FINALE DU PROFIL
        const updatedProfile = await this.prisma.playerProfile.update({
            where: { id: refreshedProfile.id },
            data: {
                food: Math.max(0, newFood),
                wood: newWood,
                iron: newIron,
                lastUpdate: now, // Toujours maintenant pour les ressources
                lastRegenUpdate: newLastRegenUpdate, // Avance par paliers de 5s
            },
            include: {
                buildings: true,
                heroes: true,
                user: {
                    select: { username: true, isDev: true }
                }
            },
        });

        const formattedHeroes = updatedProfile.heroes.map(hero => {
            const stats = HERO_STATS[hero.type];
            return {
                ...hero,
                imageUrl: stats ? stats.imageUrl : '/Heroes/Warrior.png'
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
        const profile = await this.getProfile(userId);
        if (!profile) throw new BadRequestException('Profile not found');

        const existingBuilding = profile.buildings.find(b => b.type === type && b.status === 'ACTIVE');

        if (!existingBuilding) {
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

        await this.prisma.playerProfile.update({
            where: { id: profile.id },
            data: {
                food: profile.food - stats.cost.food,
                wood: profile.wood - stats.cost.wood,
                iron: profile.iron - stats.cost.iron,
            }
        });

        const constructionTimeMs = stats.time * 1000; // stats.time est en secondes
        const constructionEndsAt = new Date(Date.now() + constructionTimeMs);

        await this.prisma.building.update({
            where: { id: existingBuilding.id },
            data: {
                status: 'UPGRADING',
                constructionEndsAt: constructionEndsAt
            }
        });

        return this.getProfile(userId);
    }

    async resetProfile(userId: number) {
        const profile = await this.prisma.playerProfile.findUnique({ where: { userId } });
        if (profile) {
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

        const myHero = profile.heroes.find(h => h.troops > 0 && !h.battleId);
        if (!myHero) throw new BadRequestException('No available heroes (dead or busy)');

        const goblinStats = getHeroBaseStats(HERO_TYPES.GOBLIN);

        // --- MODIFICATION : CRÉATION DE 2 GOBELINS ---
        // Gobelin 1
        const goblin1 = await this.prisma.hero.create({
            data: {
                name: 'Goblin Scout',
                type: HERO_TYPES.GOBLIN,
                attack: goblinStats.attack,
                defense: goblinStats.defense,
                troops: goblinStats.maxTroops,
                maxTroops: goblinStats.maxTroops,
                side: 'DEFENDER',
                queueOrder: 0 // Actif immédiatement
            }
        });

        // Gobelin 2
        const goblin2 = await this.prisma.hero.create({
            data: {
                name: 'Goblin Warrior', // Un nom légèrement différent
                type: HERO_TYPES.GOBLIN,
                attack: goblinStats.attack + 2, // Un peu plus fort
                defense: goblinStats.defense,
                troops: goblinStats.maxTroops,
                maxTroops: goblinStats.maxTroops,
                side: 'DEFENDER',
                queueOrder: 1 // Arrive après la mort du premier
            }
        });

        // 3. Engager mon héros
        await this.prisma.hero.update({
            where: { id: myHero.id },
            data: {
                side: 'ATTACKER',
                queueOrder: 0
            }
        });

        // 4. Créer la bataille avec les 3 participants
        return this.prisma.battle.create({
            data: {
                status: 'IN_PROGRESS',
                lastUpdate: new Date(),
                heroes: {
                    connect: [
                        { id: myHero.id },
                        { id: goblin1.id },
                        { id: goblin2.id }
                    ]
                }
            },
            include: { heroes: true }
        });
    }

    async getBattle(battleId: number) {
        let battle = await this.prisma.battle.findUnique({
            where: { id: battleId },
            include: { heroes: { orderBy: { queueOrder: 'asc' } } }
        });

        if (!battle) throw new BadRequestException('Battle not found');

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

    private async processBattleRounds(battle: any) {
        const now = new Date().getTime();
        const lastUpdate = new Date(battle.lastUpdate).getTime();

        const timeDiff = now - lastUpdate;

        const roundsToPlay = Math.floor(timeDiff / ROUND_DURATION);

        if (roundsToPlay <= 0) return;

        let newLogs = [...(battle.logs as any[])];
        let isBattleFinished = false;

        // IMPORTANT : On trie par queueOrder pour être sûr que le [0] est bien le premier de la file
        const attackers = battle.heroes
            .filter((h: any) => h.side === 'ATTACKER' && h.troops > 0)
            .sort((a: any, b: any) => a.queueOrder - b.queueOrder);
            
        const defenders = battle.heroes
            .filter((h: any) => h.side === 'DEFENDER' && h.troops > 0)
            .sort((a: any, b: any) => a.queueOrder - b.queueOrder);

        for (let i = 0; i < roundsToPlay; i++) {
            // ... (Logique de combat inchangée : calcul dégats, ajout logs) ...
             if (attackers.length === 0 || defenders.length === 0) {
                isBattleFinished = true;
                break;
            }

            const activeAttacker = attackers[0];
            const activeDefender = defenders[0];

            const dmgToDefender = Math.max(1, Math.floor(activeAttacker.attack - (activeDefender.defense * 0.2)));
            const dmgToAttacker = Math.max(1, Math.floor(activeDefender.attack - (activeAttacker.defense * 0.2)));

            activeDefender.troops -= dmgToDefender;
            activeAttacker.troops -= dmgToAttacker;

            newLogs.push({
                round_time: lastUpdate + ((i + 1) * ROUND_DURATION),
                actions: [
                    { from: activeAttacker.id, to: activeDefender.id, dmg: dmgToDefender },
                    { from: activeDefender.id, to: activeAttacker.id, dmg: dmgToAttacker }
                ]
            });

            if (activeDefender.troops <= 0) {
                activeDefender.troops = 0;
                defenders.shift();
                newLogs.push({ type: 'DEATH', heroId: activeDefender.id });
            }
            if (activeAttacker.troops <= 0) {
                activeAttacker.troops = 0;
                attackers.shift();
                newLogs.push({ type: 'DEATH', heroId: activeAttacker.id });
            }
        }

        const finalStatus = (attackers.length === 0 || defenders.length === 0) ? 'FINISHED' : 'IN_PROGRESS';

        await this.prisma.battle.update({
            where: { id: battle.id },
            data: {
                status: finalStatus,
                lastUpdate: new Date(lastUpdate + (roundsToPlay * ROUND_DURATION)),
                logs: newLogs
            }
        });

        // --- MODIFICATION ICI : LIBÉRATION DES MORTS ---
        for (const hero of battle.heroes) {
            const updateData: any = { troops: hero.troops };

            // Si le combat est fini OU SI LE HÉROS EST MORT
            // On le libère immédiatement.
            if (finalStatus === 'FINISHED' || hero.troops <= 0) {
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