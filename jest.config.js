const { compilerOptions } = require("./tsconfig.json");

/** @type {import('jest').Config} */
const config = {
  modulePaths: [compilerOptions.baseUrl],
  preset: "ts-jest",
};

module.exports = config;
