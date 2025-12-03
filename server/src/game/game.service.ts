import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
    BUILDING_TYPES,
    getBuildingStats,
    getXpForNextLevel,
    LEVEL_REWARDS,
    HERO_TYPES,
    getHeroBaseStats,
    HERO_STATS // <-- Assure-toi d'importer HERO_STATS ici
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
}