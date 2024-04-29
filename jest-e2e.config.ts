import type { Config } from "jest";

const config: Config = {
  clearMocks: true,
  collectCoverageFrom: ["src/**"],
  coverageDirectory: "./coverage-e2e",
  coveragePathIgnorePatterns: [".spec.ts", "src/main.ts", "src/utils/logger.ts"],
  coverageReporters: [["json", { file: "../.nyc_output/coverage-e2e-final.json" }], "html", "text-summary"],
  coverageThreshold: { global: { branches: 80, functions: 90, lines: 90, statements: 90 } },
  detectOpenHandles: true,
  forceExit: true,
  globalSetup: "<rootDir>/test/utils/global-setup.ts",
  globalTeardown: "<rootDir>/test/utils/global-teardown.ts",
  maxWorkers: 1, // Use sequential tests to prevent conflicts in cache and database
  modulePathIgnorePatterns: ["<rootDir>/__mocks__/"], // Disable built-in folder for mocks
  modulePaths: ["<rootDir>"],
  preset: "ts-jest",
  restoreMocks: true,
  setupFilesAfterEnv: ["<rootDir>/test/utils/setup.ts"],
  testMatch: ["<rootDir>/test/**/*.e2e-spec.ts"],
};

export default config;
