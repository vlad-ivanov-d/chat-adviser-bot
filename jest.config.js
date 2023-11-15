const { compilerOptions } = require("./tsconfig.json");

/** @type {import('jest').Config} */
const config = {
  modulePaths: [compilerOptions.baseUrl],
  preset: "ts-jest",
  setupFilesAfterEnv: ["<rootDir>/src/tests/setup.ts"],
};

module.exports = config;
