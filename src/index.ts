import { addingBots } from "features/addingBots";
import { help } from "features/help";
import { language } from "features/language";
import { settings, SettingsAction } from "features/settings";
import { timeZone } from "features/timeZone";
import { voteban, VotebanAction } from "features/voteban";
import { init } from "i18next";
import en from "languages/en.json";
import ru from "languages/ru.json";
import { callbackQuery, message } from "telegraf/filters";
import { prisma, upsertPrismaChat } from "utils/prisma";
import { bot } from "utils/telegraf";

// Init localization
export const defaultNs = "common";
void init({ defaultNS: defaultNs, fallbackLng: "en", interpolation: { escapeValue: false }, resources: { en, ru } });

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
    case SettingsAction.AddingBots:
      return addingBots.renderSettings(ctx, chatId);
    case SettingsAction.AddingBotsSave:
      return addingBots.saveSettings(ctx, chatId, value);
    case SettingsAction.Chats:
      return settings.renderChats(ctx, skip);
    case SettingsAction.Features:
      return settings.renderFeatures(ctx, chatId, skip);
    case SettingsAction.Language:
      return language.renderSettings(ctx, chatId);
    case SettingsAction.LanguageSave:
      return language.saveSettings(ctx, chatId, valueStr);
    case SettingsAction.TimeZone:
      return timeZone.renderSettings(ctx, chatId, skip);
    case SettingsAction.TimeZoneSave:
      return timeZone.saveSettings(ctx, chatId, valueStr);
    case SettingsAction.Voteban:
      return voteban.renderSettings(ctx, chatId, valueNum);
    case SettingsAction.VotebanSave:
      return voteban.saveSettings(ctx, chatId, valueNum);
    case VotebanAction.Ban:
    case VotebanAction.NoBan:
      return voteban.vote(ctx, action);
    default:
      return;
  }
});
bot.on(message("group_chat_created"), (ctx) => upsertPrismaChat(ctx.chat, ctx.update.message.from));
bot.on(message("left_chat_member"), async ({ botInfo, chat, update }) => {
  if (update.message.left_chat_member.id === botInfo.id) {
    await prisma.chat.deleteMany({ where: { id: chat.id } }); // Clean up database when bot is removed from the chat
  }
});
bot.on(message("new_chat_members"), async (ctx) => {
  if (ctx.update.message.new_chat_members.some((m) => m.id === ctx.botInfo.id)) {
    return upsertPrismaChat(ctx.chat, ctx.update.message.from); // The bot itself was added, upsert chat admins and return.
  }
  await addingBots.validate(ctx);
});
bot.on(message("supergroup_chat_created"), (ctx) => upsertPrismaChat(ctx.chat, ctx.update.message.from));
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
