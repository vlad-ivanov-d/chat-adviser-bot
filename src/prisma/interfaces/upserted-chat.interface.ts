import type { Chat, ChatSettings, ChatSettingsHistory, User } from "@prisma/client";

export interface UpsertedChat extends Chat {
  /**
   * Chat admins. Doesn't include bots except current.
   */
  admins: User[];
  /**
   * Chat settings
   */
  settings: ChatSettings;
  /**
   * Chat settings history
   */
  settingsHistory: (ChatSettingsHistory & { editor: User })[];
}
