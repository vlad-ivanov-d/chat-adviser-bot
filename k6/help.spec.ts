import { check, sleep } from "k6";
import http from "k6/http";
import * as fixtures from "test/fixtures/help";

import { K6_WEBHOOK_URL } from "./utils/constants";

/**
 * Test options
 */
export const options = {
  discardResponseBodies: true,
  scenarios: {
    help: { duration: "10s", exec: "help", executor: "constant-vus", vus: 50 },
  },
  thresholds: {
    checks: ["rate===1"], // 100% of successful checks
    http_req_duration: ["p(100)<300"], // 100% of requests should be below 300ms
  },
};

/**
 * It should answer to /help command in a supergroup chat
 */
export const help = (): void => {
  const res = http.post(K6_WEBHOOK_URL, JSON.stringify(fixtures.supergroupHelpWebhook));
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
