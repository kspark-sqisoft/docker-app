import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

/**
 * Postgres가 떠 있어야 통과합니다.
 * 예: 프로젝트 루트에서 `docker compose up -d db` 또는
 * `docker compose -f docker-compose.dev.yml up -d db`
 * (기본 호스트 `localhost`, DB `board` / 사용자 `board` — `.env` 와 맞출 것)
 *
 * 앱 부트스트랩은 main.ts와 동일한 prefix/pipe 를 맞춥니다.
 */
describe('Posts API (e2e)', () => {
  let app: INestApplication<App> | undefined;

  function httpRequest() {
    return request(app!.getHttpServer());
  }

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

    await httpRequest().delete(`/api/posts/${created.id}`).expect(404);
  });
});
