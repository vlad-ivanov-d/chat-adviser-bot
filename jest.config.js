const { compilerOptions } = require("./tsconfig.json");

/** @type {import('jest').Config} */
const config = {
  coverageReporters: ["json-summary", "lcov", "text-summary"],
  coverageThreshold: { global: { branches: 40, functions: 62, lines: 58, statements: 59 } },
  detectOpenHandles: true,
  forceExit: true,
  modulePaths: [compilerOptions.baseUrl],
  preset: "ts-jest",
  setupFiles: ["<rootDir>/src/test/setEnv.ts"],
  setupFilesAfterEnv: ["<rootDir>/src/test/setup.ts"],
};

module.exports = config;
