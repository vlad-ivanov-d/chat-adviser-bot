import dotenv from "dotenv";
import { Telegraf } from "telegraf";

// Get env variables
dotenv.config();
if (!process.env.BOT_TOKEN) throw Error("Required environment variable BOT_TOKEN is not provided");

// Init bot
export const bot = new Telegraf(process.env.BOT_TOKEN);
