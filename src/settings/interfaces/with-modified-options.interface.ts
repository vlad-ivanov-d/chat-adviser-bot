import type { ChatSettingName } from "@prisma/client";

import type { UpsertedChat } from "src/prisma/interfaces/upserted-chat.interface";

export interface WithModifiedOptions {
  /**
   * Chat from which information should be obtained
   */
  chat: UpsertedChat;
  /**
   * Setting name which should be used to get modified information
   */
  settingName: ChatSettingName;
  /**
   * Time zone identifier
   */
  timeZone: string;
}
