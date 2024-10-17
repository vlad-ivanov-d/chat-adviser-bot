import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Ctx, Next, On, Update } from "nestjs-telegraf";
import { getTdjson } from "prebuilt-tdlib";
import * as tdl from "tdl";

import { PrismaService } from "src/prisma/prisma.service";
import { NextFunction } from "src/types/next-function";
import { EditedMessageCtx, MessageCtx } from "src/types/telegraf-context";

import { OUTDATED_MESSAGE_TIMEOUT } from "./messages.constants";

tdl.configure({ tdjson: getTdjson(), useOldTdjsonInterface: true });

@Update()
@Injectable()
export class MessagesService implements OnModuleInit, OnModuleDestroy {
  private client: tdl.Client | undefined;
  private readonly logger = new Logger(MessagesService.name);

  /**
   * Creates service
   * @param prismaService Database service
   */
  public constructor(private readonly prismaService: PrismaService) {}

  /**
   * Cleanups old messages
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  public async cleanup(): Promise<void> {
    const date = new Date(Date.now() - OUTDATED_MESSAGE_TIMEOUT);
    const { count } = await this.prismaService.message.deleteMany({ where: { createdAt: { lt: date } } });
    this.logger.log(`Number of deleted unused messages: ${count.toString()}`);
  }

  /**
   * Saves the message in the database
   * @param ctx Message context
   * @param next Function to continue processing
   */
  @On(["edited_message", "message"])
  public async saveMessage(@Ctx() ctx: EditedMessageCtx | MessageCtx, @Next() next: NextFunction): Promise<void> {
    const message = "message" in ctx.update ? ctx.update.message : ctx.update.edited_message;
    const mediaGroupId = "media_group_id" in message ? message.media_group_id : null;

    // Do not save messages for private chats or if it's about new/left chat member
    if (ctx.chat.type === "private" || "left_chat_member" in message || "new_chat_members" in message) {
      await next();
      return;
    }

    await Promise.all([
      this.prismaService.upsertChatWithCache(message.chat, message.from),
      message.sender_chat && this.prismaService.upsertSenderChat(message.sender_chat, message.from),
    ]);

    // Save the message for summary and voteban features
    await this.prismaService.message.upsert({
      create: {
        authorId: message.from.id,
        chatId: message.chat.id,
        editorId: message.from.id,
        mediaGroupId,
        messageId: message.message_id,
      },
      select: { id: true },
      update: { editorId: message.from.id, mediaGroupId },
      where: { chatId_messageId: { chatId: message.chat.id, messageId: message.message_id } },
    });

    await next();
  }

  /**
   * Lifecycle event called once the host module's dependencies have been resolved
   */
  public async onModuleInit(): Promise<void> {
    const client = await this.initClient();
    if (client) {
      this.watchDeletedMessages(client);
    }
  }

  /**
   * Lifecycle event called after a termination signal (e.g., SIGTERM) has been received.
   */
  public async onModuleDestroy(): Promise<void> {
    await this.client?.close();
  }

  /**
   * Watches for the message delete event and deletes messages from database then
   * @param client Telegram client
   */
  private watchDeletedMessages(client: tdl.Client): void {
    client.on("update", (update: { _: string; chat_id: number; message_ids: number[] }) => {
      if (update._ === "updateDeleteMessages") {
        void this.prismaService.message.deleteMany({
          where: { chatId: update.chat_id, messageId: { in: update.message_ids } },
        });
      }
    });
  }

  /**
   * Initiates Telegram client to provide additional API for the bot
   * @returns Telegram client
   */
  private async initClient(): Promise<tdl.Client | undefined> {
    if (process.env.TG_TOKEN && process.env.TG_CLIENT_API_HASH && process.env.TG_CLIENT_API_ID) {
      this.client = tdl.createClient({
        apiHash: process.env.TG_CLIENT_API_HASH,
        apiId: Number(process.env.TG_CLIENT_API_ID),
      });
      await this.client.loginAsBot(process.env.TG_TOKEN);
    }
    return this.client;
  }
}
