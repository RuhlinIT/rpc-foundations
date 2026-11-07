import type { INestApplication, Type } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';

export interface OpenApiDocumentOptions {
  readonly title: string;
  readonly version: string;
  readonly description?: string;
  /**
   * The modules whose own controllers are documented (imports are not scanned). Required and non-empty, so that
   * test-only or unrelated modules in the same application can never appear in the document.
   */
  readonly include: readonly Type<unknown>[];
  /** Adds security schemes and similar to the document configuration. */
  readonly configure?: (builder: DocumentBuilder) => DocumentBuilder;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    Object.freeze(value);
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
  }
  return value;
}

/**
 * Builds the OpenAPI document of an initialized Nest application with Nest Swagger's `createDocument`, limited to
 * `include`. Only the document is produced: nothing is mounted or served (this never calls `SwaggerModule.setup`).
 * The result is plain JSON data, frozen at every level. Generation errors propagate (fail closed).
 */
export function buildOpenApiDocument(app: INestApplication, options: OpenApiDocumentOptions): Readonly<OpenAPIObject> {
  if (options.include.length === 0) {
    throw new RangeError('the OpenAPI document must include at least one module');
  }
  let builder = new DocumentBuilder().setTitle(options.title).setVersion(options.version);
  if (options.description !== undefined) {
    builder = builder.setDescription(options.description);
  }
  if (options.configure !== undefined) {
    builder = options.configure(builder);
  }
  const document = SwaggerModule.createDocument(app, builder.build(), {
    include: [...options.include],
    deepScanRoutes: false,
  });
  return deepFreeze(JSON.parse(JSON.stringify(document)) as OpenAPIObject);
}
