import type { User } from "telegraf/typings/core/types/typegram";

/**
 * Mocks chat admin Telegram user
 * @param user Telegram user which will be merged with the default one
 * @returns Telegram user
 */
export const mockAdminUser = (user?: Partial<User>): User => ({
  first_name: "John",
  id: 1,
  is_bot: false,
  language_code: "en",
  last_name: "Doe",
  username: "john_doe",
  ...user,
});

/**
 * Mocks Telegram user
 * @param user Telegram user which will be merged with the default one
 * @returns Telegram user
 */
export const mockUser = (user?: Partial<User>): User =>
  mockAdminUser({ first_name: "Jack", id: 2, last_name: "Green", username: "jack_green", ...user });
