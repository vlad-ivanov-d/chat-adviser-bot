import { Chat, ChatType, LanguageCode, PrismaClient } from "@prisma/client";
import { User } from "telegraf/typings/core/types/typegram";
import { NODE_ENV } from "utils/envs";
import { getChatDisplayTitle } from "utils/telegraf";

import { mockPrivateChat, mockSupergroupChat } from "./mockChat";
import { mockUser } from "./mockUser";

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
    await prisma.chat.deleteMany();
    await prisma.user.deleteMany();
  }
};

/**
 * Creates database private chat
 * @param chat Private chat which will be merged with the default one
 */
export const createDbPrivateChat = async (chat?: Partial<Chat>): Promise<void> => {
  await createDbUser();
  await prisma.chat.create({
    data: {
      authorId: chat?.authorId ?? mockUser().id,
      displayTitle: getChatDisplayTitle({
        ...mockPrivateChat(),
        first_name: chat?.firstName ?? mockPrivateChat().first_name,
        last_name: typeof chat?.lastName === "undefined" ? mockPrivateChat().last_name : chat.lastName ?? undefined,
        username: typeof chat?.username === "undefined" ? mockPrivateChat().username : chat.username ?? undefined,
      }),
      editorId: chat?.editorId ?? mockUser().id,
      id: chat?.id ?? mockPrivateChat().id,
      language: LanguageCode.EN,
      membersCount: 2,
      timeZone: "UTC",
      username: typeof chat?.username === "undefined" ? mockPrivateChat().username : chat.username,
      ...chat,
      type: ChatType.PRIVATE,
    },
  });
};

/**
 * Creates database supergroup chat
 * @param chat Supergroup chat which will be merged with the default one
 */
export const createDbSupergroupChat = async (chat?: Partial<Chat>): Promise<void> => {
  await createDbUser();
  await prisma.chat.create({
    data: {
      admins: { connect: { id: mockUser().id } },
      authorId: mockUser().id,
      displayTitle: getChatDisplayTitle({
        ...mockSupergroupChat(),
        title: chat?.title ?? mockSupergroupChat().title,
        username: typeof chat?.username === "undefined" ? mockSupergroupChat().username : chat.username ?? undefined,
      }),
      editorId: mockUser().id,
      id: chat?.id ?? mockSupergroupChat().id,
      language: LanguageCode.EN,
      membersCount: 2,
      timeZone: "UTC",
      title: chat?.title,
      username: typeof chat?.username === "undefined" ? mockSupergroupChat().username : chat.username,
      ...chat,
      type: ChatType.SUPERGROUP,
    },
  });
};

/**
 * Creates database user
 * @param user Telegram user which will be merged with the default one
 */
export const createDbUser = async (user?: Partial<User>): Promise<void> => {
  const userPayload: User = { ...mockUser(), ...user };
  await prisma.user.create({
    data: { authorId: userPayload.id, editorId: userPayload.id, firstName: userPayload.first_name, id: userPayload.id },
  });
};
