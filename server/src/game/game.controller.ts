import { Controller, Get, Post, Body, Req, UnauthorizedException, Query } from '@nestjs/common';
import { GameService } from './game.service';
import type { Request } from 'express';
import { AuthService } from '../auth/auth.service';

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
}