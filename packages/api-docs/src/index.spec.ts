import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import * as api from './index';

describe('public API', () => {
  it('exports exactly the documented surface', () => {
    expect(Object.keys(api).sort()).toEqual([
      'ApiFixedErrorResponses',
      'SWAGGER_UI_ASSETS',
      'UiAssetError',
      'buildOpenApiDocument',
      'fixedErrorResponse',
      'loadUiAssets',
      'noStoreHeaders',
      'renderSwaggerUiInitializer',
      'renderSwaggerUiPage',
      'swaggerUiDistRoot',
    ]);
  });

  it('imports only Nest, Nest Swagger, swagger-ui-dist and Node built-ins (no other workspace code)', () => {
    const dir = join(__dirname, 'lib');
    const files = ['index.ts', ...readdirSync(dir).filter((f) => f.endsWith('.ts')).map((f) => join('lib', f))];
    const imports = new Set<string>();
    for (const file of files) {
      const source = readFileSync(join(__dirname, file), 'utf8');
      for (const match of source.matchAll(/(?:from|require\()\s*'([^']+)'/g)) {
        if (!match[1].startsWith('.')) imports.add(match[1]);
      }
    }
    for (const specifier of imports) {
      expect(specifier).toMatch(/^(@nestjs\/common|@nestjs\/core|@nestjs\/swagger|swagger-ui-dist\/absolute-path\.js|node:[a-z]+)$/);
    }
  });
});
