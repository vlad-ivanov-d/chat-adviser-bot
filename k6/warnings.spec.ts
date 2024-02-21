import { check, sleep } from "k6";
import http from "k6/http";
import * as fixtures from "test/fixtures/warnings";

import { K6_WEBHOOK_URL } from "./utils/constants";
import { options } from "./utils/options";

export { options };

/**
 * Virtual user code
 */
const vuCode = (): void => {
  const res = http.post(K6_WEBHOOK_URL, JSON.stringify(fixtures.warnWebhook), {
    headers: { "Content-Type": "application/json" },
  });
  check(res, {
    /**
     * Checks status code
     * @param r Response
     * @returns True if success
     */
    "is status 200": (r) => r.status === 200,
  });
  sleep(1);
};

export default vuCode;
