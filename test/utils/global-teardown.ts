import { execSync } from "node:child_process";

import type { Config } from "jest";

let isEventAdded = false;

/**
 * Allows the use of a custom global teardown module. The function will be triggered once after all test suites.
 * @param config Jest config
 */
const globalTeardown = (config: Config): void => {
  const command = "docker compose -f compose.test.yml down";
  if (isEventAdded) {
    return;
  }
  if (config.watch === true || config.watchAll) {
    process.once("exit", () => execSync(command));
    isEventAdded = true;
    return;
  }
  execSync(command);
};

// Jest global teardown should have default export
// eslint-disable-next-line import/no-default-export
export default globalTeardown;
