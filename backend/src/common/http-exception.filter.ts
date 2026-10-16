import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { STATUS_CODES, ServerResponse } from 'node:http';
import type { ApiError } from '@home-furniture/contracts';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<ServerResponse>();
    const statusCode = exception instanceof HttpException ? exception.getStatus() : 500;
    const error = STATUS_CODES[statusCode] ?? 'Error';
    let message: string | string[] = error;
    if (statusCode === 500 || !(exception instanceof HttpException)) {
      message = 'Internal server error';
      this.logger.error(exception instanceof Error ? exception.name : 'Unknown request error');
    } else {
      const body = exception.getResponse();
      if (typeof body === 'string') message = body;
      else if ('message' in body) {
        const value: unknown = body.message;
        if (typeof value === 'string' || (Array.isArray(value) && value.every(item => typeof item === 'string'))) {
          message = value;
        }
      }
    }
    const payload: ApiError = { statusCode, message, error };
    response.statusCode = statusCode;
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.end(JSON.stringify(payload));
  }
}
