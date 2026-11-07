import { Controller, Get, Module, type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ApiFixedErrorResponses, fixedErrorResponse, noStoreHeaders } from './fixed-error-schema';
import { buildOpenApiDocument } from './openapi-document';

const UNAUTHORIZED = { error: 'authentication-required', message: 'Authentication required' };
const FORBIDDEN_A = { error: 'permission-denied', message: 'Permission denied' };
const FORBIDDEN_B = { error: 'csrf-token-invalid', message: 'CSRF token missing or invalid' };

describe('noStoreHeaders', () => {
  it('documents Cache-Control: no-store and returns a fresh object each time', () => {
    expect(noStoreHeaders()).toEqual({
      'Cache-Control': { description: 'Always no-store', schema: { type: 'string', enum: ['no-store'] } },
    });
    expect(noStoreHeaders()).not.toBe(noStoreHeaders());
  });
});

describe('fixedErrorResponse', () => {
  it('describes exactly one fixed body shape per status, enumerating the codes and messages', () => {
    expect(fixedErrorResponse(403, [FORBIDDEN_A, FORBIDDEN_B])).toEqual({
      status: 403,
      description: 'Fixed error: permission-denied, csrf-token-invalid',
      headers: noStoreHeaders(),
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['statusCode', 'error', 'message'],
        properties: {
          statusCode: { type: 'integer', enum: [403] },
          error: { type: 'string', enum: ['permission-denied', 'csrf-token-invalid'] },
          message: { type: 'string', enum: ['Permission denied', 'CSRF token missing or invalid'] },
        },
      },
    });
  });

  it('lists a shared message once', () => {
    const response = fixedErrorResponse(400, [
      { error: 'a', message: 'Same' },
      { error: 'b', message: 'Same' },
    ]);
    expect(response.schema.properties.message.enum).toEqual(['Same']);
  });

  it('returns a fresh, unfrozen object (the Swagger decorators may extend it)', () => {
    const first = fixedErrorResponse(401, [UNAUTHORIZED]);
    expect(first).not.toBe(fixedErrorResponse(401, [UNAUTHORIZED]));
    expect(Object.isFrozen(first)).toBe(false);
  });

  it.each([
    ['a status below 400', () => fixedErrorResponse(399, [UNAUTHORIZED]), 'fixed error status must be an integer from 400 to 599'],
    ['a status above 599', () => fixedErrorResponse(600, [UNAUTHORIZED]), 'fixed error status must be an integer from 400 to 599'],
    ['a fractional status', () => fixedErrorResponse(401.5, [UNAUTHORIZED]), 'fixed error status must be an integer from 400 to 599'],
    ['no errors', () => fixedErrorResponse(401, []), 'a fixed error response needs at least one error'],
    ['a duplicate code', () => fixedErrorResponse(401, [UNAUTHORIZED, UNAUTHORIZED]), 'duplicate fixed error code: authentication-required'],
    ['an empty code', () => fixedErrorResponse(401, [{ error: '', message: 'm' }]), 'fixed error code and message must be non-empty'],
    ['an empty message', () => fixedErrorResponse(401, [{ error: 'e', message: '' }]), 'fixed error code and message must be non-empty'],
  ])('refuses %s', (_label, run, message) => {
    expect(run).toThrow(message);
  });
});

describe('ApiFixedErrorResponses', () => {
  @Controller('probe')
  class ProbeController {
    @Get()
    @ApiFixedErrorResponses({ 401: [UNAUTHORIZED], 403: [FORBIDDEN_A, FORBIDDEN_B] })
    probe(): object {
      return {};
    }
  }

  @Module({ controllers: [ProbeController] })
  class ProbeModule {}

  let app: INestApplication;
  beforeAll(async () => {
    app = await NestFactory.create(ProbeModule, { logger: false, abortOnError: false });
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });

  it('adds one documented response per status to the operation', () => {
    const responses = buildOpenApiDocument(app, { title: 't', version: '1', include: [ProbeModule] }).paths['/probe'].get
      ?.responses as Record<string, { description: string; content: Record<string, { schema: unknown }> }>;
    expect(Object.keys(responses).sort()).toEqual(['401', '403']);
    expect(responses['401'].description).toBe('Fixed error: authentication-required');
    expect(responses['403'].content['application/json'].schema).toEqual(fixedErrorResponse(403, [FORBIDDEN_A, FORBIDDEN_B]).schema);
  });

  it('refuses a status key that is not an integer', () => {
    expect(() => ApiFixedErrorResponses({ abc: [UNAUTHORIZED] })).toThrow('fixed error status must be an integer from 400 to 599');
  });
});
