/**
 * Nest 앱 진입점. 전역 미들웨어·접두사는 configureNestApp 에 모아 E2E 와 공유합니다.
 */
import { NestFactory } from '@nestjs/core';
import { configureNestApp } from './bootstrap/configure-app';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureNestApp(app);
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}
void bootstrap();
