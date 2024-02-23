/**
 * k6 test options
 */
export const options = {
  discardResponseBodies: true, // Discard response bodies to improve test performance
  duration: "10s",
  thresholds: {
    checks: ["rate===1"], // 100% of successful checks
    http_req_duration: ["p(100)<300"], // 100% of requests should be below 300ms
  },
  vus: 50,
};
