/**
 * Jest Configuration for Frontend Package
 *
 * Uses ts-jest with jsdom environment for React component testing.
 * NOTE: Transform options are in the transform array, not globals (deprecated).
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.{ts,tsx}'],
  moduleNameMapper: {
    // Handle CSS imports (with CSS modules)
    '\\.module\\.(css|scss)$': 'identity-obj-proxy',
    // Handle CSS imports (without CSS modules)
    '\\.(css|scss)$': '<rootDir>/__mocks__/styleMock.js',
    // Handle image imports
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
    // Workspace package mappings
    '^@deltecho/ui-components$': '<rootDir>/../ui-components/src/index.ts',
    '^@deltecho/cognitive$': '<rootDir>/../cognitive/src/index.ts',
    '^@deltecho/avatar$': '<rootDir>/../avatar/src/index.ts',
    '^@deltecho/reasoning$': '<rootDir>/../reasoning/src/index.ts',
    '^@deltecho/sys6-triality$': '<rootDir>/../sys6-triality/src/index.ts',
    '^@deltecho/dove9$': '<rootDir>/../dove9/src/index.ts',
    '^deep-tree-echo-core$': '<rootDir>/../core/src/index.ts',
    '^deep-tree-echo-core/(.*)$': '<rootDir>/../core/src/$1/index.ts',
  },
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
        diagnostics: {
          // Reduce noise from type errors in tests (caught by tsc)
          warnOnly: true,
        },
      },
    ],
  },
  // Note: 'globals.ts-jest' is deprecated in ts-jest 29+
  // Options should be in the transform array above
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.tsx',
    '!src/**/types.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  // Increase timeout for async tests
  testTimeout: 10000,
}
