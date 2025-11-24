import {Injectable} from '@nestjs/common';
import {PrismaService} from '../prisma.service';

@Injectable()
export class GameService {
    constructor(private prisma: PrismaService) {}

    // Initialise un profil pour un nouveau joueur (à appeler lors de l'inscription)
    async createProfile(userId: number) {
        return this.prisma.playerProfile.create({
            data: {
                userId,
                food: 1000,
                wood: 1000,
                iron: 500,
                gold: 0,
                foodPerHour: 100,
                woodPerHour: 50,
                ironPerHour: 10,
            },
            include: { buildings: true },
        });
    }

    async getProfile(userId: number) {
        const profile = await this.prisma.playerProfile.findUnique({
            where: { userId },
            include: { buildings: true }, // On récupère aussi les bâtiments
        });

        if (!profile) return null;

        const now = new Date();
        const lastUpdate = new Date(profile.lastUpdate);

        const diffInMs = now.getTime() - lastUpdate.getTime();
        const diffInHours = diffInMs / (1000 * 60 * 60);

        if (diffInHours <= 0) return profile;

        const newFood = profile.food + (profile.foodPerHour * diffInHours);
        const newWood = profile.wood + (profile.woodPerHour * diffInHours); // <--- Updated
        const newIron = profile.iron + (profile.ironPerHour * diffInHours);

        return this.prisma.playerProfile.update({
            where: {id: profile.id},
            data: {
                food: newFood,
                wood: newWood,
                iron: newIron,
                lastUpdate: now,
            },
            include: {buildings: true},
        });
    }
}