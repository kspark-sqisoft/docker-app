# Docker 실행 가이드

이 저장소는 **두 가지 Compose 스택**을 둡니다. 파일과 프로젝트 이름이 다르므로, 어떤 명령을 쓰는지에 따라 올라가는 컨테이너·볼륨이 달라집니다.

| 구분 | 파일 | Compose 프로젝트 이름 | 용도 |
|------|------|------------------------|------|
| 운영 스타일 | `docker-compose.yml` | 디렉터리 이름 기본값 | 멀티스테이지 빌드 이미지, nginx 정적 서빙, 핫리로드 없음 |
| 개발 스타일 | `docker-compose.dev.yml` | `study-board-dev` (`name` 지정) | 소스 볼륨 마운트, Nest/Vite watch |

## 포트 한눈에 보기

| 서비스 | 운영 Compose | 개발 Compose |
|--------|----------------|--------------|
| PostgreSQL | 호스트 `5432` | 호스트 `5432` |
| Nest API | `3000` | `3000` |
| 프론트 | nginx `8080` | Vite `5173` + 추가로 `8080`→같은 Vite |

운영과 개발을 **동시에** 띄우면 `5432`(그리고 필요 시 `3000`·`8080`)가 겹칩니다. 한쪽은 `down` 한 뒤 다른 쪽을 올리세요.

## 사전 준비

- 루트에 `.env`가 있으면 Compose가 `DB_*`, `JWT_ACCESS_SECRET` 등을 읽습니다. 없으면 compose 파일 안의 기본값이 사용됩니다.
- 예시는 PowerShell 기준입니다. macOS/Linux는 경로만 맞추면 동일한 `docker compose` 명령을 쓰면 됩니다.

---

## 1. 운영 스타일 (`docker-compose.yml`)

### 처음부터 빌드 후 전체 기동

```powershell
cd D:\Study\Docker\docker_app
docker compose up -d --build
```

### 이미지는 그대로, 컨테이너만 켜기

```powershell
docker compose up -d
```

### 특정 서비스만

```powershell
docker compose up -d db
docker compose up -d db backend
```

### 중지(볼륨 유지 — DB 데이터 보존)

```powershell
docker compose down
```

### 중지 + DB·업로드 볼륨까지 삭제(초기화)

```powershell
docker compose down -v
```

### 로그 보기

```powershell
docker compose logs -f
docker compose logs -f backend
```

---

## 2. 개발 스타일 (`docker-compose.dev.yml`)

프로젝트 이름이 `study-board-dev`이므로 컨테이너 이름은 `study-board-*-dev` 형태입니다. DB 볼륨은 `postgres_data_dev`로 운영과 분리됩니다.

### 전체 기동(포그라운드 — 로그가 터미널에 출력)

```powershell
cd D:\Study\Docker\docker_app
docker compose -f docker-compose.dev.yml up
```

### 백그라운드

```powershell
docker compose -f docker-compose.dev.yml up -d
```

### Dockerfile.dev·엔트리포인트·루트 `package.json` 등을 바꾼 뒤 재빌드

```powershell
docker compose -f docker-compose.dev.yml up -d --build
```

### DB만 (로컬에서 `npm run start:dev`만 쓸 때)

```powershell
docker compose -f docker-compose.dev.yml up -d db
```

### 중지

```powershell
docker compose -f docker-compose.dev.yml down
```

### 중지 + 개발용 볼륨 전부 삭제(DB·node_modules 캐시 포함)

```powershell
docker compose -f docker-compose.dev.yml down -v
```

### 로그

```powershell
docker compose -f docker-compose.dev.yml logs -f backend
```

---

## 3. 운영 ↔ 개발 전환 예시

같은 머신에서 포트를 나눠 쓰지 않는 한 **동시에 두 스택을 켜지 않는 것**이 안전합니다.

```powershell
# 개발 스택 끄고 운영 스택 켜기
docker compose -f docker-compose.dev.yml down
docker compose up -d

# 운영 스택 끄고 개발 스택 켜기
docker compose down
docker compose -f docker-compose.dev.yml up -d
```

---

## 4. `up`과 `--build` 정리

| 명령 | 의미 |
|------|------|
| `up -d` | 기존 이미지로 컨테이너 생성/시작. Dockerfile만 수정했을 때 **이미지는 자동으로 다시 만들지 않음**. |
| `up -d --build` | 빌드 단계를 거친 뒤 기동. Dockerfile·의존성·엔트리포인트 변경 후 필요. |

평소 코드만 수정한 경우(개발 Compose + 볼륨 마운트)에는 `--build` 없이 `up`으로 충분한 경우가 많습니다.

---

## 5. 포트가 이미 사용 중일 때 (`5432` 등)

에러 예: `Bind for 0.0.0.0:5432 failed: port is already allocated`

- 다른 Postgres(로컬 설치 또는 다른 Compose)가 `5432`를 쓰는 경우입니다.
- **대응 예:**
  - 이미 떠 있는 DB를 이 프로젝트에 맞게 쓰면, Compose의 `db` 서비스는 올리지 않아도 됩니다.
  - 개발용 DB만 다른 호스트 포트로 쓰려면 `docker-compose.dev.yml`의 `ports`를 예를 들어 `"5433:5432"`로 바꾸고, 애플리케이션의 `DB_PORT`(및 로컬 `.env`)를 `5433`에 맞춥니다.

---

## 6. 개발 스택: `node_modules` 볼륨 이슈

의존성은 `backend_node_modules`, `frontend_node_modules` 볼륨에 캐시됩니다. 패키지를 바꿨는데 컨테이너 안이 꼬이면 볼륨을 지운 뒤 다시 올립니다.

```powershell
docker compose -f docker-compose.dev.yml down
docker volume rm study-board-dev_backend_node_modules study-board-dev_frontend_node_modules
docker compose -f docker-compose.dev.yml up -d --build
```

이름은 `docker volume ls`로 실제 프로젝트 접두사를 확인하세요.

---

## 7. 컨테이너 안에서 명령 실행 예시

```powershell
# 운영 스택 백엔드 셸(이미지에 셸이 있을 때)
docker compose exec backend sh

# 개발 스택 DB에 psql
docker compose -f docker-compose.dev.yml exec db psql -U board -d board
```

---

## 8. 이미지만 빌드하고 Compose는 나중에

```powershell
docker compose build
docker compose -f docker-compose.dev.yml build backend
```

---

## 9. Windows: 스크립트 `no such file or directory`

예전에 `docker-dev-entrypoint.sh` 관련 오류가 CRLF(Windows 줄바꿈) 때문인 경우가 있었습니다. `Dockerfile.dev`에서 줄바꿈을 정리하는 처리가 있으므로, 의심되면 **이미지 재빌드**(`up --build`)를 시도하세요.

---

## 10. Swagger(OpenAPI) 접속

백엔드(Nest)가 띄워져 있으면 Swagger UI가 열립니다. **Try it out·Bearer·쿠키** 사용법은 [README.md](README.md)의 **Swagger(OpenAPI) 사용 팁** 절을 보세요.

| 스택 | UI 주소 | 비고 |
|------|---------|------|
| 운영 Compose | http://localhost:8080/docs | nginx가 `/docs`·`/docs-json`을 API 컨테이너로 넘김 |
| 운영 Compose | http://localhost:3000/docs | 백엔드 포트로 직접 접속도 동일 |
| 개발 Compose | http://localhost:3000/docs | Vite(`5173`)에는 `/docs` 프록시가 없음 → API 포트 사용 |
| DB만 Docker + 로컬 Nest | http://localhost:3000/docs | 로컬 `npm run start:dev`와 동일 |

---

## 관련 문서

- 저장소 개요·인증·빠른 시작·Swagger 팁: [README.md](README.md)
- 단계별 스터디: [docs/STUDY-GUIDE.md](docs/STUDY-GUIDE.md)
