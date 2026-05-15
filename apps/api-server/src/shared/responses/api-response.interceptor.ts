import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Request } from 'express';
import { Observable, map } from 'rxjs';

type ApiSuccessResponse<T> = {
  success: true;
  data: T;
  meta: {
    request_id: string;
    timestamp: string;
  };
};

@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiSuccessResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccessResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const requestId =
      request.headers['x-request-id']?.toString() ?? randomUUID();

    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        meta: {
          request_id: requestId,
          timestamp: new Date().toISOString(),
        },
      })),
    );
  }
}
