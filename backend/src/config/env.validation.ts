/**
 * ConfigModule.forRoot({ validate }) 에 넘기는 함수.
 * process.env 를 Zod 로 파싱해 잘못된 값이면 앱이 바로 죽고, 타입이 맞는 객체를 반환합니다.
 */
import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(3000),
  DB_HOST: z.string().min(1).default('localhost'),
  DB_PORT: z.coerce.number().int().positive().max(65535).default(5432),
  DB_USERNAME: z.string().min(1).default('board'),
  DB_PASSWORD: z.string().min(1).default('board'),
  DB_NAME: z.string().min(1).default('board'),
  CORS_ORIGIN: z.string().optional(),
  /** Access JWT 서명용. 운영에서는 반드시 강한 무작위 문자열로 교체 */
  JWT_ACCESS_SECRET: z.string().min(32),
  /** 예: 15m, 1h */
  JWT_ACCESS_EXPIRES_IN: z.string().min(1).default('15m'),
  /** 리프레시 쿠키 maxAge(일) */
  JWT_REFRESH_EXPIRES_DAYS: z.coerce
    .number()
    .int()
    .positive()
    .max(365)
    .default(7),
  REFRESH_COOKIE_NAME: z.string().min(1).default('refresh_token'),
  /** 업로드 루트(기본: process.cwd()/uploads). Docker 에서 볼륨 마운트 시 지정 */
  UPLOADS_DIR: z.string().min(1).optional(),
  /** httpOnly 리프레시 쿠키 Secure 플래그. HTTPS 뒤에서만 true 권장(로컬 HTTP 스택은 false). */
  REFRESH_COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const flat = result.error.flatten().fieldErrors;
    throw new Error(`환경 변수 검증 실패: ${JSON.stringify(flat)}`);
  }
  return result.data;
}
