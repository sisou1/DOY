import { Controller, Post, Body, Res, Get, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { Response, Request } from 'express';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) {}

    @Post('login')
    async login(
        @Body('username') username: string,
        @Body('password') password: string,
        @Res({ passthrough: true }) res: Response,
    ) {
        const sessionId = await this.authService.login(username, password);

        if (!sessionId) {
            return { success: false, message: 'Invalid credentials' };
        }

        // cookie ultra simple
        res.cookie('sessionId', sessionId, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
        });

        return { success: true };
    }

    @Post('logout')
    async logout(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        const sessionId = req.cookies?.sessionId;
        if (sessionId) {
            this.authService.logout(sessionId);
            res.clearCookie('sessionId');
        }
        return { success: true };
    }

    @Get('me')
    async me(@Req() req: Request) {
        const sessionId = req.cookies?.sessionId;
        if (!sessionId) return { user: null };

        const userId = this.authService.getUserIdFromSession(sessionId);
        if (!userId) return { user: null };

        return { userId };
    }
}
