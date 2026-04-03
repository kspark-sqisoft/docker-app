/**
 * E2E 가 AppModule 을 로드하기 전에 필수 env 를 채웁니다(Config Zod 검증 통과).
 */
process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ??
  'e2e_jwt_access_secret_must_be_32_chars_min!!';
