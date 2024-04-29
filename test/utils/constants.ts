/**
 * The delay in milliseconds that is required to run asynchronous requests
 */
export const TEST_ASYNC_DELAY = 160;

/**
 * Telegram API base url for mocking API calls
 */
export const TEST_TELEGRAM_API_BASE_URL = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN ?? ""}`;

/**
 * Telegram webhook base url for API calls
 */
export const TEST_TELEGRAM_WEBHOOK_BASE_URL =
  "localhost" + (process.env.TELEGRAM_WEBHOOK_PORT ? `:${process.env.TELEGRAM_WEBHOOK_PORT}` : "");

/**
 * Telegram webhook path for API calls
 */
export const TEST_TELEGRAM_WEBHOOK_PATH = process.env.TELEGRAM_WEBHOOK_PATH ?? "/";
