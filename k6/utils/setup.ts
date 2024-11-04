import { execSync, spawn } from "node:child_process";
import { readdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";

import { Test } from "@nestjs/testing";
import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });
process.env.NODE_ENV = "test";
import { build } from "esbuild";

import { AppModule } from "src/app.module";
import { store } from "src/utils/redis";
import { cleanupDb } from "test/utils/database";

import { server } from "./server";

/**
 * Runs the test file
 * @param fileName File name of the test, which is located in dist folder.
 */
const runTest = async (fileName: string): Promise<void> => {
  for (const distFileName of readdirSync("k6/dist")) {
    if (distFileName === fileName) {
      // Use container run command to setup test agents
      // eslint-disable-next-line sonarjs/no-os-command-from-path
      const testProcess = spawn("docker", [
        "run",
        "--add-host=host.docker.internal:host-gateway", // To fix issues in GitHub Actions
        "--rm",
        "-i",
        "grafana/k6",
        "run",
        "-",
      ]);
      testProcess.stderr.on("data", (data: Buffer) => {
        // Show k6 error
        // eslint-disable-next-line no-console
        console.error(data.toString());
      });
      testProcess.stdout.on("data", (data: Buffer) => {
        // Show k6 log
        // eslint-disable-next-line no-console
        console.log(data.toString());
      });

      // Run test script. File name is handled securely.
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      const scriptContent = readFileSync(path.resolve("k6/dist", distFileName), "utf-8");
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
    }
  }
};

/**
 * Setups tests
 */
const setup = async (): Promise<void> => {
  // Build test files
  rmSync("k6/dist", { force: true, recursive: true });
  await build({
    bundle: true,
    entryPoints: readdirSync("k6").reduce<string[]>(
      (result, name) => (name.endsWith(".spec.ts") ? [...result, path.resolve("k6", name)] : result),
      [],
    ),
    external: ["k6"],
    outdir: "k6/dist",
    platform: "node",
    target: "es6",
  });

  // Start env
  server.listen({ onUnhandledRequest: "error" });
  // Use container up command for tests
  // eslint-disable-next-line sonarjs/no-os-command-from-path
  execSync("docker compose -p chat-adviser-bot-test up --remove-orphans --wait -d && npx prisma migrate deploy");
  const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = await moduleFixture.createNestApplication().init();
  const cache = await store();

  // Run tests
  const argFileName = process.argv[2] ? `${path.parse(process.argv[2]).name}.js` : undefined;
  const fileNames = readdirSync("k6/dist").filter((n) => (argFileName ? n === argFileName : true));
  for (const fileName of fileNames) {
    await runTest(fileName);
    await Promise.all([cache.reset(), cleanupDb()]);
  }

  // Stop the env
  await app.close();
  // Use container shutdown command for tests
  // eslint-disable-next-line sonarjs/no-os-command-from-path
  execSync("docker compose -p chat-adviser-bot-test down -v");

  process.exit();
};

void setup();
