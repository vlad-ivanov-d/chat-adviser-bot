import { check, sleep } from "k6";
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
    checks: ["rate===1"], // 100% of successful checks
    http_req_duration: ["p(100)<300"], // 100% of requests should be below 300ms
  },
};

/**
 * It should issue a warning
 */
export const warn = (): void => {
  const res = http.post(K6_WEBHOOK_URL, JSON.stringify(fixtures.warnWebhook));
  check(res, {
    /**
     * Checks status code
     * @param r Response
     * @returns True if success
     */
    "is status 200": (r) => r.status === 200,
  });
  sleep(K6_SLEEP_DURATION);
};
