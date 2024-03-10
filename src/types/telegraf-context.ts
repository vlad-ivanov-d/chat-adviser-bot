import type { Context, NarrowedContext } from "telegraf";
import type { CallbackQuery, Message, Update } from "telegraf/typings/core/types/typegram";

export type CallbackCtx = NarrowedContext<Context, Update.CallbackQueryUpdate<CallbackQuery.DataQuery>>;

export type EditedMessageCtx = NarrowedContext<Context, Update.EditedMessageUpdate>;

export type MessageCtx = NarrowedContext<Context, Update.MessageUpdate>;

export type MyChatMemberCtx = NarrowedContext<Context, Update.MyChatMemberUpdate>;

export type NewChatMembersCtx = NarrowedContext<Context, Update.MessageUpdate<Message.NewChatMembersMessage>>;

export type TextMessageCtx = NarrowedContext<
  Context,
  {
    message: Update.New & Update.NonChannel & Message.TextMessage;
    update_id: number;
  }
>;
