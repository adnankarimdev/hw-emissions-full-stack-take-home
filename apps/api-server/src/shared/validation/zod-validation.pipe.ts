import { PipeTransform } from '@nestjs/common';
import { ZodSchema } from 'zod';
import { ApplicationError } from '../errors/application-error';

export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      throw ApplicationError.validation(result.error.flatten());
    }

    return result.data;
  }
}
