// Get env variables
import dotenv from "dotenv";
dotenv.config();

if (!process.env.BOT_TOKEN) {
  throw new Error("Required environment variable BOT_TOKEN is not defined");
}

/**
 * Telegram bot API token
 */
export const BOT_TOKEN = process.env.BOT_TOKEN;
