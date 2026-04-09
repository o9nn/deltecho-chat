/** @type {import('jest').Config} */
export default {
  preset: "ts-jest",
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^deep-tree-echo-core$": "<rootDir>/../core/src/index.ts",
    "^deep-tree-echo-core/(.*)$": "<rootDir>/../core/src/$1",
    "^@deltecho/cognitive$": "<rootDir>/../cognitive/src/index.ts",
    "^@deltecho/cognitive/(.*)$": "<rootDir>/../cognitive/src/$1",
    "^@deltecho/shared$": "<rootDir>/../shared/src/index.ts",
    "^@deltecho/shared/(.*)$": "<rootDir>/../shared/src/$1",
    "^@deltecho/sys6-triality$": "<rootDir>/../sys6-triality/src/index.ts",
    "^@deltecho/sys6-triality/(.*)$": "<rootDir>/../sys6-triality/src/$1",
    "^@deltecho/ipc$": "<rootDir>/../ipc/src/index.ts",
    "^@deltecho/ipc/(.*)$": "<rootDir>/../ipc/src/$1",
    "^@deltecho/dove9$": "<rootDir>/../dove9/src/index.ts",
    "^@deltecho/dove9/(.*)$": "<rootDir>/../dove9/src/$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: "./tsconfig.json",
      },
    ],
  },
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/**/__tests__/**",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov"],
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  verbose: true,
};
