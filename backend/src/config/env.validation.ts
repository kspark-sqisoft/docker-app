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
