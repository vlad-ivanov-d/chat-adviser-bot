/**
 * The delay in milliseconds that is required to run asynchronous requests
 */
export const TEST_ASYNC_DELAY = 175;

/**
 * Telegram API base url for mocking API calls
 */
export const TEST_TG_API_BASE_URL = `https://api.telegram.org/bot${process.env.TG_TOKEN ?? ""}`;

/**
 * Telegram webhook base url for API calls
 */
export const TEST_TG_WEBHOOK_BASE_URL =
  "localhost" + (process.env.TG_WEBHOOK_PORT ? `:${process.env.TG_WEBHOOK_PORT}` : "");

/**
 * Telegram webhook path for API calls
 */
export const TEST_TG_WEBHOOK_PATH = process.env.TG_WEBHOOK_PATH ?? "/";
