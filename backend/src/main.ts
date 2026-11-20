import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: (process.env.FRONTEND_URL || 'http://localhost:3001').split(','),
    credentials: true,
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } }),
  );
  // Fotos salvas localmente quando o Supabase Storage não estiver configurado
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });

  const port = Number(process.env.PORT || 3334);
  await app.listen(port);
  console.log(`🐾 API Clínica Pet · Estoque rodando em http://localhost:${port}/api`);
}
bootstrap();
