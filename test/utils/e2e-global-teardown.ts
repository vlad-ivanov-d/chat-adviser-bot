import { execSync } from "node:child_process";

import type { Config } from "jest";

let isEventAdded = false;

/**
 * Allows the use of a custom global teardown module. The function will be triggered once after all test suites,
 * but it may be called multiple times in watch mode.
 * @param config Jest config
 */
export default (config: Config): void => {
  const command = "docker compose -p chat-adviser-bot-test down -v";
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
