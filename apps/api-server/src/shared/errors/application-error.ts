export enum ApplicationErrorCode {
  ValidationFailed = 'VALIDATION_FAILED',
  SiteNotFound = 'SITE_NOT_FOUND',
  IdempotencyConflict = 'IDEMPOTENCY_CONFLICT',
}

export class ApplicationError extends Error {
  constructor(
    readonly code: ApplicationErrorCode,
    message: string,
    readonly statusCode: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApplicationError';
  }

  static validation(details: unknown) {
    return new ApplicationError(
      ApplicationErrorCode.ValidationFailed,
      'Request validation failed.',
      400,
      details,
    );
  }

  static notFound(message: string) {
    return new ApplicationError(
      ApplicationErrorCode.SiteNotFound,
      message,
      404,
    );
  }

  static idempotencyConflict(details: unknown) {
    return new ApplicationError(
      ApplicationErrorCode.IdempotencyConflict,
      'Idempotency key was already used with a different payload.',
      409,
      details,
    );
  }
}
