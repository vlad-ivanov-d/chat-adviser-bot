import { type Chat, type ChatSettings, ChatType, LanguageCode, PrismaClient } from "@prisma/client";
import type { User } from "telegraf/typings/core/types/typegram";

import { privateChat, supergroup } from "fixtures/chats";
import { adminUser } from "fixtures/users";
import { getChatDisplayTitle } from "src/utils/telegraf";

/**
 * Prisma client
 */
export const prisma = new PrismaClient();

/**
 * Cleanups database
 */
export const cleanupDb = async (): Promise<void> => {
  if (process.env.NODE_ENV === "test") {
    // Cleanup is allowed only in the test environment
    await prisma.chatSettings.deleteMany();
    await prisma.profaneWord.deleteMany();
    await prisma.senderChat.deleteMany();
    await prisma.user.deleteMany();
    return;
  }
  throw new Error("Database cleanup is allowed only in test environment");
};

/**
 * Creates database private chat
 * @param chat Private chat which will be merged with the default one
 * @param settings Private chat settings which will be merged with the default one
 */
export const createDbPrivateChat = async (chat?: Partial<Chat>, settings?: Partial<ChatSettings>): Promise<void> => {
  await createDbUser(adminUser);
  await createDbPrivateChatSettings(settings);
  await prisma.chat.create({
    data: {
      authorId: chat?.authorId ?? adminUser.id,
      displayTitle: getChatDisplayTitle({
        ...privateChat,
        first_name: chat?.firstName ?? privateChat.first_name,
        last_name: typeof chat?.lastName === "undefined" ? privateChat.last_name : (chat.lastName ?? undefined),
        username: typeof chat?.username === "undefined" ? privateChat.username : (chat.username ?? undefined),
      }),
      editorId: chat?.editorId ?? adminUser.id,
      id: chat?.id ?? privateChat.id,
      membersCount: 2,
      settingsId: chat?.id ?? privateChat.id,
      username: typeof chat?.username === "undefined" ? privateChat.username : chat.username,
      ...chat,
      type: ChatType.PRIVATE,
    },
    select: { id: true },
  });
};

/**
 * Creates database private chat settings
 * @param settings Private chat settings which will be merged with the default one
 */
const createDbPrivateChatSettings = async (settings?: Partial<ChatSettings>): Promise<void> => {
  await prisma.chatSettings.create({
    data: {
      authorId: adminUser.id,
      editorId: adminUser.id,
      id: privateChat.id,
      language: LanguageCode.EN,
      timeZone: "UTC",
      ...settings,
    },
    select: { id: true },
  });
};

/**
 * Creates database supergroup chat
 * @param chat Supergroup chat which will be merged with the default one
 * @param settings Supergroup chat settings which will be merged with the default one
 */
export const createDbSupergroupChat = async (chat?: Partial<Chat>, settings?: Partial<ChatSettings>): Promise<void> => {
  await createDbUser(adminUser);
  await createDbSupergroupChatSettings(settings);
  await prisma.chat.create({
    data: {
      admins: { connect: { id: adminUser.id } },
      authorId: adminUser.id,
      displayTitle: getChatDisplayTitle({
        ...supergroup,
        title: chat?.title ?? supergroup.title,
        username: typeof chat?.username === "undefined" ? supergroup.username : (chat.username ?? undefined),
      }),
      editorId: adminUser.id,
      id: chat?.id ?? supergroup.id,
      membersCount: 2,
      settingsId: chat?.id ?? supergroup.id,
      title: chat?.title,
      username: typeof chat?.username === "undefined" ? supergroup.username : chat.username,
      ...chat,
      type: ChatType.SUPERGROUP,
    },
    select: { id: true },
  });
};

/**
 * Creates database supergroup chat settings
 * @param settings Supergroup chat settings which will be merged with the default one
 */
const createDbSupergroupChatSettings = async (settings?: Partial<ChatSettings>): Promise<void> => {
  await prisma.chatSettings.create({
    data: {
      authorId: adminUser.id,
      editorId: adminUser.id,
      id: supergroup.id,
      language: LanguageCode.EN,
      timeZone: "UTC",
      ...settings,
    },
    select: { id: true },
  });
};

/**
 * Creates database chat user
 * @param user Telegram user
 */
export const createDbUser = async (user: User): Promise<void> => {
  await prisma.user.create({
    data: {
      authorId: user.id,
      editorId: user.id,
      firstName: user.first_name,
      id: user.id,
      languageCode: user.language_code,
      lastName: user.last_name,
      username: user.username,
    },
    select: { id: true },
  });
};
