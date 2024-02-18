import { type Chat, ChatType, LanguageCode, type Prisma, PrismaClient } from "@prisma/client";
import { NODE_ENV } from "src/app.constants";
import { getChatDisplayTitle } from "src/utils/telegraf";
import type { User } from "telegraf/typings/core/types/typegram";
import { privateChat, supergroup } from "test/fixtures/chats";
import * as userFixtures from "test/fixtures/users";

/**
 * Prisma client
 */
export const prisma = new PrismaClient();

/**
 * Cleanups database
 */
export const cleanupDb = async (): Promise<void> => {
  if (NODE_ENV === "test") {
    // Cleanup is allowed only in the test environment
    await prisma.$transaction([prisma.chat.deleteMany(), prisma.user.deleteMany()]);
    return;
  }
  throw new Error("Database cleanup is allowed only in test environment");
};

/**
 * Creates database private chat
 * @param chat Private chat which will be merged with the default one
 */
export const createDbPrivateChat = async (chat?: Partial<Chat>): Promise<void> => {
  await prisma.$transaction([
    createDbAdminUser(),
    prisma.chat.create({
      data: {
        authorId: chat?.authorId ?? userFixtures.adminUser.id,
        displayTitle: getChatDisplayTitle({
          ...privateChat,
          first_name: chat?.firstName ?? privateChat.first_name,
          last_name: typeof chat?.lastName === "undefined" ? privateChat.last_name : chat.lastName ?? undefined,
          username: typeof chat?.username === "undefined" ? privateChat.username : chat.username ?? undefined,
        }),
        editorId: chat?.editorId ?? userFixtures.adminUser.id,
        id: chat?.id ?? privateChat.id,
        language: LanguageCode.EN,
        membersCount: 2,
        timeZone: "UTC",
        username: typeof chat?.username === "undefined" ? privateChat.username : chat.username,
        ...chat,
        type: ChatType.PRIVATE,
      },
    }),
  ]);
};

/**
 * Creates database supergroup chat
 * @param chat Supergroup chat which will be merged with the default one
 */
export const createDbSupergroupChat = async (chat?: Partial<Chat>): Promise<void> => {
  await prisma.$transaction([
    createDbAdminUser(),
    prisma.chat.create({
      data: {
        admins: { connect: { id: userFixtures.adminUser.id } },
        authorId: userFixtures.adminUser.id,
        displayTitle: getChatDisplayTitle({
          ...supergroup,
          title: chat?.title ?? supergroup.title,
          username: typeof chat?.username === "undefined" ? supergroup.username : chat.username ?? undefined,
        }),
        editorId: userFixtures.adminUser.id,
        id: chat?.id ?? supergroup.id,
        language: LanguageCode.EN,
        membersCount: 2,
        timeZone: "UTC",
        title: chat?.title,
        username: typeof chat?.username === "undefined" ? supergroup.username : chat.username,
        ...chat,
        type: ChatType.SUPERGROUP,
      },
    }),
  ]);
};

/**
 * Creates database chat admin user
 * @param user Telegram user which will be merged with the default one
 * @returns Prisma user client
 */
export const createDbAdminUser = (user?: Partial<User>): Prisma.Prisma__UserClient<unknown> => {
  const userPayload: User = { ...userFixtures.adminUser, ...user };
  return prisma.user.create({
    data: { authorId: userPayload.id, editorId: userPayload.id, firstName: userPayload.first_name, id: userPayload.id },
  });
};

/**
 * Creates database chat user
 * @param user Telegram user which will be merged with the default one
 * @returns Prisma user client
 */
export const createDbUser = (user?: Partial<User>): Prisma.Prisma__UserClient<unknown> =>
  createDbAdminUser({ ...userFixtures.user, ...user });
