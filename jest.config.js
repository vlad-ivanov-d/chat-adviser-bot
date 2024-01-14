const { compilerOptions } = require("./tsconfig.json");

/** @type {import('jest').Config} */
const config = {
  coverageReporters: ["json-summary", "lcov", "text-summary"],
  coverageThreshold: { global: { branches: 38, functions: 61, lines: 57, statements: 58 } },
  detectOpenHandles: true,
  forceExit: true,
  modulePaths: [compilerOptions.baseUrl],
  preset: "ts-jest",
  setupFiles: ["<rootDir>/src/test/setEnv.ts"],
  setupFilesAfterEnv: ["<rootDir>/src/test/setup.ts"],
};

module.exports = config;
