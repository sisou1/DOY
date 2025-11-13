import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class UserService {
    constructor(private prisma: PrismaService) {}

    async createUser(username: string, password?: string): Promise<User> {
        return this.prisma.user.create({
            data: { username, password: password ?? null },
        });
    }

    async getUsers(): Promise<User[]> {
        return this.prisma.user.findMany();
    }
}
