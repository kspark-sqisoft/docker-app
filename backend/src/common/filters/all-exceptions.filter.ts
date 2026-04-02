/**
 * 처리되지 않은 예외를 한 형식의 JSON 으로 응답합니다.
 * HttpException(404 등)은 그 메시지를, 그 외(Error)는 개발에선 원인·운영에선 일반 문구로 숨깁니다.
 */
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const isProd = process.env.NODE_ENV === 'production';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const body = res as Record<string, unknown>;
        const m = body.message;
        if (Array.isArray(m)) {
          message = m as string[];
        } else if (typeof m === 'string') {
          message = m;
        } else {
          message = JSON.stringify(res);
        }
      }
    } else {
      if (exception instanceof Error) {
        this.logger.error(exception.stack ?? exception.message);
        message = isProd ? 'Internal server error' : exception.message;
      } else {
        this.logger.error(String(exception));
      }
    }

    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
