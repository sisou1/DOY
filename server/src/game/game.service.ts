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
        // 1. Récupérer le profil brut en BDD
        const profile = await this.prisma.playerProfile.findUnique({
            where: { userId },
            include: { buildings: true }, // On récupère aussi les bâtiments
        });

        if (!profile) return null;

        // 2. Calculer les ressources gagnées depuis lastUpdate (Lazy Update)
        const now = new Date();
        const lastUpdate = new Date(profile.lastUpdate);

        // Différence en heures (peut être décimal, ex: 0.5 pour 30min)
        const diffInMs = now.getTime() - lastUpdate.getTime();
        const diffInHours = diffInMs / (1000 * 60 * 60);

        // Si temps écoulé très faible (< 1s), on ne fait rien pour éviter les micro-calculs inutiles
        if (diffInHours <= 0) return profile;

        // Calcul des gains
        const newFood = profile.food + (profile.foodPerHour * diffInHours);
        const newWood = profile.wood + (profile.woodPerHour * diffInHours); // <--- Updated
        const newIron = profile.iron + (profile.ironPerHour * diffInHours);

        // 3. Mettre à jour la BDD avec les nouvelles valeurs
        // C'est crucial pour que "lastUpdate" avance et qu'on ne regagne pas les ressources à l'infini
        return this.prisma.playerProfile.update({
            where: {id: profile.id},
            data: {
                food: newFood,
                wood: newWood, // <--- Updated
                iron: newIron,
                lastUpdate: now,
            },
            include: {buildings: true},
        });
    }
}