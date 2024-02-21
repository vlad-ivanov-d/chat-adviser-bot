import { execSync, spawn } from "node:child_process";
import { readdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";

import { Test } from "@nestjs/testing";
import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });
process.env.NODE_ENV = "test";
import { build } from "esbuild";
import { AppModule } from "src/app.module";
import { cache } from "src/utils/cache";
import { cleanupDb } from "test/utils/database";

import { server } from "./server";

/**
 * Runs the test file
 * @param filePath File path for the test
 * @returns Promise
 */
const runTest = (filePath: string): Promise<void> => {
  // Show test file name
  // eslint-disable-next-line no-console
  console.log(path.parse(filePath).base);

  // Should be handled on a higher level
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const scriptContent = readFileSync(filePath, "utf-8");

  const testProcess = spawn("docker", ["run", "--rm", "-i", "grafana/k6", "run", "-"]);
  testProcess.stderr.on("data", (data: Buffer) => {
    // Show k6 error output
    // eslint-disable-next-line no-console
    console.error(data.toString());
  });
  testProcess.stdout.on("data", (data: Buffer) => {
    // Show k6 log
    // eslint-disable-next-line no-console
    console.log(data.toString());
  });

  // Run test script
  testProcess.stdin.write(scriptContent);
  testProcess.stdin.end();

  // Wait for test completion
  return new Promise((resolve, reject) =>
    testProcess.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error());
    }),
  );
};

/**
 * Setup the app
 * @returns Nest application
 */
const setup = async (): Promise<void> => {
  // Build test files
  rmSync("k6/dist", { force: true, recursive: true });
  await build({
    bundle: true,
    entryPoints: readdirSync("k6")
      .filter((name) => name.endsWith(".spec.ts"))
      .map((name) => path.resolve("k6", name)),
    external: ["k6"],
    outdir: "k6/dist",
    platform: "node",
    target: "es6",
  });

  // Start env
  server.listen({ onUnhandledRequest: "error" });
  execSync("docker compose -f compose.test.yml up --force-recreate --remove-orphans --wait -d");
  execSync("npx prisma migrate deploy");
  const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleFixture.createNestApplication();
  await app.init();

  // Run tests
  const files = process.argv[2] ? [`${path.parse(process.argv[2]).name}.js`] : readdirSync("k6/dist");
  for (const file of files) {
    await runTest(path.resolve("k6/dist", file));
    await Promise.all([cleanupDb(), cache.reset()]);
  }

  // Stop the env
  await app.close();
  execSync("docker compose -f compose.test.yml down");

  process.exit();
};

void setup();
