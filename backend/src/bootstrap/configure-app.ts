/**
 * main.ts 와 E2E 가 동일한 미들웨어·전역 설정을 쓰도록 한 곳에 모읍니다.
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import express from 'express';
import { existsSync, mkdirSync } from 'fs';
import helmet from 'helmet';
import { join } from 'path';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';

export function resolveUploadsRoot(): string {
  return process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads');
}

export function ensureUploadDirs(): void {
  const root = resolveUploadsRoot();
  for (const sub of ['profiles', 'posts'] as const) {
    const dir = join(root, sub);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}

export function configureNestApp(app: INestApplication): void {
  app.enableShutdownHooks();
  ensureUploadDirs();

  const expressApp = app as NestExpressApplication;
  expressApp.use(cookieParser());
  expressApp.use(helmet());
  expressApp.use('/uploads', express.static(resolveUploadsRoot()) as express.RequestHandler);

  const corsOrigin = process.env.CORS_ORIGIN;
  app.enableCors({
    origin: corsOrigin ? corsOrigin.split(',').map((s) => s.trim()) : true,
    credentials: true,
  });

  app.useGlobalFilters(new AllExceptionsFilter());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
