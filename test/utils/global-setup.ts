import { execSync } from "node:child_process";

import dotenv from "dotenv";

/**
 * Allows the use of a custom global setup module. The function will be triggered once before all test suites.
 */
const globalSetup = (): void => {
  dotenv.config({ path: ".env.test" });
  execSync("docker compose -f compose.test.yml up --force-recreate --remove-orphans --wait -d");
  execSync("npx prisma migrate deploy");
};

// Jest global setup should have default export
// eslint-disable-next-line import/no-default-export
export default globalSetup;
