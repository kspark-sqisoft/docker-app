/**
 * Nest 앱 진입점. 여기서 전역으로 쓰는 보안·검증·접두사를 한 번에 설정합니다.
 * (라우트는 각 Controller, DB 설정은 AppModule)
 */
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // SIGTERM 등으로 프로세스 종료 시 연결·구독 정리에 유리
  app.enableShutdownHooks();
  // HTTP 헤더 보강 (XSS·클릭재킹 등 완화). API JSON 위주라도 관례적으로 둠
  app.use(helmet());
  const corsOrigin = process.env.CORS_ORIGIN;
  app.enableCors({
    // 쉼표로 여러 Origin 허용. 비우면 브라우저에서 어떤 Origin 도 허용(개발 편의)
    origin: corsOrigin ? corsOrigin.split(',').map((s) => s.trim()) : true,
    credentials: true,
  });
  app.useGlobalFilters(new AllExceptionsFilter());
  // 모든 컨트롤러 경로 앞에 /api 붙음 → 실제 글 API 는 /api/posts
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO 에 없는 필드는 제거
      forbidNonWhitelisted: true, // DTO 에 없는 필드가 오면 400
      transform: true, // JSON 평면 객체 → DTO 클래스 인스턴스로 변환 후 검증
    }),
  );
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}
void bootstrap();
