/**
 * The message that received the warning will be deleted after this number of milliseconds (10 seconds).
 */
export const DELETE_MESSAGE_DELAY = 10_000;

/**
 * The warning is considered stale after this number of milliseconds have passed (90 days).
 */
export const OUTDATED_WARNING_TIMEOUT = 90 * 24 * 60 * 60 * 1000;

/**
 * Number of warnings before action is taken.
 */
export const WARNINGS_LIMIT = 3;
