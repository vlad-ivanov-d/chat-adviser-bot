import { Context, NarrowedContext } from "telegraf";
import { CallbackQuery, Message, Update } from "telegraf/typings/core/types/typegram";

export type CallbackCtx = NarrowedContext<Context, Update.CallbackQueryUpdate<CallbackQuery.DataQuery>>;

export type MessageCtx = NarrowedContext<Context, Update.MessageUpdate>;

export type NewChatMembersCtx = NarrowedContext<Context, Update.MessageUpdate<Message.NewChatMembersMessage>>;

export type TextMessageCtx = NarrowedContext<
  Context,
  {
    message: Update.New & Update.NonChannel & Message.TextMessage;
    update_id: number;
  }
>;
