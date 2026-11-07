import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

/** One fixed refusal: a stable code and its fixed message. Bodies never contain request input. */
export interface FixedError {
  readonly error: string;
  readonly message: string;
}

// A type alias (not an interface) so that it is assignable to Nest Swagger's indexed HeadersObject.
export type NoStoreHeaders = {
  'Cache-Control': { description: string; schema: { type: 'string'; enum: ['no-store'] } };
};

/** Response header documentation for `Cache-Control: no-store`. A fresh object each call. */
export function noStoreHeaders(): NoStoreHeaders {
  return { 'Cache-Control': { description: 'Always no-store', schema: { type: 'string', enum: ['no-store'] } } };
}

export interface FixedErrorResponse {
  status: number;
  description: string;
  headers: NoStoreHeaders;
  schema: {
    type: 'object';
    additionalProperties: false;
    required: ['statusCode', 'error', 'message'];
    properties: {
      statusCode: { type: 'integer'; enum: [number] };
      error: { type: 'string'; enum: string[] };
      message: { type: 'string'; enum: string[] };
    };
  };
}

/**
 * OpenAPI response for one status whose body is always `{ statusCode, error, message }` with one of the given fixed
 * codes and messages, sent with `Cache-Control: no-store`. Returns a fresh object (the Swagger decorators may extend
 * it). Throws for a status outside 400–599, no errors, a duplicate code or an empty code or message.
 */
export function fixedErrorResponse(status: number, errors: readonly FixedError[]): FixedErrorResponse {
  if (!Number.isInteger(status) || status < 400 || status > 599) {
    throw new RangeError('fixed error status must be an integer from 400 to 599');
  }
  if (errors.length === 0) {
    throw new RangeError('a fixed error response needs at least one error');
  }
  const codes: string[] = [];
  const messages: string[] = [];
  for (const { error, message } of errors) {
    if (error === '' || message === '') {
      throw new TypeError('fixed error code and message must be non-empty');
    }
    if (codes.includes(error)) {
      throw new RangeError(`duplicate fixed error code: ${error}`);
    }
    codes.push(error);
    if (!messages.includes(message)) {
      messages.push(message);
    }
  }
  return {
    status,
    description: `Fixed error: ${codes.join(', ')}`,
    headers: noStoreHeaders(),
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['statusCode', 'error', 'message'],
      properties: {
        statusCode: { type: 'integer', enum: [status] },
        error: { type: 'string', enum: codes },
        message: { type: 'string', enum: messages },
      },
    },
  };
}

/** Documents one fixed error response per status key, e.g. `{ 401: [...], 403: [...] }`. */
export function ApiFixedErrorResponses(errorsByStatus: Readonly<Record<number | string, readonly FixedError[]>>) {
  return applyDecorators(
    ...Object.entries(errorsByStatus).map(([status, errors]) => ApiResponse(fixedErrorResponse(Number(status), errors)))
  );
}
