import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('check — status ok 과 ISO 타임스탬프', () => {
    const controller = new HealthController();
    const body = controller.check();

    expect(body.status).toBe('ok');
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(() => new Date(body.timestamp).toISOString()).not.toThrow();
  });
});
