const { compilerOptions } = require("./tsconfig.json");

/** @type {import('jest').Config} */
const config = {
  coverageReporters: ["json-summary", "lcov", "text-summary"],
  coverageThreshold: { global: { branches: 45, functions: 69, lines: 64, statements: 65 } },
  detectOpenHandles: true,
  forceExit: true,
  maxWorkers: 1, // Use sequential tests to prevent conflicts in database
  modulePaths: [compilerOptions.baseUrl],
  preset: "ts-jest",
  restoreMocks: true,
  setupFiles: ["<rootDir>/src/test/setEnv.ts"],
  setupFilesAfterEnv: ["<rootDir>/src/test/setup.ts"],
};

module.exports = config;
