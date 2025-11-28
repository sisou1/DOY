import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { BUILDING_TYPES, getBuildingStats } from './game.config';

@Injectable()
export class GameService {
  // Simple proxy vers la config
  getNextLevelStats(type: string, level: number) {
    return getBuildingStats(type, level);
  }
  constructor(private prisma: PrismaService) {}

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
      }
    });

    await this.prisma.building.createMany({
      data: [
        { profileId: profile.id, type: BUILDING_TYPES.SAWMILL, level: 1, status: 'ACTIVE' },
        { profileId: profile.id, type: BUILDING_TYPES.FARM, level: 1, status: 'ACTIVE' },
        { profileId: profile.id, type: BUILDING_TYPES.IRON_MINE, level: 1, status: 'ACTIVE' },
      ]
    });

    await this.recalculateProduction(profile.id);
    return this.getProfile(userId);
  }

  async getProfile(userId: number) {
    const profile = await this.prisma.playerProfile.findUnique({
      where: { userId },
      include: { buildings: true },
    });

    if (!profile) return null;

    const now = new Date();
    const lastUpdate = new Date(profile.lastUpdate);
    const diffInMs = now.getTime() - lastUpdate.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);

    if (diffInHours <= 0) return profile;

    const newFood = profile.food + (profile.foodPerHour * diffInHours);
    const newWood = profile.wood + (profile.woodPerHour * diffInHours);
    const newIron = profile.iron + (profile.ironPerHour * diffInHours);

    const updatedProfile = await this.prisma.playerProfile.update({
      where: { id: profile.id },
      data: {
        food: newFood,
        wood: newWood,
        iron: newIron,
        lastUpdate: now,
      },
      include: { buildings: true },
    });

    return updatedProfile;
  }

  async recalculateProduction(profileId: number) {
    const buildings = await this.prisma.building.findMany({
      where: { profileId, status: 'ACTIVE' }
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

    // 1. Chercher le bâtiment existant (car on upgrade toujours l'existant)
    const existingBuilding = profile.buildings.find(b => b.type === type);
    
    if (!existingBuilding) {
        // Si tu veux autoriser la construction d'un nouveau si inexistant, décommente ça :
        // return this.constructNewBuilding(userId, type); 
        throw new BadRequestException('Building not available');
    }
    
    const levelToBuild = existingBuilding.level + 1;
    const stats = getBuildingStats(type, levelToBuild);
    
    if (!stats) throw new BadRequestException('Invalid building type');

    if (profile.food < stats.cost.food || 
        profile.wood < stats.cost.wood || 
        profile.iron < stats.cost.iron) {
      throw new BadRequestException('Not enough resources');
    }

    // Paiement
    await this.prisma.playerProfile.update({
      where: { id: profile.id },
      data: {
        food: profile.food - stats.cost.food,
        wood: profile.wood - stats.cost.wood,
        iron: profile.iron - stats.cost.iron,
      }
    });

    // Upgrade
    await this.prisma.building.update({
        where: { id: existingBuilding.id },
        data: { 
            level: levelToBuild,
            status: 'ACTIVE' 
        }
    });

    await this.recalculateProduction(profile.id);
    return this.getProfile(userId);
  }

  async resetProfile(userId: number) {
    const profile = await this.prisma.playerProfile.findUnique({ where: { userId } });
    if (profile) {
      await this.prisma.building.deleteMany({ where: { profileId: profile.id } });
      await this.prisma.playerProfile.delete({ where: { id: profile.id } });
    }
    return this.createProfile(userId);
  }
}