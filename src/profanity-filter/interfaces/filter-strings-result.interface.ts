import type { ProfanityResult } from "src/utils/profanity";

export interface FilterStringsResult {
  /**
   * Filter result for title of the chat that sent the message originally
   */
  forwardChatTitle: ProfanityResult;
  /**
   * Filter result for name of the unknown user that sent the message originally
   */
  forwardSenderName: ProfanityResult;
  /**
   * Filter result for full name of the user that sent the message originally
   */
  forwardUserFullName: ProfanityResult;
  /**
   * Filter result for title of the chat that sent the message
   */
  senderChatTitle: ProfanityResult;
  /**
   * Filter result for username of the chat that sent the message
   */
  senderChatUsername: ProfanityResult;
  /**
   * Filter result for message text
   */
  text: ProfanityResult;
  /**
   * Filter result for full name of the user that sent the message
   */
  userFullName: ProfanityResult;
  /**
   * Filter result for name of the user that sent the message
   */
  username: ProfanityResult;
}
