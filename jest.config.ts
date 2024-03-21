import type { Config } from "jest";

const config: Config = {
  collectCoverageFrom: ["src/**"],
  coveragePathIgnorePatterns: [".spec.ts"],
  coverageReporters: [["json", { file: "../.nyc_output/coverage-final.json" }], "html", "text-summary"],
  coverageThreshold: { global: { branches: 4, functions: 4, lines: 4, statements: 4 } },
  globalSetup: "<rootDir>/test/utils/global-setup.ts",
  globalTeardown: "<rootDir>/test/utils/global-teardown.ts",
  modulePaths: ["<rootDir>"],
  preset: "ts-jest",
  restoreMocks: true,
  setupFilesAfterEnv: ["<rootDir>/test/utils/setup.ts"],
  testMatch: ["<rootDir>/src/**/*.spec.ts"],
};

// Jest config should have default export
// eslint-disable-next-line import/no-default-export
export default config;
