import type { User } from "telegraf/typings/core/types/typegram";

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

/**
 * Mocks the second Telegram user
 * @param user Telegram user which will be merged with the default one
 * @returns Telegram user
 */
export const mockUser2 = (user?: Partial<User>): User =>
  mockUser({ first_name: "Jack", id: 2, last_name: "Green", username: "jack_green", ...user });
