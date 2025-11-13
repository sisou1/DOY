import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma.module';
import { UserModule } from './user/user.module';

@Module({
    imports: [PrismaModule, UserModule],
})
export class AppModule {}
