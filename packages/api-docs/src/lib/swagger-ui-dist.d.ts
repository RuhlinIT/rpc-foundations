// swagger-ui-dist ships no type declarations. Only this file is used, so that loading the package in Node never
// evaluates the browser bundle (its index.js requires swagger-ui-bundle.js).
declare module 'swagger-ui-dist/absolute-path.js' {
  /** Absolute path of the installed swagger-ui-dist directory. */
  function getAbsoluteFSPath(): string;
  export = getAbsoluteFSPath;
}
