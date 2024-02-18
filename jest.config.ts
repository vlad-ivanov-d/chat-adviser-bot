import type { Config } from "jest";

const config: Config = {
  collectCoverageFrom: ["src/**"],
  coveragePathIgnorePatterns: [".spec.ts"],
  coverageReporters: [["json", { file: "../.nyc_output/coverage-final.json" }], "html", "text-summary"],
  coverageThreshold: { global: { branches: 3, functions: 3, lines: 3, statements: 3 } },
  globalSetup: "<rootDir>/test/utils/global-setup.ts",
  globalTeardown: "<rootDir>/test/utils/global-teardown.ts",
  maxWorkers: 1, // Use sequential tests to prevent conflicts in database
  modulePaths: ["<rootDir>"],
  preset: "ts-jest",
  restoreMocks: true,
  setupFilesAfterEnv: ["<rootDir>/test/utils/setup-after-env.ts"],
  testMatch: ["<rootDir>/src/**/*.spec.ts"],
};

// Jest config should have default export
// eslint-disable-next-line import/no-default-export
export default config;
