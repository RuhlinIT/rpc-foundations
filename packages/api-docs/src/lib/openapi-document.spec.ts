import { Controller, Get, Module, Post, type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ApiExcludeController, ApiOperation, SwaggerModule } from '@nestjs/swagger';
import { buildOpenApiDocument } from './openapi-document';

@Controller('included')
class IncludedController {
  @Get()
  @ApiOperation({ summary: 'Included read' })
  read(): object {
    return {};
  }

  @Post('write')
  write(): object {
    return {};
  }
}

@ApiExcludeController()
@Controller('excluded-by-decorator')
class HiddenController {
  @Get()
  hidden(): object {
    return {};
  }
}

@Controller('other-module')
class OtherController {
  @Get()
  other(): object {
    return {};
  }
}

@Module({ controllers: [IncludedController, HiddenController] })
class IncludedModule {}

@Module({ controllers: [OtherController] })
class OtherModule {}

@Module({ imports: [IncludedModule, OtherModule] })
class RootModule {}

let app: INestApplication;
beforeAll(async () => {
  app = await NestFactory.create(RootModule, { logger: false, abortOnError: false });
  await app.init();
});
afterAll(async () => {
  await app.close();
});
afterEach(() => {
  jest.restoreAllMocks();
});

const OPTIONS = { title: 'Test API', version: '1.2.3', include: [IncludedModule] };

describe('buildOpenApiDocument', () => {
  it('documents only the controllers of the included modules (and never excluded controllers)', () => {
    const document = buildOpenApiDocument(app, OPTIONS);
    expect(Object.keys(document.paths).sort()).toEqual(['/included', '/included/write']);
    expect(Object.keys(document.paths['/included'])).toEqual(['get']);
    expect(document.paths['/included'].get?.summary).toBe('Included read');
  });

  it('sets title, version and description, and applies the configure callback', () => {
    const document = buildOpenApiDocument(app, {
      ...OPTIONS,
      description: 'About this API',
      configure: (builder) => builder.addSecurity('cookie', { type: 'apiKey', in: 'cookie', name: 'session' }),
    });
    expect(document.info).toEqual({ title: 'Test API', version: '1.2.3', description: 'About this API', contact: {} });
    expect(document.components?.securitySchemes).toEqual({ cookie: { type: 'apiKey', in: 'cookie', name: 'session' } });
  });

  it('leaves the description empty when none is given', () => {
    expect(buildOpenApiDocument(app, OPTIONS).info.description).toBe('');
  });

  it('returns plain JSON data, frozen at every level', () => {
    const document = buildOpenApiDocument(app, OPTIONS);
    expect(JSON.parse(JSON.stringify(document))).toEqual(document);
    expect(Object.isFrozen(document)).toBe(true);
    expect(Object.isFrozen(document.paths)).toBe(true);
    expect(Object.isFrozen(document.paths['/included'])).toBe(true);
    expect(Object.isFrozen(document.paths['/included'].get?.responses)).toBe(true);
    expect(() => {
      (document.info as { title: string }).title = 'changed';
    }).toThrow(TypeError);
  });

  it('passes the include list and no deep scan to Nest Swagger', () => {
    const spy = jest.spyOn(SwaggerModule, 'createDocument');
    buildOpenApiDocument(app, OPTIONS);
    expect(spy).toHaveBeenCalledWith(app, expect.any(Object), { include: [IncludedModule], deepScanRoutes: false });
  });

  it('refuses an empty include list before scanning anything', () => {
    const spy = jest.spyOn(SwaggerModule, 'createDocument');
    expect(() => buildOpenApiDocument(app, { ...OPTIONS, include: [] })).toThrow(
      'the OpenAPI document must include at least one module'
    );
    expect(spy).not.toHaveBeenCalled();
  });

  it('propagates a generation failure', () => {
    jest.spyOn(SwaggerModule, 'createDocument').mockImplementation(() => {
      throw new Error('generation failed');
    });
    expect(() => buildOpenApiDocument(app, OPTIONS)).toThrow('generation failed');
  });
});
