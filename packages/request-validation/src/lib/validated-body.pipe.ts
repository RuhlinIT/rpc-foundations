import { BadRequestException, PipeTransform } from '@nestjs/common';
import type { RequestValidationResult } from './strict-object';

export const INVALID_REQUEST_BODY_MESSAGE = 'Invalid request body';

/**
 * NestJS adapter for a plain validation function.
 * Valid bodies are replaced by the validator's explicit projection; invalid bodies produce
 * `400 { statusCode, message: 'Invalid request body', errors: [{ field, message }] }`.
 */
export class ValidatedBodyPipe<T> implements PipeTransform<unknown, T> {
  constructor(readonly validate: (body: unknown) => RequestValidationResult<T>) {}

  transform(value: unknown): T {
    const result = this.validate(value);
    if (result.ok) {
      return result.value;
    }
    throw new BadRequestException({
      statusCode: 400,
      message: INVALID_REQUEST_BODY_MESSAGE,
      errors: result.errors,
    });
  }
}
