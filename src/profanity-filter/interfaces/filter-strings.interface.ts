export interface ForwardFilterStrings {
  /**
   * Title of the chat that sent the message originally
   */
  forwardChatTitle: string;
  /**
   * Name of the unknown user that sent the message originally
   */
  forwardSenderName: string;
  /**
   * Full name of the user that sent the message originally
   */
  forwardUserFullName: string;
}

export interface FilterStrings extends ForwardFilterStrings {
  /**
   * Title of the chat that sent the message
   */
  senderChatTitle: string;
  /**
   * Username of the chat that sent the message
   */
  senderChatUserName: string;
  /**
   * Message text
   */
  text: string;
  /**
   * Full name of the user that sent the message
   */
  userFullName: string;
  /**
   * Name of the user that sent the message
   */
  username: string;
}
