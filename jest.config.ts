import type { Config } from "jest";

const config: Config = {
  collectCoverageFrom: ["src/**"],
  coveragePathIgnorePatterns: [".spec.ts"],
  coverageReporters: [["json", { file: "../.nyc_output/coverage-final.json" }], "html", "text-summary"],
  coverageThreshold: { global: { branches: 2, functions: 2, lines: 2, statements: 2 } },
  maxWorkers: 1, // Use sequential tests to prevent conflicts in database
  modulePaths: ["<rootDir>"],
  preset: "ts-jest",
  restoreMocks: true,
  setupFiles: ["<rootDir>/test/utils/setup-after-env.ts"],
  setupFilesAfterEnv: ["<rootDir>/test/utils/setup.ts"],
};

// Jest config should have default export
// eslint-disable-next-line import/no-default-export
export default config;
