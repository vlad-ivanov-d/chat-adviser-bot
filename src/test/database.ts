import { ChatType, LanguageCode, PrismaClient } from "@prisma/client";
import { Chat, User } from "telegraf/typings/core/types/typegram";
import { NODE_ENV } from "utils/envs";
import { getChatDisplayTitle } from "utils/telegraf";

import { mockPrivateChat } from "./mockChat";
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
 * @param chat Telegram private chat which will be merged with the default one
 */
export const createDbPrivateChat = async (chat?: Partial<Chat.PrivateChat>): Promise<void> => {
  await createDbUser();
  const chatPayload: Chat.PrivateChat = { ...mockPrivateChat(), ...chat };
  await prisma.chat.create({
    data: {
      authorId: mockUser().id,
      displayTitle: getChatDisplayTitle(chatPayload),
      editorId: mockUser().id,
      id: chatPayload.id,
      language: LanguageCode.EN,
      membersCount: 2,
      timeZone: "UTC",
      type: ChatType.PRIVATE,
      username: chatPayload.username,
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
