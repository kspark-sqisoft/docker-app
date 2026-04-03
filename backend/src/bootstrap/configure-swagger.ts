/**
 * OpenAPI(Swagger UI). 전역 접두사 /api 는 문서 경로에 자동 반영됩니다.
 * UI: GET /docs · JSON: GET /docs-json
 */
import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const ACCESS_TOKEN_REF = 'access-token';
const REFRESH_COOKIE_SECURITY_REF = 'refresh-cookie';

export { ACCESS_TOKEN_REF, REFRESH_COOKIE_SECURITY_REF };

export function configureSwagger(app: INestApplication): void {
  const refreshCookieName =
    process.env.REFRESH_COOKIE_NAME?.trim() || 'refresh_token';

  const config = new DocumentBuilder()
    .setTitle('Notice Board API')
    .setDescription(
      '게시판 · JWT 액세스 토큰(Bearer) + httpOnly 리프레시 쿠키 기반 인증 REST API.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: '로그인/가입 응답의 accessToken 을 `Bearer <token>` 형식으로 전달합니다.',
        in: 'header',
      },
      ACCESS_TOKEN_REF,
    )
    .addCookieAuth(
      refreshCookieName,
      {
        type: 'apiKey',
        description: `리프레시 토큰(httpOnly). \`POST /api/auth/refresh\` 호출 시 브라우저가 자동으로 전송합니다.`,
      },
      REFRESH_COOKIE_SECURITY_REF,
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
