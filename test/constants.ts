import { BOT_TOKEN, WEBHOOK_PATH } from "src/app.constants";

/**
 * The delay in milliseconds that is required to execute asynchronous cron jobs
 */
export const DELAY_ASYNC_TIMER_CHECK = 50;

/**
 * Telegram API base url for mocking API calls
 */
export const TELEGRAM_BOT_API_BASE_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

/**
 * Telegram webhook base url for API calls
 */
export const TEST_WEBHOOK_BASE_URL = "";

/**
 * Telegram webhook path for API calls
 */
export const TEST_WEBHOOK_PATH = WEBHOOK_PATH ?? "/";
