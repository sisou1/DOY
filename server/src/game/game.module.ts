import { Module } from '@nestjs/common';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { PrismaModule } from '../prisma.module';
import { AuthModule } from '../auth/auth.module'; // Import nécessaire pour utiliser AuthService

@Module({
    imports: [PrismaModule, AuthModule],
    controllers: [GameController],
    providers: [GameService],
    exports: [GameService], // Au cas où d'autres modules en auraient besoin
})
export class GameModule {}