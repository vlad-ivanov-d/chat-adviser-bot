import { supergroup } from "fixtures/chats";
import { adminUser, bot } from "fixtures/users";
import type { TextMessageCtx } from "src/types/telegraf-context";

/**
 * Mocks text message context partially
 * @param ctx Partial text message context which will be merged with the original one
 * @returns Mocked text message context
 */
export const mockTextMessageCtx = (ctx?: Partial<TextMessageCtx>): TextMessageCtx =>
  // Allow assertions to do not mock the whole object
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  ({
    botInfo: bot,
    chat: supergroup,
    message: { chat: supergroup, date: Date.now(), from: adminUser, message_id: 1, text: "" },
    reply: jest.fn(),
    ...ctx,
  }) as unknown as TextMessageCtx;
