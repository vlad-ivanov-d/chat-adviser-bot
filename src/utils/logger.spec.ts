import { format } from "fecha";

import { TEST_ASYNC_DELAY } from "test/utils/constants";
import { sleep } from "test/utils/sleep";

import { logger, templateFunction } from "./logger";

describe("Logger", () => {
  it("ignores a message that is not a string in the template function", () => {
    expect(templateFunction({ level: "INFO", message: true })).toBe(`[Nest] -  INFO \x1B[33m[]\x1B[39m `);
  });

  it("logs a message to console", async () => {
    // Node.js maps "process.stdout" to "console._stdout"
    const consoleWithStdout: Console & { _stdout?: { write: (message: string) => void } } = console;
    const stdoutWriteSpy = jest.spyOn(consoleWithStdout._stdout ?? { write: jest.fn() }, "write");

    logger.log("Test message");

    const timestamp = format(new Date(), "MM/DD/YYYY, hh:mm:ss A");
    await sleep(TEST_ASYNC_DELAY);
    expect(stdoutWriteSpy).toHaveBeenCalledWith(
      `[Nest] - ${timestamp} \x1B[32m   INFO\x1B[39m \x1B[33m[]\x1B[39m \x1B[32mTest message\x1B[39m\n`,
    );
  });
});
