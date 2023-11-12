import { addingBots } from "features/addingBots";
import { cleanup } from "features/cleanup";
import { help } from "features/help";
import { language } from "features/language";
import { profanityFilter } from "features/profanityFilter";
import { settings, SettingsAction } from "features/settings";
import { timeZone } from "features/timeZone";
import { voteban, VotebanAction } from "features/voteban";
import { init } from "i18next";
import en from "languages/en.json";
import ru from "languages/ru.json";
import { callbackQuery, message } from "telegraf/filters";
import { prisma } from "utils/prisma";
import { bot } from "utils/telegraf";

// Init localization
export const defaultNs = "common";
void init({ defaultNS: defaultNs, fallbackLng: "en", interpolation: { escapeValue: false }, resources: { en, ru } });

// Bot commands
bot.command("mychats", async (ctx, next) => {
  await settings.command(ctx, "mychats");
  await next();
});
bot.help(async (ctx, next) => {
  await help.command(ctx, "help");
  await next();
});
bot.start(async (ctx, next) => {
  await help.command(ctx, "start");
  await next();
});

// Bot events
bot.on(callbackQuery("data"), async (ctx) => {
  const action = ctx.callbackQuery.data.split("?")[0];
  const params = new URLSearchParams(ctx.callbackQuery.data.split("?")[1] ?? "");
  const chatId = parseFloat(params.get("chatId") ?? "");
  const skip = params.get("skip") ? parseFloat(params.get("skip") ?? "0") : undefined;
  const value = params.get("v");
  const valueNum = parseFloat(value ?? "");
  switch (action) {
    case SettingsAction.ADDING_BOTS:
      return addingBots.renderSettings(ctx, chatId);
    case SettingsAction.ADDING_BOTS_SAVE:
      return addingBots.saveSettings(ctx, chatId, value);
    case SettingsAction.CHATS:
    case SettingsAction.REFRESH:
      return settings.renderChats(ctx, skip);
    case SettingsAction.FEATURES:
      return settings.renderFeatures(ctx, chatId, skip);
    case SettingsAction.LANGUAGE:
      return language.renderSettings(ctx, chatId);
    case SettingsAction.LANGUAGE_SAVE:
      return language.saveSettings(ctx, chatId, value);
    case SettingsAction.PROFANITY_FILTER:
      return profanityFilter.renderSettings(ctx, chatId);
    case SettingsAction.PROFANITY_FILTER_SAVE:
      return profanityFilter.saveSettings(ctx, chatId, value);
    case SettingsAction.TIME_ZONE:
      return timeZone.renderSettings(ctx, chatId, skip);
    case SettingsAction.TIME_ZONE_SAVE:
      return timeZone.saveSettings(ctx, chatId, value);
    case SettingsAction.VOTEBAN:
      return voteban.renderSettings(ctx, chatId, valueNum);
    case SettingsAction.VOTEBAN_SAVE:
      return voteban.saveSettings(ctx, chatId, valueNum);
    case VotebanAction.BAN:
    case VotebanAction.NO_BAN:
      return voteban.vote(ctx, action);
    default:
      return;
  }
});
bot.on(message(), async (ctx, next) => {
  const { message } = ctx.update;
  const isBotKicked = "left_chat_member" in message && message.left_chat_member.id === ctx.botInfo.id;
  const isProfanityRemoved = isBotKicked ? false : await profanityFilter.filter(ctx);
  if ("new_chat_members" in message || !isProfanityRemoved) {
    await next();
  }
});
bot.on(message("group_chat_created"), (ctx) => settings.promptSettings(ctx));
bot.on(message("left_chat_member"), async ({ botInfo, chat, update: { message } }) => {
  if (message.left_chat_member.id === botInfo.id) {
    await prisma.chat.deleteMany({ where: { id: chat.id } }); // Clean up database when bot is removed from the chat
  }
});
bot.on(message("new_chat_members"), async (ctx) => {
  await addingBots.validate(ctx);
  await settings.promptSettings(ctx);
});
bot.on(message("supergroup_chat_created"), (ctx) => settings.promptSettings(ctx));
bot.on(message("text"), (ctx) => voteban.command(ctx, "voteban"));

// Start bot
void bot.launch();

// Cron jobs
cleanup.startCronJob();

/**
 * Shuts down the bot and all related services
 * @param event Event name
 */
const shutdown = (event: NodeJS.Signals): void => {
  cleanup.stopCronJob();
  bot.stop(event);
  void prisma.$disconnect();
};

// Shutdown the bot when Node.js server is turned off
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
