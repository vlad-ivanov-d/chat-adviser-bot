import type { Config } from "jest";

const config: Config = {
  collectCoverageFrom: ["src/**"],
  coveragePathIgnorePatterns: [".spec.ts"],
  coverageReporters: [["json", { file: "../.nyc_output/coverage-final.json" }], "html", "text-summary"],
  coverageThreshold: { global: { branches: 2, functions: 2, lines: 2, statements: 2 } },
  globalSetup: "<rootDir>/test/utils/global-setup.ts",
  globalTeardown: "<rootDir>/test/utils/global-teardown.ts",
  maxWorkers: 1, // Use sequential tests to prevent conflicts in database
  modulePaths: ["<rootDir>"],
  preset: "ts-jest",
  restoreMocks: true,
  setupFilesAfterEnv: ["<rootDir>/test/utils/setup-after-env.ts"],
};

// Jest config should have default export
// eslint-disable-next-line import/no-default-export
export default config;
