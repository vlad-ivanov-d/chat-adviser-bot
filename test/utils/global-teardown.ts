import { execSync } from "node:child_process";

/**
 * Allows the use of a custom global teardown module. The function will be triggered once after all test suites.
 */
const globalTeardown = (): void => {
  execSync("docker compose -f compose.test.yml down");
};

// Jest global teardown should have default export
// eslint-disable-next-line import/no-default-export
export default globalTeardown;
