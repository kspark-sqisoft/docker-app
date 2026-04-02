# Docker 스터디 가이드 — 간단 게시판 (NestJS + Postgres + React/Vite)

이 문서는 **로그인 없는 게시판**을 만들면서, 프로젝트 구조·Docker 이미지·컨테이너·Compose·데이터 영속화를 **순서대로** 이해하기 위한 공부용 안내입니다.  
코드나 설정이 바뀌면 이 파일도 함께 맞춰 두는 것이 좋습니다.

---

## 1. 우리가 만들 것 (개요)

| 구분 | 기술 | 역할 |
|------|------|------|
| **백엔드** | NestJS | REST API (`/api/posts` 목록·작성·삭제), Postgres 연동 |
| **DB** | PostgreSQL 16 | 글 데이터 저장 |
| **프론트** | React + Vite | 브라우저 UI |
| **실행** | Docker Compose | DB·API·웹을 한 번에 띄움 |

**폴더 구조 (루트 기준)**

```text
docker_app/
├── backend/                # NestJS (Dockerfile / Dockerfile.dev)
├── frontend/               # Vite React (Dockerfile / Dockerfile.dev, nginx.conf)
├── docker-compose.yml      # 운영: 빌드 이미지
├── docker-compose.dev.yml  # 개발: 볼륨 마운트 + 핫 리로드
├── .env.example       # 환경 변수 예시 (복사해서 .env 로 사용)
└── docs/
    └── STUDY-GUIDE.md # 이 문서
```

---

## 2. 사전 준비

1. **Docker Desktop** (또는 Docker Engine + Compose 플러그인) 설치  
2. **Node.js** (로컬에서만 백/프론트를 돌릴 때) — LTS 권장  

터미널에서 확인:

```powershell
docker version
docker compose version
```

---

## 3. 핵심 개념 — 이미지 vs 컨테이너

- **이미지(Image)**  
  앱을 실행하는 데 필요한 파일·설정·런타임이 **읽기 전용**으로 묶인 **설계도/템플릿**입니다.  
  `Dockerfile`을 빌드하면 이미지가 생깁니다.

- **컨테이너(Container)**  
  이미지를 **한 번 실행한 인스턴스**입니다. CPU·메모리·네트워크·(선택) 저장소가 붙습니다.  
  같은 이미지로 컨테이너를 여러 개 띄울 수 있습니다.

**비유:** 이미지 = 클래스, 컨테이너 = 그 클래스로 만든 객체.

---

## 4. 이 프로젝트의 Dockerfile 읽는 법

### 4-1. `backend/Dockerfile` (멀티 스테이지)

1. **builder** 스테이지: `npm ci` → 소스 복사 → `npm run build` → `dist/` 생성  
2. **runner** 스테이지: 프로덕션 의존성만 설치 → `dist`만 복사 → `node dist/main.js` 실행  

**왜 두 단계?**  
이미지 안에 `typescript`, 테스트 도구 등 **실행에 불필요한 devDependencies**를 넣지 않아 용량과 공격 면을 줄입니다.

### 4-2. `frontend/Dockerfile`

1. **builder**: 의존성 설치 → `npm run build` → 정적 파일 `dist/`  
2. **nginx:alpine**: 빌드 결과를 nginx 웹 루트에 복사, `nginx.conf`로 `/api` 를 백엔드로 **리버스 프록시**

프론트는 **Tailwind CSS v4**(`@tailwindcss/vite`)와 **shadcn/ui**(Nova 프리셋, Geist 폰트, `src/components/ui/*`)를 씁니다.  
빌드 단계에서는 Windows 등에서 만든 `package-lock.json` 과 Linux 의 `npm ci` 가 어긋날 수 있어, 이 프로젝트 **프론트 Dockerfile** 은 `npm ci` 대신 **`npm install`** 로 맞춰 두었습니다. (CI/팀에서 lock 을 Linux 기준으로 고정하면 다시 `npm ci` 로 바꿀 수 있습니다.)

브라우저는 **항상 `http://localhost:8080`** 만 보면 되고, API 호출은 같은 출처의 `/api/...` 로 가므로 CORS 부담이 줄어듭니다.  
(로컬 `npm run dev` 는 `vite.config.ts` 의 `proxy` 로 `localhost:3000` 에 넘깁니다.)

### 4-3. `.dockerignore`

`node_modules`, `dist` 등을 빌드 컨텍스트에서 빼 **빌드 속도**와 **이미지 깔끔함**을 돕습니다.

---

## 5. `docker-compose.yml` — 서비스와 볼륨

### 5-1. 서비스 세 개

| 서비스 이름 | 설명 |
|-------------|------|
| `db` | PostgreSQL. 데이터 디렉터리를 **볼륨**에 마운트해 컨테이너를 지워도 데이터 유지 |
| `backend` | Nest API, `db` 가 healthy 할 때까지 대기 후 기동. `/api/health` 로 **healthcheck** |
| `frontend` | nginx + 빌드된 React, `backend` 가 **healthy** 된 뒤 기동 |

### 5-2. 볼륨 `postgres_data`

```yaml
volumes:
  postgres_data:
```

Docker 가 관리하는 이름 붙은 볼륨입니다. Postgres 컨테이너의 `/var/lib/postgresql/data` 에 연결되어 **DB 파일이 호스트 쪽에 안전하게 보관**됩니다.  
실제 이름은 `{프로젝트폴더명}_postgres_data` 형태로 붙는 경우가 많습니다(예: `docker_app_postgres_data`). `docker volume ls` 로 확인할 수 있습니다.

### 5-3. 환경 변수

루트에 `.env` 를 두면 Compose 가 읽습니다.

```powershell
copy .env.example .env
```

기본값은 사용자/DB 이름 `board`, 비밀번호 `board` 입니다. **실서비스에서는 반드시 강한 비밀번호로 변경**하세요.

---

## 6. 실행 절차 (Docker로 전체 띄우기)

**위치:** 프로젝트 루트 (`docker_app`)

### 6-0. `up`과 `up --build`, 평소에 쓰는 명령

- **`docker compose up` / `up -d`**  
  로컬에 **이미 있는 이미지**로 컨테이너를 만들고 시작합니다. `Dockerfile`이나 `COPY` 대상을 바꿔도, Compose는 **자동으로 이미지를 다시 빌드하지 않습니다** (같은 프로젝트 이름·태그의 예전 이미지를 그대로 씁니다).

- **`docker compose up --build` / `up -d --build`**  
  기동 전에 `build:` 가 있는 서비스 이미지를 **다시 빌드**합니다. **처음 클론한 뒤**, **이미지를 지운 뒤**, 또는 **Dockerfile·엔트리포인트·`package.json`/`package-lock.json` 등 빌드 컨텍스트를 바꾼 뒤**에 필요합니다.

**이미 한 번 빌드해 두었고 Dockerfile을 안 건드렸다면** 일상적으로는 아래만으로 충분합니다.

| 스택 | 켜기 | 끄기 |
|------|------|------|
| **운영** (`docker-compose.yml`) | `docker compose up -d` | `docker compose down` |
| **개발** (`docker-compose.dev.yml`) | `docker compose -f docker-compose.dev.yml up` | `docker compose -f docker-compose.dev.yml down` |

개발 쪽도 `Dockerfile.dev` / `docker-dev-entrypoint.sh` 를 수정했다면 **`up --build`**(또는 `build` 후 `up`)를 한 번 넣어야 변경이 반영됩니다.

**운영 ↔ 개발 전환:** `3000`, `5432`, `8080` 포트가 겹치므로, 다른 스택을 켜기 **전에** 반대쪽을 `down` 합니다.

```powershell
# 운영 끄고 개발 켜기
docker compose down
docker compose -f docker-compose.dev.yml up

# 개발 끄고 운영 켜기
docker compose -f docker-compose.dev.yml down
docker compose up -d
```

### 6-1. 운영 스택 (`docker-compose.yml`) — 기동·중지

최초(또는 이미지·Dockerfile 갱신 직후):

```powershell
copy .env.example .env
docker compose up -d --build
```

이미지가 이미 있고 설정만 유지할 때:

```powershell
docker compose up -d
```

- **웹 UI:** http://localhost:8080  
- **API 직접 호출 (호스트에서):** http://localhost:3000/api/posts  

로그 확인:

```powershell
docker compose logs -f backend
docker compose logs -f db
```

중지·삭제 (컨테이너만 제거, **볼륨은 유지**):

```powershell
docker compose down
```

DB 데이터까지 지우고 싶을 때 (**복구 불가**):

```powershell
docker compose down -v
```

(`docker compose build` 를 단독으로 쓴 뒤 `up -d` 를 나눠 실행해도 되고, `up -d --build` 한 번에 해도 됩니다.)

### 6-2. 개발용 Compose — `docker-compose.dev.yml` (핫 리로드)

| 파일 | 역할 |
|------|------|
| `docker-compose.yml` | **운영용:** 빌드된 이미지 + nginx(8080), 핫 리로드 없음 |
| `docker-compose.dev.yml` | **개발용:** 소스 볼륨 + `nest start --watch` + Vite dev (**5173**, 편의상 **8080** 도 동일 서버로 매핑) |

**개발용으로 추가된 이미지 정의**

- `backend/Dockerfile.dev` — `docker-dev-entrypoint.sh` 로 기동, 이미지 빌드 시 `npm ci`  
- `frontend/Dockerfile.dev` — 동일 entrypoint 패턴, 이미지 빌드 시 `npm install`  
- Compose 상단 `name: study-board-dev` → 운영과 **프로젝트·볼륨 분리** (`postgres_data_dev`, `backend_node_modules`, `frontend_node_modules`)

**동작 요약**

- `frontend/vite.config.ts`: `VITE_API_PROXY_TARGET=http://backend:3000`, `DOCKER_DEV=true` 일 때 `watch.usePolling`.  
- 백엔드: `CHOKIDAR_USEPOLLING=true`, `./backend` 마운트 + `node_modules` 볼륨.  
- 프론트: `./frontend` 마운트 + `node_modules` 볼륨.  
- **기동 속도:** 매번 `npm install` 하지 않고, `package.json` + `package-lock.json` 내용의 **해시가 바뀌었을 때**(또는 `nest` / `vite` 실행 파일이 없을 때)만 `npm install` 합니다 (`docker-dev-entrypoint.sh` + `node_modules/.npm-sync-stamp`).

운영 파일(`docker-compose.yml`)은 **빌드된 이미지**로 띄우기 때문에 코드를 고칠 때마다 이미지를 다시 빌드해야 합니다.  
개발용은 소스 **볼륨 마운트** + `nest start --watch` / `vite dev` 로 저장 시 반영됩니다.

```powershell
docker compose -f docker-compose.dev.yml up
```

`Dockerfile.dev` 나 `docker-dev-entrypoint.sh` 를 수정한 뒤에만 한 번 **`--build`** 를 붙이면 됩니다.

- **프론트 (Vite):** http://localhost:5173 또는 http://localhost:8080 (운영 Compose 를 내린 뒤 8080 사용; 동시에 띄우면 8080 충돌)  
- **API:** http://localhost:3000/api/posts  

**주의:** `3000`, `5432` 포트는 운영 스택과 **동시에 쓸 수 없습니다.** 개발 전에 운영을 내리세요.

```powershell
docker compose down
docker compose -f docker-compose.dev.yml up
```

개발 스택만 중지:

```powershell
docker compose -f docker-compose.dev.yml down
```

개발 DB까지 초기화:

```powershell
docker compose -f docker-compose.dev.yml down -v
```

`backend` / `frontend` 각각 `node_modules` 는 **이름 붙은 볼륨**에 둡니다. lock 파일이 바뀌면 entrypoint 가 자동으로 `npm install` 합니다. 그래도 모듈 오류가 나면 `docker compose -f docker-compose.dev.yml down` 후 `docker volume ls` 에서 `*_node_modules` 볼륨을 지우고 다시 `up` 하세요.

Windows + Docker Desktop 에서 파일 감시가 불안하면 프론트는 `vite.config.ts` 의 `watch.usePolling`, 백엔드는 `CHOKIDAR_USEPOLLING` 이 켜져 있습니다.

**Windows:** 백엔드/프론트 컨테이너가 바로 죽으며 `exec ... docker-dev-entrypoint.sh: no such file or directory` 가 보이면, 셸 스크립트가 **CRLF** 로 저장된 탓인 경우가 많습니다. 이 프로젝트의 `Dockerfile.dev` 는 빌드 시 `tr -d '\r'` 로 줄바꿈을 정리하므로 **`up --build`** 로 이미지를 다시 빌드해 보세요. 저장소에는 `.gitattributes` 로 `*.sh` 를 LF 로 맞추는 설정이 있습니다.

---

## 7. 실행 확인·검증·테스트 (체크리스트)

스택을 띄운 뒤 **한 번씩 따라 해 보면** Docker·API·프록시가 기대대로 동작하는지 확인하기 좋습니다.

### 7-1. 기본 실행

프로젝트 루트에서. **처음이거나 Dockerfile을 바꾼 뒤**에는 `--build` 를 붙입니다. 이미 빌드해 둔 이미지로 매일 돌릴 때는 **6-0절** 표대로 `docker compose up -d` 만으로도 됩니다.

```powershell
docker compose up -d --build
```

### 7-2. 컨테이너 상태 확인

```powershell
docker compose ps
```

`db`, `backend`, `frontend` 가 모두 **실행 중(Up)** 이고, `db` 가 **healthy** 로 보이면 다음 단계로 넘어가면 됩니다.

### 7-3. API 직접 호출 (백엔드 포트)

호스트에서 Nest 가 직접 받는 주소입니다.

```powershell
# 목록 (빈 배열이거나 글 배열)
Invoke-RestMethod -Uri http://localhost:3000/api/posts -Method Get

# 글 하나 작성 (JSON)
Invoke-RestMethod -Uri http://localhost:3000/api/posts -Method Post -ContentType 'application/json' -Body '{"title":"테스트","content":"본문"}'
```

`200` 대 응답과 JSON 이 오면 DB 연결과 API 가 정상입니다.

### 7-4. nginx 프록시 확인 (웹 포트 8080)

프론트 컨테이너의 nginx 가 `/api` 를 백엔드로 넘깁니다. **브라우저는 8080만 쓰는 구성**과 동일합니다.

```powershell
Invoke-RestMethod -Uri http://localhost:8080/api/posts -Method Get
```

여기서 나오는 데이터가 **7-3 과 동일한 목록**이면 프록시가 정상입니다.

### 7-5. 브라우저에서 UI 확인

1. http://localhost:8080 접속  
2. 제목·내용 입력 후 **등록**  
3. 목록에 표시되는지, **삭제** 후 사라지는지 확인  

UI까지 되면 전체 파이프라인(프론트 → nginx → API → Postgres) 검증이 끝난 것입니다.

### 7-6. 중지와 데이터 보존 여부

| 명령 | 의미 |
|------|------|
| `docker compose down` | 컨테이너·네트워크 정리. **볼륨(`postgres_data`)은 유지** → DB 데이터 보존 |
| `docker compose down -v` | 위에 더해 **볼륨까지 삭제** → DB 초기화 (**복구 불가**, 연습용으로만 사용) |

다시 `up` 하면 코드·이미지는 그대로 두고 컨테이너만 새로 뜹니다. 데이터를 유지한 채 재시작하려면 `-v` 없이 `down` 만 쓰면 됩니다.

### 7-7. Nest E2E 테스트 (`npm run test:e2e`)

`backend/test/app.e2e-spec.ts` 는 실제 **Postgres 에 붙는** 설정을 씁니다. 따라서 DB 가 떠 있어야 합니다.

**절차 예시**

1. 루트에서 DB 만 띄우거나, 이미 전체 스택이 떠 있으면 그대로 둡니다.  
   ```powershell
   docker compose up -d db
   ```
2. 루트 `.env` 의 `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` 이 컨테이너와 같아야 합니다(기본 `board` / `board` / `board`).  
3. 백엔드 폴더에서 호스트가 DB 에 붙도록 환경 변수를 맞춘 뒤 테스트를 실행합니다.  
   ```powershell
   cd backend
   $env:DB_HOST="localhost"
   $env:DB_PORT="5432"
   $env:DB_USERNAME="board"
   $env:DB_PASSWORD="board"
   $env:DB_NAME="board"
   npm run test:e2e
   ```

전체를 Docker 로만 돌리고 호스트에서 테스트만 할 때는 위처럼 **`DB_HOST=localhost`** 가 맞습니다. (Compose 안의 `backend` 서비스는 `DB_HOST=db` 를 씁니다.)

### 7-8. 스키마 자동 반영 (`synchronize`) — 공부용 참고

`src/app.module.ts` 의 TypeORM 설정에 **`synchronize: true`** 가 들어 있습니다. 엔티티를 바꾸면 개발 중에 테이블이 자동으로 맞춰져서 편하지만, **운영 환경에서는 데이터 손실·의도치 않은 변경 위험**이 있어 보통 **마이그레이션**으로 전환합니다. 모듈·파일 위치는 [10. 백엔드 구조 메모](#10-백엔드-구조-메모-posts-모듈)와 함께 보면 됩니다.

---

## 8. 로컬 개발 (Docker 없이) — 선택

DB만 Docker로 띄우고 코드는 로컬에서 편집하는 방식입니다.

**1) DB만 실행**

```powershell
docker compose up -d db
```

**2) 백엔드** — 루트에 `.env` 또는 터미널에서 동일 값 설정:

```powershell
cd backend
$env:DB_HOST="localhost"; $env:DB_PORT="5432"; $env:DB_USERNAME="board"; $env:DB_PASSWORD="board"; $env:DB_NAME="board"
npm run start:dev
```

**3) 프론트**

```powershell
cd frontend
npm run dev
```

브라우저: Vite 안내 URL (보통 http://localhost:5173). API는 프록시로 백엔드에 전달됩니다.

---

## 9. API 요약 (공부용)

글로벌 prefix: **`api`**

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/posts` | 목록 (최신순) |
| POST | `/api/posts` | 작성 (JSON: `title`, `content`) |
| DELETE | `/api/posts/:id` | 삭제 |

예시 (PowerShell 에서 curl 대신 Invoke-RestMethod 등 사용 가능):

```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/posts -Method Get
```

---

## 10. 백엔드 구조 메모 (Posts 모듈)

- `src/posts/entities/post.entity.ts` — TypeORM 엔티티 (`posts` 테이블)  
- `src/posts/dto/create-post.dto.ts` — 작성 시 검증  
- `src/posts/posts.service.ts` — DB 접근  
- `src/posts/posts.controller.ts` — HTTP 라우트  
- `src/posts/posts.module.ts` — 모듈 묶음  
- `src/app.module.ts` — `ConfigModule`, `TypeOrmModule`, `PostsModule` 등록  

**공부용 주의:** `synchronize: true` 는 개발 편의를 위해 엔티티 변경 시 스키마를 자동 맞춥니다. **운영 환경에서는 마이그레이션 도구 사용을 권장**합니다. (실행·검증 절차는 [7-8. 스키마 자동 반영](#7-8-스키마-자동-반영-synchronize--공부용-참고) 참고.)

---

## 11. 자주 쓰는 Docker 명령 (복습)

```powershell
docker images                    # 로컬 이미지 목록
docker ps                        # 실행 중인 컨테이너
docker ps -a                     # 중지 포함 전체
docker compose ps                # 이 프로젝트 스택 상태
docker volume ls                 # 볼륨 목록 (postgres_data 확인)
```

---

## 12. 다음에 해볼 만한 것

- 백엔드/프론트에 **헬스체크** 엔드포인트와 Compose `healthcheck` 연동  
- `synchronize: false` + TypeORM 마이그레이션  
- 로그인·작성자 필드 추가 (이번 범위 밖이지만 자연스러운 확장)

---

문서 버전: 프로젝트 초기 세팅 기준. 디렉터리 이름·포트·경로가 바뀌면 이 문서의 해당 절을 같이 고쳐 주세요.
