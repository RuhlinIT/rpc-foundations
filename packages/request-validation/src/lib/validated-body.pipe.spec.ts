import { BadRequestException } from '@nestjs/common';
import { optional, required, stringValue, validateStrictObject } from './strict-object';
import { INVALID_REQUEST_BODY_MESSAGE, ValidatedBodyPipe } from './validated-body.pipe';

const validate = (body: unknown) =>
  validateStrictObject<{ title: string; note?: string }>(body, {
    title: required(stringValue),
    note: optional(stringValue),
  });

describe('ValidatedBodyPipe', () => {
  const pipe = new ValidatedBodyPipe(validate);

  it('returns the validated projection for a valid body', () => {
    expect(pipe.transform({ title: 'T' })).toEqual({ title: 'T' });
  });

  it('throws a 400 with the documented response body for an invalid body', () => {
    let caught: unknown;
    try {
      pipe.transform({ title: 1, submissionId: 'body-id', note: 'synthetic note body' });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(BadRequestException);
    const exception = caught as BadRequestException;
    expect(exception.getStatus()).toBe(400);
    expect(exception.getResponse()).toEqual({
      statusCode: 400,
      message: INVALID_REQUEST_BODY_MESSAGE,
      errors: [
        { field: '(body)', message: 'contains 1 field that is not allowed' },
        { field: 'title', message: 'must be a string' },
      ],
    });
    expect(JSON.stringify(exception.getResponse())).not.toContain('synthetic note body');
    expect(JSON.stringify(exception.getResponse())).not.toContain('body-id');
  });

  it('exposes the validator for wiring checks', () => {
    expect(pipe.validate).toBe(validate);
  });
});
