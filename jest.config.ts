import type { Config } from "jest";

const config: Config = {
  clearMocks: true,
  collectCoverageFrom: ["src/**"],
  coveragePathIgnorePatterns: [".spec.ts", "src/main.ts"],
  coverageReporters: [["json", { file: "../.nyc_output/coverage-final.json" }], "html", "text-summary"],
  coverageThreshold: { global: { branches: 6, functions: 6, lines: 6, statements: 6 } },
  modulePaths: ["<rootDir>"],
  preset: "ts-jest",
  restoreMocks: true,
  setupFilesAfterEnv: ["<rootDir>/test/utils/setup.ts"],
  testMatch: ["<rootDir>/src/**/*.spec.ts"],
};

export default config;
