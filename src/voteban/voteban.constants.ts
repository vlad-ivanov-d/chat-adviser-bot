/**
 * The voteban is considered expired after this number of milliseconds have passed (48 hours).
 */
export const EXPIRED_VOTEBAN_TIMEOUT = 48 * 60 * 60 * 1000;

/**
 * Delay between votings against the same message. In milliseconds.
 */
export const VOTEBAN_DELAY = 2 * 60 * 1000;
