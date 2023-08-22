import { PrismaClient } from "@prisma/client";
import addingBots from "features/addingBots";
import help from "features/help";
import language from "features/language";
import settings, { SettingsActions } from "features/settings";
import timeZone from "features/timeZone";
import voteban, { VotebanAction } from "features/voteban";
import { init } from "i18next";
import en from "languages/en.json";
import ru from "languages/ru.json";
import { callbackQuery, message } from "telegraf/filters";
import { bot } from "utils/bot";
import { upsertChat } from "utils/prisma";

// Init localization
export const defaultNS = "common";
void init({ defaultNS, fallbackLng: "en", interpolation: { escapeValue: false }, resources: { en, ru } });

// Init database client
export const prisma = new PrismaClient();

// Bot commands
bot.start((ctx) => help.command(ctx));
bot.help((ctx) => help.command(ctx));
bot.command("mychats", (ctx) => settings.command(ctx, "mychats"));
bot.command("voteban", (ctx) => voteban.command(ctx, "voteban"));

// Bot events
bot.on(callbackQuery("data"), async (ctx) => {
  const action = ctx.callbackQuery.data.split("?")[0];
  const params = new URLSearchParams(ctx.callbackQuery.data.split("?")[1] ?? "");
  const chatId = parseFloat(params.get("chatId") ?? "");
  const skip = parseFloat(params.get("skip") ?? "0");
  const value = params.get("v");
  const valueStr = value ?? "";
  const valueNum = parseFloat(valueStr);
  switch (action) {
    case SettingsActions.AddingBots:
      return addingBots.renderSettings(ctx, chatId);
    case SettingsActions.AddingBotsSave:
      return addingBots.saveSettings(ctx, chatId, value);
    case SettingsActions.Chats:
      return settings.renderChats(ctx, skip);
    case SettingsActions.Features:
      return settings.renderFeatures(ctx, chatId, skip);
    case SettingsActions.Language:
      return language.renderSettings(ctx, chatId);
    case SettingsActions.LanguageSave:
      return language.saveSettings(ctx, chatId, valueStr);
    case SettingsActions.TimeZone:
      return timeZone.renderSettings(ctx, chatId, skip);
    case SettingsActions.TimeZoneSave:
      return timeZone.saveSettings(ctx, chatId, valueStr);
    case SettingsActions.Voteban:
      return voteban.renderSettings(ctx, chatId, valueNum);
    case SettingsActions.VotebanSave:
      return voteban.saveSettings(ctx, chatId, valueNum);
    case VotebanAction.Ban:
      return voteban.vote(ctx, VotebanAction.Ban);
    case VotebanAction.NoBan:
      return voteban.vote(ctx, VotebanAction.NoBan);
  }
});
bot.on(message("group_chat_created"), (ctx) => upsertChat(ctx.chat, ctx.update.message.from));
bot.on(message("new_chat_members"), async (ctx) => {
  if (ctx.update.message.new_chat_members.some((m) => m.id === ctx.botInfo.id))
    return upsertChat(ctx.chat, ctx.update.message.from); // The bot itself was added, upsert chat admins and return.
  await addingBots.validate(ctx);
});
bot.on(message("supergroup_chat_created"), (ctx) => upsertChat(ctx.chat, ctx.update.message.from));
bot.on(message("text"), (ctx) => voteban.command(ctx, "voteban"));

// Start bot
void bot.launch();

// Cron jobs
const votebanCronJob = voteban.cronJob();

/**
 * Shuts down the bot and all related services
 * @param event Event name
 */
const shutdown = (event: NodeJS.Signals): void => {
  votebanCronJob.stop();
  bot.stop(event);
  void prisma.$disconnect();
};

// Shutdown the bot when Node.js server is turned off
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
