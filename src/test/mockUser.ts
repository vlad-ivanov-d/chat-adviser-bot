import { User } from "telegraf/typings/core/types/typegram";

/**
 * Mocks Telegram user
 * @param user Telegram user which will be merged with the default one
 * @returns Telegram user
 */
export const mockUser = (user?: Partial<User>): User => ({
  first_name: "John",
  id: 1,
  is_bot: false,
  language_code: "en",
  last_name: "Doe",
  username: "john_doe",
  ...user,
});
