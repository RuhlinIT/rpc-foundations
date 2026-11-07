/// <reference path="./swagger-ui-dist.d.ts" />
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
import getAbsoluteFSPath = require('swagger-ui-dist/absolute-path.js');

/** One allowlisted UI file: a plain file name (no path) and the exact Content-Type to serve it with. */
export interface UiAssetSpec {
  readonly name: string;
  readonly contentType: string;
}

/** A UI file read into memory at startup. Text only (stylesheets and scripts), decoded strictly as UTF-8. */
export interface UiAsset {
  readonly name: string;
  readonly contentType: string;
  readonly text: string;
}

/** The loaded allowlist. Lookup is by exact name; there is no way to add, replace or remove an asset. */
export interface UiAssets {
  get(name: string): UiAsset | undefined;
  names(): readonly string[];
}

/** Any reason the UI assets cannot be loaded. Startup must fail closed on it. */
export class UiAssetError extends Error {
  override readonly name = 'UiAssetError';
}

/** The Swagger UI files a read-only docs page needs: the stylesheet and the browser bundle. Nothing else is served. */
export const SWAGGER_UI_ASSETS: readonly UiAssetSpec[] = Object.freeze([
  Object.freeze({ name: 'swagger-ui.css', contentType: 'text/css; charset=utf-8' }),
  Object.freeze({ name: 'swagger-ui-bundle.js', contentType: 'text/javascript; charset=utf-8' }),
]);

/** Absolute path of the installed swagger-ui-dist package directory. */
export function swaggerUiDistRoot(): string {
  return getAbsoluteFSPath();
}

const ASSET_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const CONTENT_TYPE = /^[a-z]+\/[a-z0-9.+-]+(?:; charset=utf-8)?$/;

/**
 * Reads exactly the allowlisted files from `root` into memory. Fails closed (UiAssetError) if the root is not an
 * absolute existing directory, the allowlist is empty or repeats a name, a name is anything but a plain file name,
 * a content type is not a single lowercase media type (optionally `; charset=utf-8`), or any file is missing, not a
 * regular file, resolves outside the root (symbolic link), is empty, or is not valid UTF-8.
 */
export function loadUiAssets(root: string, allowlist: readonly UiAssetSpec[]): UiAssets {
  if (!isAbsolute(root)) {
    throw new UiAssetError('UI asset root must be an absolute path');
  }
  let realRoot: string;
  try {
    realRoot = realpathSync(root);
  } catch {
    throw new UiAssetError('UI asset root not found');
  }
  if (!statSync(realRoot).isDirectory()) {
    throw new UiAssetError('UI asset root must be a directory');
  }
  if (allowlist.length === 0) {
    throw new UiAssetError('the UI asset allowlist is empty');
  }
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const assets = new Map<string, UiAsset>();
  for (const { name, contentType } of allowlist) {
    if (!ASSET_NAME.test(name) || name.includes('..')) {
      throw new UiAssetError('invalid UI asset name');
    }
    if (!CONTENT_TYPE.test(contentType)) {
      throw new UiAssetError(`invalid UI asset content type: ${name}`);
    }
    if (assets.has(name)) {
      throw new UiAssetError(`duplicate UI asset: ${name}`);
    }
    let file: string;
    try {
      file = realpathSync(join(realRoot, name));
    } catch {
      throw new UiAssetError(`UI asset not found: ${name}`);
    }
    if (dirname(file) !== realRoot) {
      throw new UiAssetError(`UI asset resolves outside its root: ${name}`);
    }
    if (!statSync(file).isFile()) {
      throw new UiAssetError(`UI asset is not a regular file: ${name}`);
    }
    const bytes = readFileSync(file);
    if (bytes.length === 0) {
      throw new UiAssetError(`UI asset is empty: ${name}`);
    }
    let text: string;
    try {
      text = decoder.decode(bytes);
    } catch {
      throw new UiAssetError(`UI asset is not valid UTF-8: ${name}`);
    }
    assets.set(name, Object.freeze({ name, contentType, text }));
  }
  const names = [...assets.keys()];
  return Object.freeze({
    get: (name: string) => assets.get(name),
    names: () => [...names],
  });
}
