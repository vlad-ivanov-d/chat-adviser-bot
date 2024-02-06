import type { Config } from "jest";

const config: Config = {
  collectCoverageFrom: ["src/**"],
  coverageDirectory: "./coverage-e2e",
  coveragePathIgnorePatterns: [".spec.ts"],
  coverageReporters: [["json", { file: "../.nyc_output/coverage-e2e-final.json" }], "html", "text-summary"],
  coverageThreshold: { global: { branches: 45, functions: 61, lines: 64, statements: 65 } },
  detectOpenHandles: true,
  forceExit: true,
  maxWorkers: 1, // Use sequential tests to prevent conflicts in database
  modulePaths: ["<rootDir>"],
  preset: "ts-jest",
  restoreMocks: true,
  setupFiles: ["<rootDir>/test/utils/setup-after-env.ts"],
  setupFilesAfterEnv: ["<rootDir>/test/utils/setup.ts"],
  testMatch: ["<rootDir>/test/**/*.e2e-spec.ts"],
};

// Jest config should have default export
// eslint-disable-next-line import/no-default-export
export default config;
