import { CommandCtx } from "src/types/telegraf-context";
import { mockCommandCtx } from "test/mocks/telegraf";

import { CommandWithoutPayload } from "./command-without-payload";

const testFunction = jest.fn();

class TestClass {
  /**
   * Runs test function
   * @param ctx Command context
   */
  @CommandWithoutPayload()
  public testCommand(ctx: CommandCtx): void {
    testFunction(ctx);
  }
}

describe("CommandWithoutPayload", () => {
  it("runs a command without payload", () => {
    const ctx = mockCommandCtx();
    new TestClass().testCommand(ctx);
    expect(testFunction).toHaveBeenCalledTimes(1);
  });

  it("skips a command with payload", () => {
    const ctx = mockCommandCtx({ payload: "payload" });
    new TestClass().testCommand(ctx);
    expect(testFunction).toHaveBeenCalledTimes(0);
  });
});
