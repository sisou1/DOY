import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { GameModule } from './game/game.module';

@Module({
    imports: [
        PrismaModule,
        UserModule,
        AuthModule,
        GameModule
    ],
})
export class AppModule {}