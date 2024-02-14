import type { Config } from "jest";

const config: Config = {
  collectCoverageFrom: ["src/**"],
  coverageDirectory: "./coverage-e2e",
  coveragePathIgnorePatterns: [".spec.ts"],
  coverageReporters: [["json", { file: "../.nyc_output/coverage-e2e-final.json" }], "html", "text-summary"],
  coverageThreshold: { global: { branches: 50, functions: 64, lines: 65, statements: 67 } },
  detectOpenHandles: true,
  forceExit: true,
  globalSetup: "<rootDir>/test/utils/global-setup.ts",
  globalTeardown: "<rootDir>/test/utils/global-teardown.ts",
  maxWorkers: 1, // Use sequential tests to prevent conflicts in database
  modulePaths: ["<rootDir>"],
  preset: "ts-jest",
  restoreMocks: true,
  setupFilesAfterEnv: ["<rootDir>/test/utils/setup-after-env.ts"],
  testMatch: ["<rootDir>/test/**/*.e2e-spec.ts"],
};

// Jest config should have default export
// eslint-disable-next-line import/no-default-export
export default config;
