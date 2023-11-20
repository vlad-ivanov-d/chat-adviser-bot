const { compilerOptions } = require("./tsconfig.json");

/** @type {import('jest').Config} */
const config = {
  modulePaths: [compilerOptions.baseUrl],
  preset: "ts-jest",
  setupFiles: ["<rootDir>/src/tests/setEnvVars.ts"],
  setupFilesAfterEnv: ["<rootDir>/src/tests/setup.ts"],
};

module.exports = config;
