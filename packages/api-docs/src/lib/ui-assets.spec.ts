import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SWAGGER_UI_ASSETS, UiAssetError, loadUiAssets, swaggerUiDistRoot, type UiAssetSpec } from './ui-assets';

const CSS: UiAssetSpec = { name: 'ui.css', contentType: 'text/css; charset=utf-8' };
const JS: UiAssetSpec = { name: 'ui-bundle.js', contentType: 'text/javascript; charset=utf-8' };

let root: string;
let outside: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'api-docs-assets-'));
  outside = mkdtempSync(join(tmpdir(), 'api-docs-outside-'));
  writeFileSync(join(root, CSS.name), 'body{margin:0}');
  writeFileSync(join(root, JS.name), 'window.x=1;');
  writeFileSync(join(root, 'not-listed.js'), 'secret();');
  writeFileSync(join(outside, 'elsewhere.js'), 'elsewhere();');
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  rmSync(outside, { recursive: true, force: true });
});

const failure = (run: () => unknown): UiAssetError => {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(UiAssetError);
    return error as UiAssetError;
  }
  throw new Error('expected a UiAssetError');
};

describe('loadUiAssets', () => {
  it('reads exactly the allowlisted files into memory as text with their content types', () => {
    const assets = loadUiAssets(root, [CSS, JS]);
    expect(assets.names()).toEqual(['ui.css', 'ui-bundle.js']);
    expect(assets.get('ui.css')).toEqual({ name: 'ui.css', contentType: 'text/css; charset=utf-8', text: 'body{margin:0}' });
    expect(assets.get('ui-bundle.js')?.text).toBe('window.x=1;');
    expect(assets.get('not-listed.js')).toBeUndefined();
    expect(assets.get('../ui.css')).toBeUndefined();
  });

  it('keeps the content read at startup (later file changes are not served)', () => {
    const assets = loadUiAssets(root, [CSS]);
    writeFileSync(join(root, CSS.name), 'changed');
    expect(assets.get('ui.css')?.text).toBe('body{margin:0}');
  });

  it('returns frozen assets and an object without mutators', () => {
    const assets = loadUiAssets(root, [CSS]);
    expect(Object.isFrozen(assets.get('ui.css'))).toBe(true);
    expect(Object.isFrozen(assets)).toBe(true);
    expect((assets as unknown as { set?: unknown }).set).toBeUndefined();
    const names = assets.names() as string[];
    names.push('x');
    expect(assets.names()).toEqual(['ui.css']);
  });

  it('a missing allowlisted file fails closed, naming the file', () => {
    rmSync(join(root, JS.name));
    expect(failure(() => loadUiAssets(root, [CSS, JS])).message).toBe('UI asset not found: ui-bundle.js');
  });

  it.each([
    ['a relative root', () => loadUiAssets('relative/dir', [CSS]), 'UI asset root must be an absolute path'],
    ['a missing root', () => loadUiAssets(join(root, 'missing'), [CSS]), 'UI asset root not found'],
    ['a file as root', () => loadUiAssets(join(root, CSS.name), [CSS]), 'UI asset root must be a directory'],
    ['an empty allowlist', () => loadUiAssets(root, []), 'the UI asset allowlist is empty'],
    ['a duplicate name', () => loadUiAssets(root, [CSS, CSS]), 'duplicate UI asset: ui.css'],
  ])('%s fails closed', (_label, run, message) => {
    expect(failure(run).message).toBe(message);
  });

  it.each(['../ui.css', 'a/b.js', 'a\\b.js', '.hidden', '', 'x..y.js', 'ui.css ', '%2e%2e', 'é.js'])(
    'refuses the asset name %j',
    (name) => {
      expect(failure(() => loadUiAssets(root, [{ name, contentType: CSS.contentType }])).message).toBe('invalid UI asset name');
    }
  );

  it.each(['', 'text/css\r\nX-Injected: 1', 'text/css; charset=latin1', 'TEXT/CSS', 'text css'])(
    'refuses the content type %j',
    (contentType) => {
      expect(failure(() => loadUiAssets(root, [{ name: CSS.name, contentType }])).message).toBe(
        'invalid UI asset content type: ui.css'
      );
    }
  );

  it('a directory with an allowlisted name is refused', () => {
    mkdirSync(join(root, 'dir.js'));
    expect(failure(() => loadUiAssets(root, [{ name: 'dir.js', contentType: JS.contentType }])).message).toBe(
      'UI asset is not a regular file: dir.js'
    );
  });

  it('a symbolic link that leaves the root is refused', () => {
    symlinkSync(join(outside, 'elsewhere.js'), join(root, 'link.js'));
    expect(failure(() => loadUiAssets(root, [{ name: 'link.js', contentType: JS.contentType }])).message).toBe(
      'UI asset resolves outside its root: link.js'
    );
  });

  it('a symbolic link to another file inside the root is served as that file', () => {
    symlinkSync(join(root, JS.name), join(root, 'alias.js'));
    expect(loadUiAssets(root, [{ name: 'alias.js', contentType: JS.contentType }]).get('alias.js')?.text).toBe('window.x=1;');
  });

  it('an empty file is refused', () => {
    writeFileSync(join(root, 'empty.js'), '');
    expect(failure(() => loadUiAssets(root, [{ name: 'empty.js', contentType: JS.contentType }])).message).toBe(
      'UI asset is empty: empty.js'
    );
  });

  it('a file that is not valid UTF-8 is refused', () => {
    writeFileSync(join(root, 'bad.js'), Buffer.from([0x61, 0xff, 0xfe, 0x62]));
    expect(failure(() => loadUiAssets(root, [{ name: 'bad.js', contentType: JS.contentType }])).message).toBe(
      'UI asset is not valid UTF-8: bad.js'
    );
  });
});

describe('Swagger UI distribution', () => {
  it('allowlists exactly the stylesheet and the browser bundle', () => {
    expect(SWAGGER_UI_ASSETS).toEqual([
      { name: 'swagger-ui.css', contentType: 'text/css; charset=utf-8' },
      { name: 'swagger-ui-bundle.js', contentType: 'text/javascript; charset=utf-8' },
    ]);
    expect(Object.isFrozen(SWAGGER_UI_ASSETS)).toBe(true);
    expect(SWAGGER_UI_ASSETS.every((asset) => Object.isFrozen(asset))).toBe(true);
  });

  it('resolves the installed swagger-ui-dist directory, from which the allowlist loads', () => {
    const dist = swaggerUiDistRoot();
    expect(dist).toMatch(/swagger-ui-dist$/);
    const assets = loadUiAssets(dist, SWAGGER_UI_ASSETS);
    expect(assets.names()).toEqual(['swagger-ui.css', 'swagger-ui-bundle.js']);
    expect(assets.get('swagger-ui-bundle.js')?.text).toContain('SwaggerUIBundle');
  });
});
