import type { Config } from "jest";

const config: Config = {
  clearMocks: true,
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

export default config;
