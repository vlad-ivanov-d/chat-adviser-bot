/**
 * Maximum number of hours to summarize
 */
export const MAX_HOURS_COUNT = 48;

/**
 * Maximum number of messages to summarize
 */
export const MAX_MESSAGES_COUNT = 500;

/**
 * Minimum number of hours to summarize
 */
export const MIN_HOURS_COUNT = 1;

/**
 * Minimum number of messages to summarize
 */
export const MIN_MESSAGES_COUNT = 15;

/**
 * Admin summary request cannot be executed more than 4 times per 24 hours
 */
export const SUMMARY_ADMIN_REQUESTS_MAX_COUNT = 4;

/**
 * Summary request cannot be executed more than every 1 minute
 */
export const SUMMARY_COMMON_TIMEOUT = 1 * 60 * 1000;

/**
 * User summary request cannot be executed more than once every 6 hours
 */
export const SUMMARY_USER_TIMEOUT = 6 * 60 * 60 * 1000;
