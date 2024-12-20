import { formatInTimeZone } from "date-fns-tz";

import { DATE_FORMAT } from "src/app.constants";
import { SettingsAction } from "src/settings/interfaces/action.interface";
import { VotebanAction } from "src/voteban/interfaces/action.interface";

import { channel, privateChat, supergroup } from "./chats";
import { adminUser, bot, systemChannelBot, user } from "./users";

const backToFeaturesText = "« Back to features";
const noBanButtonText = "Keep (0/2)";

/**
 * Webhook response which contains answer callback query method.
 * It should be sent as a result of callback vote processing if the vote is not from a chat member.
 */
export const answerCbNotChatMemberWebhookResponse = {
  callback_query_id: "1",
  method: "answerCallbackQuery",
  show_alert: true,
  text: "You must be a member of the chat",
};

/**
 * Webhook response which contains answer callback query method.
 * It should be sent as a result of callback vote processing when the bot is not an admin.
 */
export const answerCbVoteBotNotAdminWebhookResponse = {
  callback_query_id: "1",
  method: "answerCallbackQuery",
  show_alert: true,
  text: "I need administrator permissions for this feature to work.",
};

/**
 * Webhook response which contains answer callback query method.
 * It should be sent as a result of callback vote processing if the vote is duplicated.
 */
export const answerCbVoteDuplicatedWebhookResponse = {
  callback_query_id: "1",
  method: "answerCallbackQuery",
  show_alert: true,
  text: "You have already voted",
};

/**
 * Webhook response which contains answer callback query method.
 * It should be sent as a result of callback vote processing if the voting has expired.
 */
export const answerCbVoteExpiredWebhookResponse = {
  callback_query_id: "1",
  method: "answerCallbackQuery",
  show_alert: true,
  text: "Voting has expired",
};

/**
 * Webhook response which contains answer callback query method.
 * It should be sent as a result of callback vote processing.
 */
export const answerCbVoteWebhookResponse = {
  callback_query_id: "1",
  method: "answerCallbackQuery",
  text: "Your vote has been counted",
};

/**
 * Webhook payload which contains ban callback against the admin
 */
export const cbBanAgainstAdminWebhook = {
  callback_query: {
    chat_instance: "1",
    data: VotebanAction.BAN,
    from: user,
    id: "1",
    message: {
      chat: supergroup,
      date: Date.now(),
      from: bot,
      message_id: 3,
      message_thread_id: 1,
      reply_to_message: { chat: supergroup, date: Date.now(), from: adminUser, message_id: 1, text: "Bad word" },
      text: "",
    },
  },
  update_id: 1,
};

/**
 * Payload for edit message text request. It should be sent as a result of ban callback.
 */
export const cbBanEditMessageTextPayload = {
  chat_id: supergroup.id,
  message_id: 3,
  parse_mode: "HTML",
  text:
    `<a href="tg:user?id=${adminUser.id.toString()}">@${adminUser.username ?? ""}</a> offers to ban ` +
    `<a href="tg:user?id=${user.id.toString()}">@${user.username ?? ""}</a>. This requires 2 votes.\n\n` +
    `Do you want to ban <a href="tg:user?id=${user.id.toString()}">@${user.username ?? ""}</a>?` +
    "\n\n- - -\n\nDecided: <b>ban</b>.\n\n" +
    `Voted for ban: <a href="tg:user?id=${user.id.toString()}">@${user.username ?? ""}</a>, ` +
    `<a href="tg:user?id=${adminUser.id.toString()}">@${adminUser.username ?? ""}</a>.`,
};

/**
 * Payload for edit message text request. It should be sent as a result of ban sender chat callback.
 */
export const cbBanSenderChatEditMessageTextPayload = {
  chat_id: supergroup.id,
  message_id: 4,
  parse_mode: "HTML",
  text:
    `<a href="tg:user?id=${adminUser.id.toString()}">@${adminUser.username ?? ""}</a> offers to ban ` +
    `@${channel.username ?? ""}. This requires 45 votes.\n\nDo you want to ban @${channel.username ?? ""}?` +
    "\n\n- - -\n\nDecided: <b>ban</b>.\n\nVoted for ban: " +
    Array.from(Array(39))
      .map((v, i) => `<a href="tg:user?id=${(i + 1000).toString()}">@${user.username ?? ""}${i.toString()}</a>`)
      .join(", ") +
    " and others.",
};

/**
 * Webhook payload which contains ban callback
 */
export const cbBanWebhook = {
  callback_query: {
    chat_instance: "1",
    data: VotebanAction.BAN,
    from: adminUser,
    id: "1",
    message: {
      chat: supergroup,
      date: Date.now(),
      from: bot,
      message_id: 3,
      message_thread_id: 1,
      reply_to_message: { chat: supergroup, date: Date.now(), from: user, message_id: 1, text: "Bad word" },
      text: "",
    },
  },
  update_id: 1,
};

/**
 * Webhook payload which contains ban sender chat callback
 */
export const cbBanSenderChatWebhook = {
  callback_query: {
    chat_instance: "1",
    data: VotebanAction.BAN,
    from: adminUser,
    id: "1",
    message: {
      chat: supergroup,
      date: Date.now(),
      from: bot,
      message_id: 4,
      message_thread_id: 1,
      reply_to_message: {
        chat: supergroup,
        date: Date.now(),
        from: systemChannelBot,
        message_id: 1,
        sender_chat: channel,
        text: "Bad word",
      },
      text: "",
    },
  },
  update_id: 1,
};

/**
 * Payload for edit message text request. It should be sent as a result of ban callback
 * if the voting is canceled due to the voting against the admin.
 */
export const cbCancelledAgainstAdminEditMessageTextPayload = {
  chat_id: supergroup.id,
  message_id: 3,
  parse_mode: "HTML",
  text:
    `<a href="tg:user?id=${user.id.toString()}">@${user.username ?? ""}</a> offers to ban ` +
    `<a href="tg:user?id=${adminUser.id.toString()}">@${adminUser.username ?? ""}</a>. This requires 2 votes.\n\n` +
    `Do you want to ban <a href="tg:user?id=${adminUser.id.toString()}">@${adminUser.username ?? ""}</a>?\n\n` +
    "<b>Voting has been cancelled.</b> It is not possible to vote against an administrator.",
};

/**
 * Payload for edit message text request. It should be sent as a result of no ban callback
 * if the voting is canceled due to the bot not having admin permissions.
 */
export const cbCancelledBotNotAdminEditMessageTextPayload = {
  chat_id: supergroup.id,
  message_id: 3,
  parse_mode: "HTML",
  text:
    `<a href="tg:user?id=${adminUser.id.toString()}">@${adminUser.username ?? ""}</a> offers to ban ` +
    `<a href="tg:user?id=${user.id.toString()}">@${user.username ?? ""}</a>. This requires 2 votes.\n\n` +
    `Do you want to ban <a href="tg:user?id=${user.id.toString()}">@${user.username ?? ""}</a>?\n\n` +
    "<b>Voting has been cancelled.</b> I need administrator permissions for this feature to work.",
};

/**
 * Payload for edit message text request. It should be sent as a result of no ban callback if the voting is cancelled.
 */
export const cbCancelledEditMessageTextPayload = {
  chat_id: supergroup.id,
  message_id: 3,
  parse_mode: "HTML",
  text:
    `<a href="tg:user?id=${adminUser.id.toString()}">@${adminUser.username ?? ""}</a> offers to ban ` +
    `<a href="tg:user?id=${user.id.toString()}">@${user.username ?? ""}</a>.\n\nDo you want to ban ` +
    `<a href="tg:user?id=${user.id.toString()}">@${user.username ?? ""}</a>?\n\n<b>Voting has been cancelled.</b> ` +
    "Ban Voting feature is disabled.",
};

/**
 * Payload for edit message text request. It should be sent as a result of no ban callback.
 */
export const cbNoBanEditMessageTextPayload = {
  chat_id: supergroup.id,
  message_id: 3,
  parse_mode: "HTML",
  reply_markup: {
    inline_keyboard: [
      [{ callback_data: VotebanAction.BAN, text: "Ban (0/2)" }],
      [{ callback_data: VotebanAction.NO_BAN, text: "Keep (1/2)" }],
    ],
  },
  text:
    `<a href="tg:user?id=${adminUser.id.toString()}">@${adminUser.username ?? ""}</a> offers to ban ` +
    `<a href="tg:user?id=${user.id.toString()}">@${user.username ?? ""}</a>. This requires 2 votes.\n\n` +
    `Do you want to ban <a href="tg:user?id=${user.id.toString()}">@${user.username ?? ""}</a>?`,
};

/**
 * Webhook payload which contains no ban callback
 */
export const cbNoBanWebhook = {
  callback_query: {
    chat_instance: "1",
    data: VotebanAction.NO_BAN,
    from: adminUser,
    id: "1",
    message: {
      chat: supergroup,
      date: Date.now(),
      from: bot,
      message_id: 3,
      message_thread_id: 1,
      reply_to_message: { chat: supergroup, date: Date.now(), from: user, message_id: 1, text: "Bad word" },
      text: "",
    },
  },
  update_id: 1,
};

/**
 * Payload for edit message text request. It should be sent as a result of save settings callback.
 * This should be implemented via function to prevent issues related to dates.
 * @returns Payload
 */
export const cbSaveSettingsEditMessageTextPayload = (): unknown => ({
  chat_id: privateChat.id,
  message_id: 1,
  parse_mode: "HTML",
  reply_markup: {
    inline_keyboard: [
      [
        { callback_data: `${VotebanAction.SETTINGS}?cId=${supergroup.id.toString()}&v=2`, text: "-1" },
        { callback_data: `${VotebanAction.SETTINGS}?cId=${supergroup.id.toString()}&v=4`, text: "+1" },
      ],
      [
        { callback_data: `${VotebanAction.SETTINGS}?cId=${supergroup.id.toString()}&v=-47`, text: "-50" },
        { callback_data: `${VotebanAction.SETTINGS}?cId=${supergroup.id.toString()}&v=53`, text: "+50" },
      ],
      [{ callback_data: `${VotebanAction.SAVE}?cId=${supergroup.id.toString()}&v=3`, text: "Save" }],
      [{ callback_data: `${SettingsAction.FEATURES}?cId=${supergroup.id.toString()}`, text: backToFeaturesText }],
    ],
  },
  text:
    "<b>Ban Voting</b>\nI can run votes to ban a user in a chat. The user will be banned and their message deleted " +
    "if the appropriate number of votes is reached. This feature will help users ban the violator when " +
    "administrators are offline. Messages sent more than 48 hours ago won't be deleted according to Telegram rules.\n" +
    "\n/voteban - start voting (can be used without the slash)\n\n<b>Tip:</b> Don't set your vote limit too low. " +
    "Otherwise, a user who has several accounts will be able to single-handedly collect the required number of votes " +
    "and ban other chat members.\n\n- - -\n\n" +
    `Set the vote limit for making a decision in @${supergroup.username ?? ""} chat. ` +
    "If set a value less than 2, the feature will be disabled.\n\nCurrent value: <b>3</b>\n" +
    `Modified at ${formatInTimeZone(Date.now(), "UTC", DATE_FORMAT)} ` +
    `by <a href="tg:user?id=${adminUser.id.toString()}">@${adminUser.username ?? ""}</a>`,
});

/**
 * Webhook payload which contains save settings callback with incorrect chat id
 */
export const cbSaveSettingsErrorWebhook = {
  callback_query: {
    chat_instance: "1",
    data: `${VotebanAction.SAVE}?cId=error_id&v=2`,
    from: adminUser,
    id: "1",
    message: { chat: privateChat, date: Date.now(), edit_date: Date.now(), from: bot, message_id: 1, text: "" },
  },
  update_id: 1,
};

/**
 * Webhook payload which contains save settings callback
 */
export const cbSaveSettingsWebhook = {
  callback_query: {
    chat_instance: "1",
    data: `${VotebanAction.SAVE}?cId=${supergroup.id.toString()}&v=3`,
    from: adminUser,
    id: "1",
    message: { chat: privateChat, date: Date.now(), edit_date: Date.now(), from: bot, message_id: 1, text: "" },
  },
  update_id: 1,
};

/**
 * Webhook payload which contains settings callback with incorrect chat id
 */
export const cbSettingsErrorWebhook = {
  callback_query: {
    chat_instance: "1",
    data: `${VotebanAction.SETTINGS}?cId=error_id`,
    from: adminUser,
    id: "1",
    message: { chat: privateChat, date: Date.now(), edit_date: Date.now(), from: bot, message_id: 1, text: "" },
  },
  update_id: 1,
};

/**
 * Payload for edit message text request. It should be sent as a result of settings callback.
 */
export const cbSettingsEditMessageTextPayload = {
  chat_id: privateChat.id,
  message_id: 1,
  parse_mode: "HTML",
  reply_markup: {
    inline_keyboard: [
      [
        { callback_data: `${VotebanAction.SETTINGS}?cId=${supergroup.id.toString()}&v=-1`, text: "-1" },
        { callback_data: `${VotebanAction.SETTINGS}?cId=${supergroup.id.toString()}&v=2`, text: "+1" },
      ],
      [
        { callback_data: `${VotebanAction.SETTINGS}?cId=${supergroup.id.toString()}&v=-50`, text: "-50" },
        { callback_data: `${VotebanAction.SETTINGS}?cId=${supergroup.id.toString()}&v=50`, text: "+50" },
      ],
      [{ callback_data: `${VotebanAction.SAVE}?cId=${supergroup.id.toString()}&v=0`, text: "Save" }],
      [{ callback_data: `${SettingsAction.FEATURES}?cId=${supergroup.id.toString()}`, text: backToFeaturesText }],
    ],
  },
  text:
    "<b>Ban Voting</b>\nI can run votes to ban a user in a chat. The user will be banned and their " +
    "message deleted if the appropriate number of votes is reached. This feature will help users ban the violator " +
    "when administrators are offline. Messages sent more than 48 hours ago won't be deleted according to " +
    "Telegram rules.\n\n/voteban - start voting (can be used without the slash)\n\n<b>Tip:</b> " +
    "Don't set your vote limit too low. Otherwise, a user who has several accounts will be able to single-handedly " +
    "collect the required number of votes and ban other chat members.\n\n- - -\n\nSet the vote limit for making a " +
    `decision in @${supergroup.username ?? ""} chat. If set a value less than 2, the feature will be disabled.\n\n` +
    "Current state: <b>disabled</b>",
};

/**
 * Webhook payload which contains settings callback
 */
export const cbSettingsWebhook = {
  callback_query: {
    chat_instance: "1",
    data: `${VotebanAction.SETTINGS}?cId=${supergroup.id.toString()}`,
    from: adminUser,
    id: "1",
    message: { chat: privateChat, date: Date.now(), edit_date: Date.now(), from: bot, message_id: 1, text: "" },
  },
  update_id: 1,
};

/**
 * Webhook payload which contains unsaved settings callback
 */
export const cbUnsavedSettingsWebhook = {
  callback_query: {
    chat_instance: "1",
    data: `${VotebanAction.SETTINGS}?cId=${supergroup.id.toString()}&v=3`,
    from: adminUser,
    id: "1",
    message: { chat: privateChat, date: Date.now(), edit_date: Date.now(), from: bot, message_id: 1, text: "" },
  },
  update_id: 1,
};

/**
 * Payload for edit message text request. It should be sent as a result of unsaved settings callback.
 */
export const cbUnsavedSettingsEditMessageTextPayload = {
  chat_id: privateChat.id,
  message_id: 1,
  parse_mode: "HTML",
  reply_markup: {
    inline_keyboard: [
      [
        { callback_data: `${VotebanAction.SETTINGS}?cId=${supergroup.id.toString()}&v=2`, text: "-1" },
        { callback_data: `${VotebanAction.SETTINGS}?cId=${supergroup.id.toString()}&v=4`, text: "+1" },
      ],
      [
        { callback_data: `${VotebanAction.SETTINGS}?cId=${supergroup.id.toString()}&v=-47`, text: "-50" },
        { callback_data: `${VotebanAction.SETTINGS}?cId=${supergroup.id.toString()}&v=53`, text: "+50" },
      ],
      [{ callback_data: `${VotebanAction.SAVE}?cId=${supergroup.id.toString()}&v=3`, text: "Save" }],
      [{ callback_data: `${SettingsAction.FEATURES}?cId=${supergroup.id.toString()}`, text: backToFeaturesText }],
    ],
  },
  text:
    "<b>Ban Voting</b>\nI can run votes to ban a user in a chat. The user will be banned and their " +
    "message deleted if the appropriate number of votes is reached. This feature will help users ban the violator " +
    "when administrators are offline. Messages sent more than 48 hours ago won't be deleted according to " +
    "Telegram rules.\n\n/voteban - start voting (can be used without the slash)\n\n<b>Tip:</b> " +
    "Don't set your vote limit too low. Otherwise, a user who has several accounts will be able to single-handedly " +
    "collect the required number of votes and ban other chat members.\n\n- - -\n\nSet the vote limit for making a " +
    `decision in @${supergroup.username ?? ""} chat. If set a value less than 2, the feature will be disabled.\n\n` +
    "Current value: <b>3</b>",
};

/**
 * Payload for send message request. It should be sent as a result of voteban command against the admin.
 */
export const votebanAgainstAdminSendMessagePayload = {
  chat_id: supergroup.id,
  reply_parameters: { message_id: 2 },
  text: "I can't start voting to ban the administrator. This would be incorrect.",
};

/**
 * Payload for send message request. It should be sent as a result of voteban command against the bot itself.
 */
export const votebanAgainstBotSendMessagePayload = {
  chat_id: supergroup.id,
  reply_parameters: { message_id: 2 },
  text: "I can't start voting to ban myself. This would be weird.",
};

/**
 * Webhook payload which contains voteban command against the bot itself
 */
export const votebanAgainstBotWebhook = {
  message: {
    chat: supergroup,
    date: Date.now(),
    from: adminUser,
    message_id: 2,
    message_thread_id: 1,
    reply_to_message: { chat: supergroup, date: Date.now(), from: bot, message_id: 1, text: "Bad message" },
    text: "voteban",
  },
  update_id: 1,
};

/**
 * Webhook payload which contains voteban command against the sender chat
 */
export const votebanAgainstSenderChatWebhook = {
  message: {
    chat: supergroup,
    date: Date.now(),
    from: adminUser,
    message_id: 3,
    message_thread_id: 1,
    reply_to_message: {
      chat: supergroup,
      date: Date.now(),
      from: systemChannelBot,
      media_group_id: "100",
      message_id: 1,
      sender_chat: channel,
      text: "Bad",
    },
    text: "voteban",
  },
  update_id: 1,
};

/**
 * Payload for send message request. It should be sent as a result of voteban command against the sender chat.
 */
export const votebanAgainstSenderChatSendMessagePayload = {
  chat_id: supergroup.id,
  parse_mode: "HTML",
  reply_markup: {
    inline_keyboard: [
      [{ callback_data: VotebanAction.BAN, text: "Ban (1/2)" }],
      [{ callback_data: VotebanAction.NO_BAN, text: noBanButtonText }],
    ],
  },
  reply_parameters: { allow_sending_without_reply: true, message_id: 1 },
  text:
    `<a href="tg:user?id=${adminUser.id.toString()}">@${adminUser.username ?? ""}</a> offers to ban ` +
    `@${channel.username ?? ""}. This requires 2 votes.\n\nDo you want to ban @${channel.username ?? ""}?`,
};

/**
 * Webhook payload which contains voteban command in a private chat
 */
export const votebanInPrivateChatWebhook = {
  message: { chat: privateChat, date: Date.now(), from: adminUser, message_id: 1, text: "voteban" },
  update_id: 1,
};

/**
 * Payload for send message request. It should be sent as a result of voteban command
 * when voteban has already been started.
 */
export const votebanAlreadyStartedSendMessagePayload = {
  chat_id: supergroup.id,
  reply_parameters: { message_id: 2 },
  text: "Voting has already started",
};

/**
 * Payload for send message request. It should be sent as a result of voteban command processing in a supergroup chat
 * without admin permissions.
 */
export const votebanNoAdminPermsSendMessagePayload = {
  chat_id: supergroup.id,
  reply_parameters: { message_id: 2 },
  text: "I need administrator permissions for this feature to work.",
};

/**
 * Payload for send message request. It should be sent as a result of voteban command.
 */
export const votebanSendMessagePayload = {
  chat_id: supergroup.id,
  parse_mode: "HTML",
  reply_markup: {
    inline_keyboard: [
      [{ callback_data: VotebanAction.BAN, text: "Ban (1/2)" }],
      [{ callback_data: VotebanAction.NO_BAN, text: noBanButtonText }],
    ],
  },
  reply_parameters: { allow_sending_without_reply: true, message_id: 1 },
  text:
    `<a href="tg:user?id=${adminUser.id.toString()}">@${adminUser.username ?? ""}</a> offers to ban ` +
    `<a href="tg:user?id=${user.id.toString()}">@${user.username ?? ""}</a>. This requires 2 votes.\n\n` +
    `Do you want to ban <a href="tg:user?id=${user.id.toString()}">@${user.username ?? ""}</a>?`,
};

/**
 * Payload for send message request. It should be sent as a result of voteban command from a sender chat.
 */
export const votebanSenderChatSendMessagePayload = {
  chat_id: supergroup.id,
  parse_mode: "HTML",
  reply_markup: {
    inline_keyboard: [
      [{ callback_data: VotebanAction.BAN, text: "Ban (0/2)" }],
      [{ callback_data: VotebanAction.NO_BAN, text: noBanButtonText }],
    ],
  },
  reply_parameters: { allow_sending_without_reply: true, message_id: 1 },
  text:
    `@${supergroup.username ?? ""} offers to ban ` +
    `<a href="tg:user?id=${user.id.toString()}">@${user.username ?? ""}</a>. This requires 2 votes.\n\n` +
    `Do you want to ban <a href="tg:user?id=${user.id.toString()}">@${user.username ?? ""}</a>?`,
};

/**
 * Webhook payload which contains voteban command
 */
export const votebanSenderChatWebhook = {
  message: {
    chat: supergroup,
    date: Date.now(),
    entities: [{ length: 8, offset: 0, type: "bot_command" }],
    from: systemChannelBot,
    message_id: 2,
    message_thread_id: 1,
    reply_to_message: { chat: supergroup, date: Date.now(), from: user, message_id: 1, text: "Bad" },
    sender_chat: supergroup,
    text: "/voteban",
  },
  update_id: 1,
};

/**
 * Webhook payload which contains voteban command
 */
export const votebanWebhook = {
  message: {
    chat: supergroup,
    date: Date.now(),
    from: adminUser,
    message_id: 2,
    message_thread_id: 1,
    reply_to_message: { chat: supergroup, date: Date.now(), from: user, message_id: 1, text: "Bad message" },
    text: "voteban",
  },
  update_id: 1,
};

/**
 * Payload for send message request. It should be sent as a result of voteban command without a reply processing
 * in a supergroup chat.
 */
export const votebanWithoutReplySendMessagePayload = {
  chat_id: supergroup.id,
  reply_parameters: { message_id: 1 },
  text:
    "You should respond with this command to a message that you consider incorrect in order to start voting " +
    "to ban the user.",
};

/**
 * Webhook payload which contains voteban command without a reply
 */
export const votebanWithoutReplyWebhook = {
  message: { chat: supergroup, date: Date.now(), from: adminUser, message_id: 1, text: "Voteban" },
  update_id: 1,
};
