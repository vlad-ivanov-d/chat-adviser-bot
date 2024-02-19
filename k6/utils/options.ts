/**
 * k6 test options
 */
export const options = {
  duration: "15s",
  thresholds: {
    http_req_duration: ["p(100)<300"], // 100% of requests should be below 300ms
  },
  vus: 50,
};
