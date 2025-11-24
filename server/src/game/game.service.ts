import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { BUILDING_TYPES, getBuildingStats } from './game.config';

@Injectable()
export class GameService {
  constructor(private prisma: PrismaService) {}

  // Initialise un profil pour un nouveau joueur
  async createProfile(userId: number) {
    return this.prisma.playerProfile.create({
      data: {
        userId,
        food: 1000,
        wood: 1000,
        iron: 500,
        gold: 0,
        foodPerHour: 0, // Prod de base à 0
        woodPerHour: 0,
        ironPerHour: 0,
      },
      include: { buildings: true },
    });
  }

  // Récupère le profil et calcule le Lazy Update
  async getProfile(userId: number) {
    // 1. Récupérer le profil brut en BDD
    const profile = await this.prisma.playerProfile.findUnique({
      where: { userId },
      include: { buildings: true },
    });

    if (!profile) return null;

    // 2. Calculer les ressources gagnées depuis lastUpdate
    const now = new Date();
    const lastUpdate = new Date(profile.lastUpdate);

    const diffInMs = now.getTime() - lastUpdate.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);

    if (diffInHours <= 0) return profile;

    // Calcul des gains
    const newFood = profile.food + (profile.foodPerHour * diffInHours);
    const newWood = profile.wood + (profile.woodPerHour * diffInHours);
    const newIron = profile.iron + (profile.ironPerHour * diffInHours);

    // 3. Mettre à jour la BDD
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

  // Recalcule la production totale en fonction des bâtiments
  async recalculateProduction(profileId: number) {
    const buildings = await this.prisma.building.findMany({
      where: { profileId, status: 'ACTIVE' }
    });

    let foodProd = 0;
    let woodProd = 0;
    let ironProd = 0;
    const BASE_PROD = 10; // Prod minimale même sans bâtiment

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
        foodPerHour: foodProd + BASE_PROD,
        woodPerHour: woodProd + BASE_PROD,
        ironPerHour: ironProd + BASE_PROD
      }
    });
  }

  // Construit un nouveau bâtiment
  async constructBuilding(userId: number, type: string) {
    const profile = await this.getProfile(userId);
    if (!profile) throw new BadRequestException('Profile not found');

    // Pour l'instant on construit toujours niveau 1 (pas d'upgrade)
    const levelToBuild = 1;

    const stats = getBuildingStats(type, levelToBuild);
    if (!stats) throw new BadRequestException('Invalid building type');

    // Vérification
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

    // Création
    await this.prisma.building.create({
      data: {
        profileId: profile.id,
        type: type,
        level: levelToBuild,
        status: 'ACTIVE'
      }
    });

    // Recalcul de la prod
    await this.recalculateProduction(profile.id);

    return this.getProfile(userId);
  }
}