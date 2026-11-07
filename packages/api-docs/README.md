# @rpc-foundations/api-docs

## Purpose

Small, reusable support for serving protected, read-only API documentation from a NestJS app **without**
`SwaggerModule.setup` or static-file middleware. The library builds things; the consuming app decides who may see
them and serves them through its own guarded controller.

## Install

```bash
pnpm add @rpc-foundations/api-docs @nestjs/common @nestjs/core @nestjs/swagger swagger-ui-dist
```

- Dependencies: `@nestjs/common`, `@nestjs/core`, `@nestjs/swagger` 11.4.2 (`createDocument` and decorators only),
  `swagger-ui-dist` 5.32.4 (only `absolute-path.js`, so the browser bundle is never evaluated in Node), Node built-ins.

## Public API

| Export | Behavior |
|---|---|
| `buildOpenApiDocument(app, options)` | Runs Nest Swagger's `createDocument` on an initialized app, limited to `options.include` (required, non-empty; imports are not scanned), so test-only or unrelated modules never appear. Returns plain JSON data frozen at every level. Generation errors propagate. |
| `fixedErrorResponse(status, errors)`, `ApiFixedErrorResponses(map)`, `noStoreHeaders()` | OpenAPI responses for fixed refusals `{ statusCode, error, message }`: one schema per status enumerating the allowed codes and messages, with `Cache-Control: no-store`. Invalid status (outside 400–599), no errors, duplicate or empty codes are refused. Fresh objects each call. |
| `loadUiAssets(root, allowlist)`, `UiAssetError` | Reads exactly the allowlisted files into memory at startup and returns a lookup with no mutators. Fails closed on a relative or missing root, an empty or duplicate allowlist, a name that is not a plain file name, a content type that is not one lowercase media type (optionally `; charset=utf-8`), or a file that is missing, not regular, resolves outside the root, is empty or is not valid UTF-8. |
| `SWAGGER_UI_ASSETS`, `swaggerUiDistRoot()` | The allowlist (`swagger-ui.css`, `swagger-ui-bundle.js`) and the installed `swagger-ui-dist` directory. |
| `renderSwaggerUiPage(options)` | The host page: stylesheet links and external scripts only (no inline script, style element, style attribute or handler), escaped title, same-origin paths only. Works under `script-src 'self'; style-src 'self'`. |
| `renderSwaggerUiInitializer({ specUrl })` | The startup script: fetches the spec from `specUrl` (never embedded), read-only (`supportedSubmitMethods: []`, "Try it out" off), `queryConfigEnabled: false` (the query string cannot load another document), `validatorUrl: null`. |

## Not provided

No routes, middleware, guards, static serving, YAML, or "Try it out". The consuming app applies its own access
policy, headers (Content-Type, `no-store`, `nosniff`, CSP) and routing.

## Tests

```bash
pnpm --filter @rpc-foundations/api-docs test
```

Coverage thresholds: 100% statements, lines, functions and branches over all production files.

## License

Apache-2.0
