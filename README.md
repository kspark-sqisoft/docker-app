# Docker 스터디 — 간단 게시판

NestJS + PostgreSQL + React(Vite) 를 Docker Compose 로 묶은 **로그인 없는 게시판** 예제입니다.

## 빠른 시작 (운영용 이미지)

```powershell
cd D:\Study\Docker\docker_app
copy .env.example .env
docker compose up -d --build
```

- **웹:** http://localhost:8080
- **API:** http://localhost:3000/api/posts

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

- **웹:** http://localhost:5173 (또는 운영과 같은 **http://localhost:8080** — 개발 Compose 가 8080→Vite 로 연결)
- **API:** http://localhost:3000/api/posts

의존성은 `package.json`·`package-lock.json` 이 바뀔 때만 컨테이너 안에서 `npm install` 됩니다(평소 `up` 이 빠름). 모듈 오류가 나면 `docker volume ls` 에서 `*_node_modules` 볼륨을 지운 뒤 다시 `up` 하세요.

**Windows:** 예전에 `exec ... docker-dev-entrypoint.sh: no such file or directory` 가 났다면 셸 스크립트 CRLF 문제였습니다. 현재 `Dockerfile.dev` 에서 빌드 시 줄바꿈을 정리하므로, 그때는 **`up --build`** 로 이미지를 다시 빌드하면 됩니다.

## 백엔드 테스트 (Jest)

`backend` 폴더에서 실행합니다.

| 명령 | 종류 | DB(Postgres) |
|------|------|----------------|
| `npm test` | **단위 테스트** (`src/**/*.spec.ts`) | 불필요 |
| `npm run test:e2e` | **E2E** (`test/app.e2e-spec.ts`, 실제 HTTP + DB) | 필요 (`docker compose up -d db` 등) |

**차이 요약:** 단위는 서비스·컨트롤러 등을 **목으로 떼어** 빠르게 검증하고, E2E는 **앱 전체를 띄워** API·DB 까지 통과하는지 확인합니다.  
명령어·환경 변수·주의점은 **[docs/STUDY-GUIDE.md](docs/STUDY-GUIDE.md)** 의 **7-7절**에 정리해 두었습니다.

## 문서

단계별 개념과 절차는 **[docs/STUDY-GUIDE.md](docs/STUDY-GUIDE.md)** 를 먼저 읽는 것을 권장합니다. **실행 후 API·8080 프록시·브라우저·테스트**는 가이드 **7절**(단위/E2E 포함)에 체크리스트로 정리되어 있습니다.

## 구성

- `backend/` — NestJS, Posts 모듈, `Dockerfile`
- `frontend/` — Vite React, **TanStack Query**, **Zod**, **Tailwind CSS v4**, **shadcn/ui (Nova)**, nginx 프록시, `Dockerfile`
- `docker-compose.yml` — 운영 스타일, `db` / `backend` / `frontend` (빌드 이미지)
- `docker-compose.dev.yml` — 개발 스타일, 볼륨 마운트 + 핫 리로드 (`name: study-board-dev`)

운영 DB 데이터는 볼륨 `postgres_data`, 개발은 `postgres_data_dev` 등 별도입니다. 삭제 시 각각 `docker compose down -v` / `docker compose -f docker-compose.dev.yml down -v`.
