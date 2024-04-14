import type { Config } from "jest";

const config: Config = {
  collectCoverageFrom: ["src/**"],
  coveragePathIgnorePatterns: [".spec.ts", "src/main.ts"],
  coverageReporters: [["json", { file: "../.nyc_output/coverage-final.json" }], "html", "text-summary"],
  coverageThreshold: { global: { branches: 5, functions: 5, lines: 5, statements: 5 } },
  globalSetup: "<rootDir>/test/utils/global-setup.ts",
  globalTeardown: "<rootDir>/test/utils/global-teardown.ts",
  modulePaths: ["<rootDir>"],
  preset: "ts-jest",
  restoreMocks: true,
  testMatch: ["<rootDir>/src/**/*.spec.ts"],
};

// Jest config should have default export
// eslint-disable-next-line import/no-default-export
export default config;
