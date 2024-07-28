import { sleep } from "k6";
import http from "k6/http";

import * as fixtures from "fixtures/help";

import { K6_SLEEP_DURATION, K6_WEBHOOK_URL } from "./utils/constants";

/**
 * Test options
 */
export const options = {
  discardResponseBodies: true,
  scenarios: {
    help: { duration: "10s", exec: "help", executor: "constant-vus", vus: 50 },
  },
  thresholds: {
    http_req_duration: ["p(95)<350"], // 95% of requests should be below 350ms
    http_req_failed: ["rate===0"], // 0% of errors
  },
};

/**
 * It should answer to /help command in a supergroup chat
 */
export const help = (): void => {
  http.post(K6_WEBHOOK_URL, JSON.stringify(fixtures.supergroupHelpWebhook));
  sleep(K6_SLEEP_DURATION);
};
