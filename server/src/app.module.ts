import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { GameModule } from './game/game.module'; // <--- Import ici

@Module({
    imports: [
        PrismaModule,
        UserModule,
        AuthModule,
        GameModule
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}