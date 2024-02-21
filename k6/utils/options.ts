/**
 * k6 test options
 */
export const options = {
  duration: "15s",
  thresholds: {
    checks: ["rate===1"], // 100% of successful checks
    http_req_duration: ["p(100)<200"], // 100% of requests should be below 200ms
  },
  vus: 50,
};
