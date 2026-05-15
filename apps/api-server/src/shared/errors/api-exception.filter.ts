import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Request, Response } from 'express';
import { ApplicationError } from './application-error';

type ErrorResponseBody = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta: {
    request_id: string;
    timestamp: string;
  };
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const requestId =
      request.headers['x-request-id']?.toString() ?? randomUUID();
    const error = this.normalizeException(exception);

    if (
      !(exception instanceof ApplicationError) &&
      !(exception instanceof HttpException)
    ) {
      this.logger.error('Unhandled API exception', exception as Error);
    }

    const body: ErrorResponseBody = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
      meta: {
        request_id: requestId,
        timestamp: new Date().toISOString(),
      },
    };

    response.status(error.statusCode).json(body);
  }

  private normalizeException(exception: unknown) {
    if (exception instanceof ApplicationError) {
      return {
        code: exception.code,
        message: exception.message,
        statusCode: exception.statusCode,
        details: exception.details,
      };
    }

    if (exception instanceof HttpException) {
      return {
        code: 'HTTP_EXCEPTION',
        message: exception.message,
        statusCode: exception.getStatus(),
        details: exception.getResponse(),
      };
    }

    return {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      details: undefined,
    };
  }
}
