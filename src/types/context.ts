import { Context, NarrowedContext } from "telegraf";
import { CallbackQuery, Message, Update } from "telegraf/typings/core/types/typegram";

export type CallbackCtx = NarrowedContext<Context<Update>, Update.CallbackQueryUpdate<CallbackQuery.DataQuery>>;

export type MessageCtx = NarrowedContext<Context<Update>, Update.MessageUpdate<Message>>;

export type NewMembersCtx = NarrowedContext<Context<Update>, Update.MessageUpdate<Message.NewChatMembersMessage>>;

export type TextMessageCtx = NarrowedContext<
  Context<Update>,
  {
    message: Update.New & Update.NonChannel & Message.TextMessage;
    update_id: number;
  }
>;
