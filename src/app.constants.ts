if (!process.env.BOT_TOKEN) {
  throw new Error("Required environment variable BOT_TOKEN is not defined");
}

/**
 * Telegram bot API token
 */
export const BOT_TOKEN = process.env.BOT_TOKEN;

/**
 * Date format related to date-fns
 */
export const DATE_FORMAT = "P p zzz";

/**
 * Node environment
 */
export const NODE_ENV = process.env.NODE_ENV;

/**
 * Page size
 */
export const PAGE_SIZE = 5;

/**
 * Telegram bot webhook domain if it's necessary to use webhooks
 */
export const WEBHOOK_DOMAIN = process.env.WEBHOOK_DOMAIN;

/**
 * Telegram bot webhook path if it's necessary to use with webhooks
 */
export const WEBHOOK_PATH = process.env.WEBHOOK_PATH;

/**
 * Telegram bot webhook port if it's necessary to use with webhooks
 */
export const WEBHOOK_PORT = process.env.WEBHOOK_PORT ? parseInt(process.env.WEBHOOK_PORT, 10) : undefined;
