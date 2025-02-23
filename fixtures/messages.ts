import { MessageType } from "@prisma/client";

import { supergroup } from "./chats";
import { adminUser } from "./users";

/**
 * Old saved database message
 */
export const oldSavedMessage = {
  authorId: adminUser.id,
  chatId: supergroup.id,
  createdAt: new Date("2000-01-01T00:00:00.000Z"),
  editorId: adminUser.id,
  mediaGroupId: "100",
  messageId: 1,
  type: MessageType.PHOTO,
};

/**
 * Saved message #1 in database
 */
export const savedMessage1 = {
  authorId: adminUser.id,
  chatId: supergroup.id,
  editorId: adminUser.id,
  mediaGroupId: "100",
  messageId: 1,
};

/**
 * Saved message #2 in database
 */
export const savedMessage2 = {
  authorId: adminUser.id,
  chatId: supergroup.id,
  editorId: adminUser.id,
  mediaGroupId: "100",
  messageId: 2,
};

/**
 * Webhook payload which contains message #1 with media group
 */
export const supergroupMessage1Webhook = {
  message: {
    caption: "Hello",
    chat: supergroup,
    date: Date.now(),
    from: adminUser,
    media_group_id: "100",
    message_id: 1,
    photo: [
      {
        file_id: "AgACAgIAAx0CdbcJTAACEGZlo_bGLDBUAAEO9K_PJRmEmyE4iqIAAgfWMRuPMiBJmNjNbbTtV4cBAAMCAANzAAM0BA",
        file_size: 2007,
        file_unique_id: "AQADB9YxG48yIEl4",
        height: 90,
        width: 90,
      },
      {
        file_id: "AgACAgIAAx0CdbcJTAACEGZlo_bGLDBUAAEO9K_PJRmEmyE4iqIAAgfWMRuPMiBJmNjNbbTtV4cBAAMCAANtAAM0BA",
        file_size: 25954,
        file_unique_id: "AQADB9YxG48yIEly",
        height: 320,
        width: 320,
      },
      {
        file_id: "AgACAgIAAx0CdbcJTAACEGZlo_bGLDBUAAEO9K_PJRmEmyE4iqIAAgfWMRuPMiBJmNjNbbTtV4cBAAMCAAN4AAM0BA",
        file_size: 99406,
        file_unique_id: "AQADB9YxG48yIEl9",
        height: 800,
        width: 800,
      },
      {
        file_id: "AgACAgIAAx0CdbcJTAACEGZlo_bGLDBUAAEO9K_PJRmEmyE4iqIAAgfWMRuPMiBJmNjNbbTtV4cBAAMCAAN5AAM0BA",
        file_size: 146396,
        file_unique_id: "AQADB9YxG48yIEl-",
        height: 1280,
        width: 1280,
      },
    ],
  },
  update_id: 1,
};

/**
 * Webhook payload which contains message #2 with media group
 */
export const supergroupMessage2Webhook = {
  message: {
    chat: supergroup,
    date: Date.now(),
    from: adminUser,
    media_group_id: "100",
    message_id: 2,
    photo: [
      {
        file_id: "AgACAgIAAx0CdbcJTAACEGdlo_bGA1uPFpRrVKhe4dgAAdLJdbIAAgfWMRuPMiBJmNjNbbTtV4cBAAMCAANzAAM0BA",
        file_size: 2007,
        file_unique_id: "AQADB9YxG48yIEl4",
        height: 90,
        width: 90,
      },
      {
        file_id: "AgACAgIAAx0CdbcJTAACEGdlo_bGA1uPFpRrVKhe4dgAAdLJdbIAAgfWMRuPMiBJmNjNbbTtV4cBAAMCAANtAAM0BA",
        file_size: 25954,
        file_unique_id: "AQADB9YxG48yIEly",
        height: 320,
        width: 320,
      },
      {
        file_id: "AgACAgIAAx0CdbcJTAACEGdlo_bGA1uPFpRrVKhe4dgAAdLJdbIAAgfWMRuPMiBJmNjNbbTtV4cBAAMCAAN4AAM0BA",
        file_size: 99406,
        file_unique_id: "AQADB9YxG48yIEl9",
        height: 800,
        width: 800,
      },
      {
        file_id: "AgACAgIAAx0CdbcJTAACEGdlo_bGA1uPFpRrVKhe4dgAAdLJdbIAAgfWMRuPMiBJmNjNbbTtV4cBAAMCAAN5AAM0BA",
        file_size: 146396,
        file_unique_id: "AQADB9YxG48yIEl-",
        height: 1280,
        width: 1280,
      },
    ],
  },
  update_id: 2,
};
