/**
 * Suspend VU execution for the specified duration, in seconds.
 */
export const K6_SLEEP_DURATION = 1;

/**
 * Telegram webhook url for API calls
 */
// Use http for tests
// eslint-disable-next-line sonarjs/no-clear-text-protocols
export const K6_WEBHOOK_URL = "http://host.docker.internal:3002/chat-adviser-bot";
