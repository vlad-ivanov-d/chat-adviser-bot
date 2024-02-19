export interface VotebanRenderSettingsOptions {
  /**
   * Id of the chat which is edited
   */
  chatId: number;
  /**
   * Answer callback query will be sent if true
   */
  shouldAnswerCallback?: boolean;
  /**
   * Voteban limit value
   */
  value?: number;
}
