export interface TimeZoneRenderSettingsOptions {
  /**
   * Id of the chat which is edited
   */
  chatId: number;
  /**
   * Answer callback query will be sent if true
   */
  shouldAnswerCallback?: boolean;
  /**
   * Skip time zone count
   */
  skip?: number;
}
