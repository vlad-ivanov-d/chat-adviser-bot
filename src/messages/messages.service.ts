import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Ctx, Next, On, Update } from "nestjs-telegraf";

import { PrismaService } from "src/prisma/prisma.service";
import { NextFunction } from "src/types/next-function";
import { MessageCtx } from "src/types/telegraf-context";

import { OUTDATED_MESSAGE_TIMEOUT } from "./messages.constants";

@Update()
@Injectable()
export class MessagesService {
  /**
   * Creates service
   * @param prismaService Database service
   */
  public constructor(private readonly prismaService: PrismaService) {}

  /**
   * Initiates cleanup cron job
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  public async cleanup(): Promise<void> {
    const date = new Date(Date.now() - OUTDATED_MESSAGE_TIMEOUT);
    await this.prismaService.message.deleteMany({ where: { createdAt: { lt: date } } });
  }

  /**
   * Saves the message in the database if it's necessary
   * @param ctx Message context
   * @param next Function to continue processing
   */
  @On("message")
  public async saveMessage(@Ctx() ctx: MessageCtx, @Next() next: NextFunction): Promise<void> {
    if ("media_group_id" in ctx.update.message) {
      await this.prismaService.upsertChatWithCache(ctx.update.message.chat, ctx.update.message.from);
      await this.prismaService.$transaction([
        this.prismaService.upsertUser(ctx.update.message.from, ctx.update.message.from),
        this.prismaService.message.create({
          data: {
            authorId: ctx.update.message.from.id,
            chatId: ctx.update.message.chat.id,
            editorId: ctx.update.message.from.id,
            mediaGroupId: ctx.update.message.media_group_id,
            messageId: ctx.update.message.message_id,
          },
          select: { messageId: true },
        }),
      ]);
    }

    await next();
  }
}
