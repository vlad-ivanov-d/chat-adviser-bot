import type { Chat, ChatSettingsHistory, User } from "@prisma/client";

export interface UpsertedChat extends Chat {
  /**
   * Chat admins. Doesn't include bots except current.
   */
  admins: User[];
  /**
   * Chat settings history
   */
  chatSettingsHistory: (ChatSettingsHistory & { editor: User })[];
}
