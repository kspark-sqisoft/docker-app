import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';
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
 *
 * **데이터 정리:** 트랜잭션 롤백은 HTTP+풀 구조에서 쓰기 어렵습니다.
 * 개발 DB 를 같이 쓰는 경우를 위해 **`TRUNCATE` 는 쓰지 않고**, 제목이
 * `E2E_TITLE_PREFIX` 로 시작하는 행만 `DELETE` 합니다. (일반 글은 유지)
 */
/** 이 접두사로 시작하는 글만 e2e 가 만들고, 훅에서 지웁니다. */
const E2E_TITLE_PREFIX = '__study_board_e2e__';

describe('Posts API (e2e)', () => {
  let app: INestApplication<App> | undefined;
  let dataSource: DataSource;

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
    dataSource = nestApp.get(DataSource);
  }, 60_000);

  async function deleteE2ePostsOnly() {
    await dataSource.query(`DELETE FROM posts WHERE title LIKE $1`, [
      `${E2E_TITLE_PREFIX}%`,
    ]);
  }

  beforeEach(async () => {
    await deleteE2ePostsOnly();
  });

  afterAll(async () => {
    if (app) {
      await deleteE2ePostsOnly();
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
    const title = `${E2E_TITLE_PREFIX}${Date.now()}`;
    await httpRequest()
      .post('/api/posts')
      .send({ title, content: 'e2e 테스트 본문' })
      .expect(201);

    const res = await httpRequest().get('/api/posts').expect(200);
    const list = res.body as { title: string }[];
    expect(list.some((p) => p.title === title)).toBe(true);
  });

  it('DELETE /api/posts/:id — 작성 후 삭제', async () => {
    const createRes = await httpRequest()
      .post('/api/posts')
      .send({ title: `${E2E_TITLE_PREFIX}del_${Date.now()}`, content: 'x' })
      .expect(201);
    const created = createRes.body as { id: string };

    await httpRequest().delete(`/api/posts/${created.id}`).expect(200);

    // 두 번째 삭제는 없는 id → 서비스에서 NotFoundException → 404
    await httpRequest().delete(`/api/posts/${created.id}`).expect(404);
  });
});
