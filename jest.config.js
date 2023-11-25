const { compilerOptions } = require("./tsconfig.json");

/** @type {import('jest').Config} */
const config = {
  coverageReporters: ["clover", "json", "json-summary", "lcov", "text"],
  coverageThreshold: {
    global: {
      branches: 10,
      functions: 10,
      lines: 10,
      statements: 10,
    },
  },
  modulePaths: [compilerOptions.baseUrl],
  preset: "ts-jest",
  setupFiles: ["<rootDir>/src/tests/setEnvVars.ts"],
  setupFilesAfterEnv: ["<rootDir>/src/tests/setup.ts"],
};

module.exports = config;
