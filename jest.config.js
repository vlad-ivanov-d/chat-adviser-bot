const { compilerOptions } = require("./tsconfig.json");

/** @type {import('jest').Config} */
const config = {
  coverageReporters: ["json-summary", "lcov", "text-summary"],
  coverageThreshold: { global: { branches: 23, functions: 43, lines: 41, statements: 43 } },
  detectOpenHandles: true,
  forceExit: true,
  modulePaths: [compilerOptions.baseUrl],
  preset: "ts-jest",
  setupFiles: ["<rootDir>/src/test/setEnv.ts"],
  setupFilesAfterEnv: ["<rootDir>/src/test/setup.ts"],
};

module.exports = config;
