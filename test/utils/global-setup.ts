import { execSync } from "node:child_process";

import dotenv from "dotenv";

let isEnvRunning = false;

/**
 * Allows the use of a custom global setup module. The function will be triggered once before all test suites.
 * Jest global setup use default export.
 */
// eslint-disable-next-line import/no-default-export
export default (): void => {
  if (isEnvRunning) {
    return;
  }
  dotenv.config({ path: ".env.test" });
  execSync("docker compose -f compose.test.yml up --force-recreate --remove-orphans --wait -d");
  execSync("npx prisma migrate deploy");
  isEnvRunning = true;
};
