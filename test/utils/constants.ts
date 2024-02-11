import { BOT_TOKEN, WEBHOOK_PATH, WEBHOOK_PORT } from "src/app.constants";

/**
 * The delay in milliseconds that is required to run asynchronous requests
 */
export const ASYNC_REQUEST_DELAY = 75;

/**
 * Telegram API base url for mocking API calls
 */
export const TELEGRAM_API_BASE_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

/**
 * Telegram webhook base url for API calls
 */
export const TEST_WEBHOOK_BASE_URL = `localhost:${WEBHOOK_PORT}`;

/**
 * Telegram webhook path for API calls
 */
export const TEST_WEBHOOK_PATH = WEBHOOK_PATH ?? "/";
