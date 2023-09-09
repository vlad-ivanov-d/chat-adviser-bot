/**
 * Encodes text for Telegram HTML
 * @param text Text which should be encoded
 * @returns Encoded text
 */
export const encodeText = (text: string): string => text.replaceAll("<", "&lt;").replaceAll(">", "&gt;");
