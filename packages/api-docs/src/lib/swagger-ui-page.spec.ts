import { renderSwaggerUiInitializer, renderSwaggerUiPage } from './swagger-ui-page';

const PAGE = {
  title: 'Control <Center> & "API"',
  stylesheets: ['/api/docs/assets/swagger-ui.css'],
  scripts: ['/api/docs/assets/swagger-ui-bundle.js', '/api/docs/initializer.js'],
};

describe('renderSwaggerUiPage', () => {
  it('renders the exact page: stylesheet links and external scripts only, escaped title', () => {
    expect(renderSwaggerUiPage(PAGE)).toBe(
      [
        '<!DOCTYPE html>',
        '<html lang="en">',
        '<head>',
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
        '<title>Control &lt;Center&gt; &amp; &quot;API&quot;</title>',
        '<link rel="stylesheet" href="/api/docs/assets/swagger-ui.css">',
        '</head>',
        '<body>',
        '<div id="swagger-ui"></div>',
        '<script src="/api/docs/assets/swagger-ui-bundle.js"></script>',
        '<script src="/api/docs/initializer.js"></script>',
        '</body>',
        '</html>',
        '',
      ].join('\n')
    );
  });

  it('contains no inline script, style element, style attribute or event handler', () => {
    const html = renderSwaggerUiPage({ ...PAGE, title: "it's <script>alert(1)</script>" });
    expect(html.match(/<script[^>]*>/g)).toEqual([
      '<script src="/api/docs/assets/swagger-ui-bundle.js">',
      '<script src="/api/docs/initializer.js">',
    ]);
    expect(html).not.toMatch(/<script[^>]*>[^<]/);
    expect(html).not.toMatch(/<style|style=|\son[a-z]+=/i);
    expect(html).toContain('<title>it&#39;s &lt;script&gt;alert(1)&lt;/script&gt;</title>');
  });

  it.each([
    'relative.css',
    '//evil.test/x.js',
    'https://evil.test/x.js',
    'javascript:alert(1)',
    '/a"onload="x',
    '/a b.js',
    "/a'.js",
    '/a<b.js',
    '/a?x=1',
    '/a#x',
    '',
  ])('refuses the URL %j', (url) => {
    expect(() => renderSwaggerUiPage({ ...PAGE, scripts: [url] })).toThrow('invalid same-origin path');
    expect(() => renderSwaggerUiPage({ ...PAGE, stylesheets: [url] })).toThrow('invalid same-origin path');
  });
});

describe('renderSwaggerUiInitializer', () => {
  it('renders the exact read-only initializer that fetches the spec by URL', () => {
    expect(renderSwaggerUiInitializer({ specUrl: '/api/docs/openapi.json' })).toBe(
      [
        "'use strict';",
        "window.addEventListener('load', function () {",
        '  window.ui = SwaggerUIBundle({',
        '    url: "/api/docs/openapi.json",',
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
      ].join('\n')
    );
  });

  it.each(['openapi.json', '//evil.test/spec.json', '/spec.json";alert(1);"', ''])('refuses the spec URL %j', (specUrl) => {
    expect(() => renderSwaggerUiInitializer({ specUrl })).toThrow('invalid same-origin path');
  });
});
