/** @type {import('jest').Config} */
module.exports = {
  displayName: 'api-docs',
  testEnvironment: 'node',
  transform: { '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }] },
  moduleFileExtensions: ['ts', 'js'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.spec.ts', '!src/**/*.d.ts'],
  coverageReporters: ['text-summary'],
  coverageThreshold: { global: { statements: 100, lines: 100, functions: 100, branches: 100 } },
};
