import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { configureNestApp } from './../src/bootstrap/configure-app';
import { AppModule } from './../src/app.module';

/**
 * E2E(End-to-End) 테스트
 *
 * **데이터 정리:** 제목 `E2E_TITLE_PREFIX`, 이메일 `E2E_EMAIL_PREFIX` 만 삭제합니다.
 */
const E2E_TITLE_PREFIX = '__study_board_e2e__';
const E2E_EMAIL_PREFIX = '__study_board_e2e_user_';

describe('App (e2e)', () => {
  let app: INestApplication<App> | undefined;
  let dataSource: DataSource;

  function httpRequest() {
    return request(app!.getHttpServer());
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const nestApp = moduleFixture.createNestApplication();
    configureNestApp(nestApp);
    await nestApp.init();
    app = nestApp;
    dataSource = nestApp.get(DataSource);
  }, 60_000);

  async function deleteE2ePostsOnly() {
    await dataSource.query(`DELETE FROM posts WHERE title LIKE $1`, [
      `${E2E_TITLE_PREFIX}%`,
    ]);
  }

  async function deleteE2eUsersOnly() {
    await dataSource.query(`DELETE FROM users WHERE email LIKE $1`, [
      `${E2E_EMAIL_PREFIX}%`,
    ]);
  }

  beforeEach(async () => {
    await deleteE2ePostsOnly();
    await deleteE2eUsersOnly();
  });

  afterAll(async () => {
    if (app) {
      await deleteE2ePostsOnly();
      await deleteE2eUsersOnly();
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

  it('GET /api/posts — 목록(본문 없음)', async () => {
    const res = await httpRequest().get('/api/posts').expect(200);
    const list = res.body as Record<string, unknown>[];
    expect(Array.isArray(list)).toBe(true);
    if (list.length > 0) {
      expect(list[0]).not.toHaveProperty('content');
      expect(list[0]).toHaveProperty('authorName');
    }
  });

  it('POST /api/posts — 비로그인 401', async () => {
    await httpRequest()
      .post('/api/posts')
      .send({ title: `${E2E_TITLE_PREFIX}x`, content: 'c' })
      .expect(401);
  });

  it('POST /api/posts — 로그인 후 작성·상세·목록·삭제', async () => {
    const email = `${E2E_EMAIL_PREFIX}${Date.now()}@example.com`;
    const reg = await httpRequest()
      .post('/api/auth/register')
      .send({
        email,
        password: 'e2e_pass_8chars',
        name: 'E2E Poster',
      })
      .expect(201);
    const { accessToken } = reg.body as { accessToken: string };

    const title = `${E2E_TITLE_PREFIX}${Date.now()}`;
    const createRes = await httpRequest()
      .post('/api/posts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title, content: '본문 내용' })
      .expect(201);
    const created = createRes.body as {
      id: string;
      content: string;
      authorId: string;
    };
    expect(created.content).toBe('본문 내용');
    expect(created.authorId).toBeDefined();

    const one = await httpRequest()
      .get(`/api/posts/${created.id}`)
      .expect(200);
    expect((one.body as { title: string }).title).toBe(title);

    const list = await httpRequest().get('/api/posts').expect(200);
    expect(
      (list.body as { id: string }[]).some((p) => p.id === created.id),
    ).toBe(true);

    await httpRequest()
      .patch(`/api/posts/${created.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: `${title}_edited` })
      .expect(200);

    await httpRequest()
      .delete(`/api/posts/${created.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    await httpRequest().get(`/api/posts/${created.id}`).expect(404);
  });

  it('DELETE /api/posts/:id — 다른 사용자 403', async () => {
    const emailA = `${E2E_EMAIL_PREFIX}a_${Date.now()}@example.com`;
    const emailB = `${E2E_EMAIL_PREFIX}b_${Date.now()}@example.com`;
    const regA = await httpRequest()
      .post('/api/auth/register')
      .send({
        email: emailA,
        password: 'e2e_pass_8chars',
        name: 'A',
      })
      .expect(201);
    const regB = await httpRequest()
      .post('/api/auth/register')
      .send({
        email: emailB,
        password: 'e2e_pass_8chars',
        name: 'B',
      })
      .expect(201);
    const tokenA = (regA.body as { accessToken: string }).accessToken;
    const tokenB = (regB.body as { accessToken: string }).accessToken;

    const title = `${E2E_TITLE_PREFIX}own_${Date.now()}`;
    const createRes = await httpRequest()
      .post('/api/posts')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ title, content: 'x' })
      .expect(201);
    const id = (createRes.body as { id: string }).id;

    await httpRequest()
      .delete(`/api/posts/${id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(403);
  });

  it('POST /api/auth/register — 가입 후 GET /api/auth/me', async () => {
    const email = `${E2E_EMAIL_PREFIX}${Date.now()}@example.com`;
    const reg = await httpRequest()
      .post('/api/auth/register')
      .send({
        email,
        password: 'e2e_pass_8chars',
        name: 'E2E User',
      })
      .expect(201);
    const body = reg.body as { accessToken: string; user: { id: string } };
    expect(body.accessToken).toBeDefined();
    expect(body.user?.id).toBeDefined();

    await httpRequest()
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${body.accessToken}`)
      .expect(200)
      .expect((res) => {
        expect((res.body as { email: string }).email).toBe(email);
      });
  });

  it('POST /api/auth/refresh — 쿠키로 액세스 토큰 재발급', async () => {
    const email = `${E2E_EMAIL_PREFIX}ref_${Date.now()}@example.com`;
    const agent = request.agent(app!.getHttpServer());
    const reg = await agent
      .post('/api/auth/register')
      .send({
        email,
        password: 'e2e_pass_8chars',
        name: 'E2E Refresh',
      })
      .expect(201);
    const first = reg.body as { accessToken: string };
    expect(first.accessToken).toBeDefined();

    const ref = await agent.post('/api/auth/refresh').expect(200);
    const second = ref.body as { accessToken: string };
    expect(second.accessToken).toBeDefined();
    expect(second.accessToken).not.toBe(first.accessToken);
  });
});
