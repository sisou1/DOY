import { 
    Controller, Get, Post, Delete, Body, Req,
    UnauthorizedException, Query, BadRequestException, Param // <-- AJOUTER CES IMPORTS
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import {GameService} from "./game.service";

@Controller('game')
export class GameController {
  constructor(
    private gameService: GameService,
    private authService: AuthService
  ) {}

  @Get('my-profile')
  async getMyProfile(@Req() req: Request) {
    const sessionId = req.cookies?.sessionId;
    if (!sessionId) throw new UnauthorizedException('No session');
    const userId = this.authService.getUserIdFromSession(sessionId);
    if (!userId) throw new UnauthorizedException('Invalid session');

    let profile = await this.gameService.getProfile(userId);
    if (!profile) {
      profile = await this.gameService.createProfile(userId);
    }
    return { success: true, profile };
  }

  // ROUTE RENOMMÉE : /upgrade
  @Post('upgrade')
  async upgrade(
    @Req() req: Request, 
    @Body('type') type: string
  ) {
    const sessionId = req.cookies?.sessionId;
    if (!sessionId) throw new UnauthorizedException('No session');
    const userId = this.authService.getUserIdFromSession(sessionId);
    if (!userId) throw new UnauthorizedException('Invalid session');

    const updatedProfile = await this.gameService.upgradeBuilding(userId, type);
    return { success: true, profile: updatedProfile };
  }

  @Post('reset')
  async reset(@Req() req: Request) {
    const sessionId = req.cookies?.sessionId;
    if (!sessionId) throw new UnauthorizedException('No session');
    const userId = this.authService.getUserIdFromSession(sessionId);
    if (!userId) throw new UnauthorizedException('Invalid session');

    const newProfile = await this.gameService.resetProfile(userId);
    return { success: true, profile: newProfile };
  }

  @Get('building-stats')
  getStats(
    @Query('type') type: string,
    @Query('level') level: string
  ) {
    
    const lvl = parseInt(level, 10);
    if (isNaN(lvl) || !type) return { success: false };

    const stats = this.gameService.getNextLevelStats(type, lvl);
    return { success: true, stats };
  }

  // ROUTE DE TEST : Ajouter de l'XP avec un montant variable
  @Post('cheat-xp')
  async cheatXp(
    @Req() req: Request,
    @Body('amount') amount: number // On récupère le champ "amount" du JSON envoyé
  ) {
    const sessionId = req.cookies?.sessionId;
    if (!sessionId) throw new UnauthorizedException('No session');
    const userId = this.authService.getUserIdFromSession(sessionId);
    if (!userId) throw new UnauthorizedException('Invalid session');

    // Par défaut 1000 si rien n'est envoyé, sinon la valeur demandée
    const xpToAdd = amount ? parseInt(amount.toString()) : 1000;

    await this.gameService.addExperience(userId, xpToAdd);
    
    const profile = await this.gameService.getProfile(userId);
    return { success: true, profile };
  }

  // --- ROUTES BATAILLE ---

  @Get('battle/pve-presets')
  getPvEPresets() {
    const presets = this.gameService.getPvEPresets();
    return { success: true, presets };
  }

  @Post('battle/start-pve')
  async startPvE(
    @Req() req: Request,
    @Body('presetId') presetIdBody?: string,
    @Query('presetId') presetIdQuery?: string
  ) {
    const sessionId = req.cookies?.sessionId;
    if (!sessionId) throw new UnauthorizedException('No session');
    const userId = this.authService.getUserIdFromSession(sessionId);
      if (!userId) throw new UnauthorizedException('Invalid session');

      const presetId = presetIdBody || presetIdQuery || 'goblin_patrol';
      const battle = await this.gameService.startPvEBattle(userId, presetId);
    return { success: true, battle };
  }

  @Get('battle/:id')
  async getBattle(@Req() req: Request, @Param('id') id: string) {
    const sessionId = req.cookies?.sessionId;
    if (!sessionId) throw new UnauthorizedException('No session');
    const userId = this.authService.getUserIdFromSession(sessionId);
    if (!userId) throw new UnauthorizedException('Invalid session');

    const battleId = parseInt(id);
    if (isNaN(battleId)) throw new BadRequestException('Invalid ID');

    const battle = await this.gameService.getBattle(userId, battleId);
    return { success: true, battle };
  }

  @Get('heroes/recruitment')
  async getHeroRecruitment(@Req() req: Request) {
    const sessionId = req.cookies?.sessionId;
    if (!sessionId) throw new UnauthorizedException('No session');
    const userId = this.authService.getUserIdFromSession(sessionId);
    if (!userId) throw new UnauthorizedException('Invalid session');

    const recruitment = await this.gameService.getHeroRecruitment(userId);
    return { success: true, recruitment };
  }

  @Post('heroes/recruit')
  async recruitHero(@Req() req: Request, @Body('type') type: string) {
    const sessionId = req.cookies?.sessionId;
    if (!sessionId) throw new UnauthorizedException('No session');
    const userId = this.authService.getUserIdFromSession(sessionId);
    if (!userId) throw new UnauthorizedException('Invalid session');

    const recruitment = await this.gameService.recruitHero(userId, type);
    return { success: true, recruitment };
  }

  @Delete('heroes/:id')
  async dismissHero(@Req() req: Request, @Param('id') id: string) {
    const sessionId = req.cookies?.sessionId;
    if (!sessionId) throw new UnauthorizedException('No session');
    const userId = this.authService.getUserIdFromSession(sessionId);
    if (!userId) throw new UnauthorizedException('Invalid session');

    const heroId = parseInt(id, 10);
    if (isNaN(heroId)) throw new BadRequestException('Invalid hero ID');

    const recruitment = await this.gameService.dismissHero(userId, heroId);
    return { success: true, recruitment };
  }
}
