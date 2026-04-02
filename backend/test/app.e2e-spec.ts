import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

/**
 * E2E(End-to-End) 테스트
 *
 * - **실제** Nest 앱(`AppModule`)을 띄우고, **실제 HTTP**(supertest)로 API 를 호출합니다.
 * - TypeORM 이 **진짜 Postgres** 에 붙으므로 DB 가 떠 있어야 합니다.
 *
 * 예: 프로젝트 루트에서 `docker compose up -d db` 또는
 * `docker compose -f docker-compose.dev.yml up -d db`
 * (호스트 `localhost`, DB/사용자 `board` — `.env` 와 맞출 것)
 *
 * main.ts 와 맞추기: 전역 prefix `api`, ValidationPipe 동일 설정.
 */
describe('Posts API (e2e)', () => {
  let app: INestApplication<App> | undefined;

  /** supertest 가 붙을 HTTP 서버 (인메모리, 실제 포트 리슨과는 별개) */
  function httpRequest() {
    return request(app!.getHttpServer());
  }

  // 스위트 전체에서 앱 한 번만 기동 — DB 연결 비용·시간 절약
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const nestApp = moduleFixture.createNestApplication();
    nestApp.setGlobalPrefix('api');
    nestApp.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await nestApp.init();
    app = nestApp;
  }, 60_000);

  afterAll(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
  });

  it('GET /api/health — 상태', async () => {
    // Docker healthcheck 와 동일 엔드포인트 — 프로세스가 응답하는지
    const res = await httpRequest().get('/api/health').expect(200);
    const body = res.body as { status: string; timestamp: string };
    expect(body).toMatchObject({ status: 'ok' });
    expect(body.timestamp).toBeDefined();
  });

  it('GET /api/posts — 목록', async () => {
    const res = await httpRequest().get('/api/posts').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/posts — 작성 후 목록에 포함', async () => {
    // 제목에 타임스탬프를 넣어 다른 테스트·기존 데이터와 충돌 줄임
    const title = `e2e-${Date.now()}`;
    await httpRequest()
      .post('/api/posts')
      .send({ title, content: 'e2e 본문' })
      .expect(201);

    const res = await httpRequest().get('/api/posts').expect(200);
    const list = res.body as { title: string }[];
    expect(list.some((p) => p.title === title)).toBe(true);
  });

  it('DELETE /api/posts/:id — 작성 후 삭제', async () => {
    const createRes = await httpRequest()
      .post('/api/posts')
      .send({ title: `del-${Date.now()}`, content: 'x' })
      .expect(201);
    const created = createRes.body as { id: string };

    await httpRequest().delete(`/api/posts/${created.id}`).expect(200);

    // 두 번째 삭제는 없는 id → 서비스에서 NotFoundException → 404
    await httpRequest().delete(`/api/posts/${created.id}`).expect(404);
  });
});
