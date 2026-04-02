import { HealthController } from './health.controller';

/**
 * HealthController 단위 테스트
 *
 * 의존성이 없어 Nest 테스트 모듈 없이 **컨트롤러 인스턴스만** 만들어 응답 형태를 검증합니다.
 * (Compose healthcheck·모니터링이 기대하는 최소 JSON 형태와 맞는지 확인)
 */
describe('HealthController', () => {
  it('check — status ok 과 ISO 타임스탬프', () => {
    const controller = new HealthController();
    const body = controller.check();

    expect(body.status).toBe('ok');
    // ISO 8601 대략 형태 (예: 2026-04-02T12:00:00.000Z)
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    // 파싱 가능한 날짜 문자열인지 (Invalid Date 방지)
    expect(() => new Date(body.timestamp).toISOString()).not.toThrow();
  });
});
