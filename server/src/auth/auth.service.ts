import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';

@Injectable()
export class AuthService {
    constructor(private userService: UserService) {}

    // sessions stockées en mémoire
    private sessions = new Map<string, number>(); // sessionId -> userId

    async login(username: string, password: string): Promise<string | null> {
        const users = await this.userService.getUsers();
        const user = users.find(u => u.username === username && u.password === password);

        if (!user) return null;

        const sessionId = Math.random().toString(36).substring(2);
        this.sessions.set(sessionId, user.id);
        return sessionId;
    }

    getUserIdFromSession(sessionId: string): number | null {
        return this.sessions.get(sessionId) ?? null;
    }

    logout(sessionId: string): boolean {
        return this.sessions.delete(sessionId);
    }
}
