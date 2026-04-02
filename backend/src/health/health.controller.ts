/**
 * 로드밸런서·Docker healthcheck 용 “살아 있음” 응답. DB 조회는 하지 않음.
 */
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
