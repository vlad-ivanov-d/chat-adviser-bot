import { execSync } from "node:child_process";

import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });

let isEnvRunning = false;

/**
 * Allows the use of a custom global setup module. The function will be triggered once before all test suites,
 * but it may be called multiple times in watch mode.
 */
export default (): void => {
  if (isEnvRunning) {
    return;
  }
  // Use container up command for tests
  // eslint-disable-next-line sonarjs/no-os-command-from-path
  execSync("docker compose -p chat-adviser-bot-test up --remove-orphans --wait -d && npx prisma migrate deploy");
  isEnvRunning = true;
};
