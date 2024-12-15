import { execSync } from "node:child_process";

import type { Config } from "jest";

/**
 * Shutdowns docker containers
 */
const shutdownContainers = (): void => {
  // Use container shutdown command for tests
  // eslint-disable-next-line sonarjs/no-os-command-from-path
  execSync("docker compose -p chat-adviser-bot-test down -v");
};

/**
 * Allows the use of a custom global teardown module. The function will be triggered once after all test suites,
 * but it may be called multiple times in watch mode.
 * @param config Jest config
 */
export default (config: Config): void => {
  if (config.watch === true || config.watchAll) {
    // Shutdown containers only on the process exit. Remove the listener from previous runs if any.
    process.removeListener("exit", shutdownContainers);
    process.once("exit", shutdownContainers);
    return;
  }
  shutdownContainers();
};
