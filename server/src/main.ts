import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser'; // <--- Est-ce que cet import est là ?

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ACTIVATION DU PARSER DE COOKIES
  app.use(cookieParser()); // <--- Est-ce que cette ligne est là ?

  app.enableCors({
    origin: 'http://localhost:5173',
    credentials: true,
  });

  await app.listen(3000);
}
bootstrap();