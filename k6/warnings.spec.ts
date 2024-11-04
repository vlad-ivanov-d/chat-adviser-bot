import { sleep } from "k6";
import http from "k6/http";

import * as fixtures from "fixtures/warnings";

import { K6_SLEEP_DURATION, K6_WEBHOOK_URL } from "./utils/constants";

/**
 * Test options
 */
export const options = {
  discardResponseBodies: true,
  scenarios: {
    warn: { duration: "10s", exec: "warn", executor: "constant-vus", vus: 50 },
  },
  thresholds: {
    http_req_duration: ["p(95)<500"], // 95% of requests should be below 500ms
    http_req_failed: ["rate===0"], // 0% of errors
  },
};

/**
 * It should issue a warning
 */
export const warn = (): void => {
  http.post(K6_WEBHOOK_URL, JSON.stringify(fixtures.warnWebhook));
  sleep(K6_SLEEP_DURATION);
};
