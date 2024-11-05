import { mockCommandCtx } from "test/mocks/telegraf";

import { logRequestTime } from "./log-request-time";

describe("logRequestTime", () => {
  it("logs the request time", async () => {
    const stdoutWriteSpy = jest.spyOn(process.stdout, "write").mockImplementation(() => true);
    await logRequestTime(mockCommandCtx(), jest.fn());
    expect(stdoutWriteSpy).toHaveBeenCalledWith(expect.stringContaining("Update processing completed"));
  });
});
