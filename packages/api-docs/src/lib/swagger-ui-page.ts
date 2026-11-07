/** Same-origin absolute path: no scheme, host, query, fragment, quotes, spaces or markup. */
const SAME_ORIGIN_PATH = /^\/(?!\/)[A-Za-z0-9._/-]+$/;

function sameOriginPath(url: string): string {
  if (!SAME_ORIGIN_PATH.test(url)) {
    throw new TypeError('invalid same-origin path');
  }
  return url;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export interface SwaggerUiPageOptions {
  readonly title: string;
  /** Same-origin paths of the stylesheets, in order. */
  readonly stylesheets: readonly string[];
  /** Same-origin paths of the scripts, in order (the bundle first, then the initializer). */
  readonly scripts: readonly string[];
}

/**
 * The Swagger UI host page. It contains no inline script, style element, style attribute or event handler, so it
 * works under `script-src 'self'; style-src 'self'`. Every referenced URL must be a same-origin path.
 */
export function renderSwaggerUiPage(options: SwaggerUiPageOptions): string {
  const links = options.stylesheets.map((href) => `<link rel="stylesheet" href="${sameOriginPath(href)}">`);
  const scripts = options.scripts.map((src) => `<script src="${sameOriginPath(src)}"></script>`);
  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(options.title)}</title>`,
    ...links,
    '</head>',
    '<body>',
    '<div id="swagger-ui"></div>',
    ...scripts,
    '</body>',
    '</html>',
    '',
  ].join('\n');
}

export interface SwaggerUiInitializerOptions {
  /** Same-origin path of the OpenAPI JSON document; the UI fetches it, so the page never embeds it. */
  readonly specUrl: string;
}

/**
 * The script that starts Swagger UI. Read-only: no operation can be sent from the UI (`supportedSubmitMethods: []`,
 * "Try it out" off). The spec is fetched from `specUrl`; the query string cannot point the UI at another document
 * (`queryConfigEnabled: false`), and no external validator is contacted (`validatorUrl: null`).
 */
export function renderSwaggerUiInitializer(options: SwaggerUiInitializerOptions): string {
  return [
    "'use strict';",
    "window.addEventListener('load', function () {",
    '  window.ui = SwaggerUIBundle({',
    `    url: ${JSON.stringify(sameOriginPath(options.specUrl))},`,
    "    dom_id: '#swagger-ui',",
    '    deepLinking: false,',
    '    queryConfigEnabled: false,',
    '    validatorUrl: null,',
    '    supportedSubmitMethods: [],',
    '    tryItOutEnabled: false,',
    "    layout: 'BaseLayout',",
    '    presets: [SwaggerUIBundle.presets.apis],',
    '  });',
    '});',
    '',
  ].join('\n');
}
