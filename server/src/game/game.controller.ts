import { Controller, Get, Req, UnauthorizedException } from '@nestjs/common';
import { GameService } from './game.service';
import type { Request } from 'express';
import { AuthService } from '../auth/auth.service'; // Pour retrouver l'ID via session

@Controller('game')
export class GameController {
    constructor(
        private gameService: GameService,
        private authService: AuthService
    ) {}

    // Route principale pour récupérer son état de jeu (Ressources + Bâtiments)
    // GET /game/my-profile
    @Get('my-profile')
    async getMyProfile(@Req() req: Request) {
        // Récupération de l'utilisateur via le cookie de session
        const sessionId = req.cookies?.sessionId;
        if (!sessionId) throw new UnauthorizedException('No session');

        const userId = this.authService.getUserIdFromSession(sessionId);
        if (!userId) throw new UnauthorizedException('Invalid session');

        // Récupération du profil avec calcul des ressources à jour
        let profile = await this.gameService.getProfile(userId);

        // Si le profil n'existe pas (vieux user sans profil), on le crée à la volée
        // (C'est une sécurité pour le dev, en prod on le ferait à l'inscription)
    if (!profile) {
        profile = await this.gameService.createProfile(userId);
    }

        return { success: true, profile };
    }
}