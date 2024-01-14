/**
 * The message is considered stale after this number of milliseconds have passed.
 * It should also be taken into account that according to Telegram rules,
 * bots cannot delete messages older than 48 hours.
 */
export const OUTDATED_MESSAGE_TIMEOUT = 48 * 60 * 60 * 1000;
