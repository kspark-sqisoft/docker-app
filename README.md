# Docker 스터디 — 게시판 + JWT 인증

NestJS + PostgreSQL + React(Vite) 를 Docker Compose 로 묶은 예제입니다. **게시글 API**는 그대로 공개이고, **회원가입·로그인·프로필(이름·이미지)** 은 JWT 기반 Auth 모듈로 제공합니다.

## 인증 설계 요약 (공부용 실무 패턴)

| 항목 | 구현 |
|------|------|
| **액세스 토큰** | 짧은 수명 JWT. 응답 JSON의 `accessToken`으로 받고, 보호 API는 `Authorization: Bearer …` 로 전달합니다. |
| **리프레시 토큰** | 긴 수명 **불투명(opaque)** 문자열. **httpOnly** 쿠키로만 전달(`path=/api/auth`, `SameSite=Lax`). 브라우저 JS로 읽을 수 없습니다. |
| **DB 저장** | 사용자 테이블에 리프레시 토큰 **평문이 아니라 SHA-256 해시**만 저장합니다. 재발급 시 **토큰 로테이션**(이전 해시 무효·새 쿠키 발급). |
| **비밀번호** | `bcrypt` 해시만 저장(`passwordHash`, 조회 시 기본 `select` 에서 제외). |
| **프로필 이미지** | 백엔드 서버 디스크 `uploads/profiles/` 에 저장, URL 은 `/uploads/profiles/…` 로 노출. 운영 Compose 에서는 볼륨 `backend_uploads` 로 유지합니다. |

**프론트:** `main.tsx` 에서 Zustand 스토어 `bootstrap()` 으로 세션 복구(`POST /api/auth/refresh`, `credentials: 'include'`). 동시에 두 번 호출되어도 한 번만 나가도록 `src/api/auth.ts` 의 `refreshAuthSession` 에 in-flight 공유 Promise 를 두었습니다. 인증 상태는 `src/features/auth/store/auth-store.ts` (`zustand`) 에 둡니다.

**쿠키 `Secure`:** 로컬 HTTP(5173/8080)에서는 `REFRESH_COOKIE_SECURE=false` 가 기본입니다. HTTPS 뒤에 올릴 때만 `true` 로 두세요.

### Auth 관련 API (모두 전역 접두사 `/api` 포함)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/auth/register` | 회원가입 → `accessToken` + `user` + 리프레시 쿠키 설정 |
| POST | `/auth/login` | 로그인 → 동일 |
| POST | `/auth/refresh` | 리프레시 쿠키로 액세스 토큰·유저 재발급(쿠키 로테이션) |
| POST | `/auth/logout` | Bearer 필요 — DB 해시 제거 + 쿠키 삭제 |
| GET | `/auth/me` | Bearer 필요 — 현재 사용자 |
| PATCH | `/auth/me` | Bearer — `name` 수정 |
| POST | `/auth/me/avatar` | Bearer — `multipart/form-data` 필드명 `file`, 이미지 최대 2MB(jpeg/png/webp/gif) |

**게시글 API:** `GET /api/posts` 목록(본문 제외, 작성자 이름 포함) · `GET /api/posts/:id` 상세(공개) · `POST /api/posts` 작성 · `PATCH /api/posts/:id` 수정 · `DELETE /api/posts/:id` 삭제 — 작성·수정·삭제는 **Bearer(JWT)** 필요하며 **작성자 본인**만 수정/삭제 가능합니다.

**프론트 라우트:** `/posts` 목록 · `/posts/new` 작성(로그인) · `/posts/:id` 보기 · `/posts/:id/edit` 수정(로그인·작성자) · `/login` · `/register` · `/profile`.  
**공통 UI:** `RootLayout` 에 브랜드·인증 바(`SiteHeaderBar`)와 라우트 `handle.title` 기반 페이지 제목(`PageTitleHeading`)이 항상 붙습니다.

## 환경 변수

`.env.example` 을 복사해 `.env` 로 쓰면 됩니다. **로컬에서 `nest start` 만 할 때도** `JWT_ACCESS_SECRET` 은 **32자 이상** 필수입니다.

Docker Compose 파일에는 개발용 기본 시크릿이 들어 있지만, **실제 배포 전에는 반드시 교체**하세요.

## 빠른 시작 (운영용 이미지)

```powershell
cd D:\Study\Docker\docker_app
copy .env.example .env
docker compose up -d --build
```

- **웹:** http://localhost:8080 (게시판 UI 는 `/posts`, `/` 는 `/posts` 로 이동)
- **API:** http://localhost:3000/api/posts
- **헬스(상태 점검):** http://localhost:3000/api/health — Docker Compose `healthcheck`·E2E 등에서 “백엔드가 응답하는지” 확인할 때 사용합니다. 자세한 설명은 **STUDY-GUIDE 5-4절** 참고.
- **Swagger(OpenAPI):** http://localhost:3000/docs (Docker nginx 8080 사용 시 http://localhost:8080/docs). 사용 팁은 아래 **Swagger(OpenAPI) 사용 팁** 절 참고.

**이미 한 번 빌드한 뒤라면** 평소에는 아래만으로 충분합니다.

```powershell
docker compose up -d
# 중지
docker compose down
```

## Docker 명령어 요약 (`up` vs `--build` · 평소 켜고 끄기)

| 명령 | 하는 일 |
|------|---------|
| `docker compose up -d` | **이미 있는 이미지**로 컨테이너를 만들고/켭니다. Dockerfile을 바꿔도 **자동으로 다시 빌드하지 않습니다**. |
| `docker compose up -d --build` | 올리기 **전에** 이미지를 **다시 빌드**합니다. Dockerfile·의존성 파일·엔트리포인트를 수정한 뒤에 필요합니다. |
| `docker compose down` | 운영 스택 컨테이너·네트워크 정리(DB 볼륨은 기본 유지). |

**개발 Compose**도 같습니다. `Dockerfile.dev` / `docker-dev-entrypoint.sh` 를 안 건드렸다면 평소에는 `--build` 없이 `up` / `down` 만 써도 됩니다.

| 상황 | 운영 (`docker-compose.yml`) | 개발 (`docker-compose.dev.yml`) |
|------|-----------------------------|--------------------------------|
| **평소** (이미지·설정 그대로) | `docker compose up -d` → `docker compose down` | `docker compose -f docker-compose.dev.yml up` → `... down` |
| **처음** 또는 이미지 삭제·Dockerfile 변경 후 | `docker compose up -d --build` | `docker compose -f docker-compose.dev.yml up --build` |

**운영 ↔ 개발 전환:** `3000`·`5432`·`8080` 이 겹치므로, 한쪽을 켜기 전에 **다른 쪽을 `down`** 하세요.

```powershell
docker compose down
docker compose -f docker-compose.dev.yml up
```

반대로 개발에서 운영으로 갈 때는 `docker compose -f docker-compose.dev.yml down` 후 `docker compose up -d` 를 쓰면 됩니다.

## Swagger(OpenAPI) 사용 팁

| 항목 | 설명 |
|------|------|
| **어디서 열까** | 백엔드가 떠 있는 호스트 기준으로 **http://localhost:3000/docs** 가 기본입니다. 운영 Compose(프론트 nginx)를 쓰면 **http://localhost:8080/docs** 로도 동일 UI에 접근할 수 있습니다(`nginx.conf`에서 `/docs`·`/docs-json` 프록시). **Vite만** `5173`으로 띄운 경우에는 `/docs` 프록시가 없으므로 **백엔드 포트(3000)의 `/docs`** 로 여세요. |
| **OpenAPI JSON** | **http://localhost:3000/docs-json** (또는 8080 사용 시 `/docs-json`). Postman·Insomnia 등에 스펙 임포트할 때 사용합니다. |
| **Try it out** | 각 엔드포인트에서 요청 본문·파라미터를 채운 뒤 **Execute** 하면 실제로 API가 호출됩니다. CORS는 백엔드 설정을 따릅니다. |
| **Bearer(JWT)** | 우측 상단 **Authorize** → `access-token`(HTTP Bearer)에 **액세스 토큰 문자열만** 넣습니다(`Bearer ` 접두사는 붙이지 않아도 됩니다). `POST /api/auth/register` 또는 `POST /api/auth/login` 응답 JSON의 `accessToken` 값을 복사하면 됩니다. 설정은 브라우저에 잠시 저장됩니다(`persistAuthorization`). |
| **리프레시 쿠키** | 리프레시 토큰은 **httpOnly 쿠키**라 값을 직접 붙여 넣을 수 없습니다. **같은 브라우저 탭**에서 Swagger를 연 상태로, 먼저 **로그인 또는 회원가입**을 `Try it out`으로 호출해 쿠키를 받은 뒤 `POST /api/auth/refresh` 를 실행하면 됩니다(문서상 **refresh-cookie** 스킴이 켜져 있어야 합니다). |
| **호출 순서 예시** | ① `register` 또는 `login` → ② **Authorize**에 `accessToken` 입력 → ③ `GET /api/auth/me` 등 보호 API 실행. 액세스 토큰이 만료되면 ①의 쿠키가 남아 있다면 `refresh`로 새 토큰을 받은 뒤 다시 Authorize를 갱신합니다. |
| **파일 업로드** | `POST /api/auth/me/avatar`, `POST /api/posts/images` 는 **multipart/form-data** 필드 **`file`** 입니다. Try it out에서 파일 선택 후 실행합니다. |
| **공개 API** | `GET /api/posts`, `GET /api/posts/{id}`, `GET /api/health` 등은 Bearer 없이 호출 가능합니다. |
| **운영 노출** | 실제 인터넷에 서비스할 때는 API 문서를 외부에 열지 않는 편이 안전합니다. 필요하면 `NODE_ENV === 'production'` 일 때만 `configureSwagger` 호출을 건너뛰도록 코드에서 분기하는 방식을 검토하세요. |

## 개발용 (Docker + 핫 리로드)

| 파일                     | 역할                                            |
| ------------------------ | ----------------------------------------------- |
| `docker-compose.yml`     | 운영: 빌드 이미지 + nginx(8080)                 |
| `docker-compose.dev.yml` | 개발: 소스 마운트 + `nest --watch` + Vite(5173) |

소스 마운트로 코드 저장 후 바로 반영합니다. (`Dockerfile.dev`, `name: study-board-dev`, 볼륨 분리 등은 [STUDY-GUIDE 6-2절](docs/STUDY-GUIDE.md) 참고)

```powershell
docker compose -f docker-compose.dev.yml up
# 중지
docker compose -f docker-compose.dev.yml down
```

(`Dockerfile.dev` / `docker-dev-entrypoint.sh` / `package.json`·lock 을 바꾼 뒤에는 `up --build` 로 이미지 재빌드 — 위 표 참고)

- **웹:** http://localhost:5173/posts (또는 운영 **http://localhost:8080/posts** — 루트 `/` 는 `/posts` 로 리다이렉트)
- **API:** http://localhost:3000/api/posts · **헬스:** http://localhost:3000/api/health (용도는 위 빠른 시작과 동일, **STUDY-GUIDE 5-4절**)

의존성은 `package.json`·`package-lock.json` 이 바뀔 때만 컨테이너 안에서 `npm install` 됩니다(평소 `up` 이 빠름). 모듈 오류가 나면 `docker volume ls` 에서 `*_node_modules` 볼륨을 지운 뒤 다시 `up` 하세요.

**Windows:** 예전에 `exec ... docker-dev-entrypoint.sh: no such file or directory` 가 났다면 셸 스크립트 CRLF 문제였습니다. 현재 `Dockerfile.dev` 에서 빌드 시 줄바꿈을 정리하므로, 그때는 **`up --build`** 로 이미지를 다시 빌드하면 됩니다.

**업로드 파일:** 개발 시 `backend/uploads/` 가 호스트에 생깁니다(`.gitignore` 에 `uploads` 포함). 운영 Compose 는 `backend_uploads` 볼륨을 `/app/uploads` 에 마운트합니다.

## 백엔드 테스트 (Jest)

`backend` 폴더에서 실행합니다.

| 명령 | 종류 | DB(Postgres) |
|------|------|----------------|
| `npm test` | **단위 테스트** (`src/**/*.spec.ts`) | 불필요 |
| `npm run test:e2e` | **E2E** (`test/app.e2e-spec.ts`, 실제 HTTP + DB) | 필요 (`docker compose up -d db` 등) |

**차이 요약:** 단위는 서비스·컨트롤러 등을 **목으로 떼어** 빠르게 검증하고, E2E는 **앱 전체를 띄워** API·DB 까지 통과하는지 확인합니다.  
명령어·환경 변수·주의점은 **[docs/STUDY-GUIDE.md](docs/STUDY-GUIDE.md)** 의 **7-7절**에 정리해 두었습니다.

E2E 는 `test/jest-e2e.setup.ts` 에서 `JWT_ACCESS_SECRET` 기본값을 채워 Config 검증을 통과합니다. 로컬에서 `AppModule` 을 띄울 때도 루트 `.env` 에 `JWT_ACCESS_SECRET` 이 있어야 합니다.

## 문서

Docker 명령·스택 전환·DB만 실행·**Compose별 Swagger URL** 등은 **[DOCKER.md](DOCKER.md)** 에 모아 두었습니다.  
단계별 개념과 절차는 **[docs/STUDY-GUIDE.md](docs/STUDY-GUIDE.md)** 를 먼저 읽는 것을 권장합니다. **실행 후 API·8080 프록시·브라우저·테스트**는 가이드 **7절**(단위/E2E 포함)에 체크리스트로 정리되어 있습니다.

## 구성

- `backend/` — NestJS, Posts·**Auth** 모듈, TypeORM `User`, 로컬 업로드, `Dockerfile`
- `frontend/` — Vite React, **React Router**(`src/app/router.tsx`, 레이아웃 `src/app/layouts`), **TanStack Query**, **Zustand**, **Zod**, **Tailwind CSS v4**, **shadcn/ui (Nova)**, 기능 폴더 `src/features/{auth,posts}`, `src/pages`(예: 게시판 `/posts`), nginx 프록시(`/api`, `/uploads`), `Dockerfile`
- `docker-compose.yml` — 운영 스타일, `db` / `backend`(업로드 볼륨) / `frontend`
- `docker-compose.dev.yml` — 개발 스타일, 볼륨 마운트 + 핫 리로드 (`name: study-board-dev`)

운영 DB 데이터는 볼륨 `postgres_data`, 개발은 `postgres_data_dev`, 프로필 파일은 운영 `backend_uploads` 등입니다. 삭제 시 각각 `docker compose down -v` / `docker compose -f docker-compose.dev.yml down -v`.
