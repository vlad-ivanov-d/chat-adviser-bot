import { CronJob } from "cron";
import type { Database } from "modules/database";
import type { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import type { MessageCtx } from "types/telegrafContext";

import { OUTDATED_MESSAGE_TIMEOUT } from "./messages.constants";

export class Messages {
  private cleanupCronJob?: CronJob;

  /**
   * Creates messages module
   * @param bot Telegraf bot instance
   * @param database Database
   */
  public constructor(
    private readonly bot: Telegraf,
    private readonly database: Database,
  ) {}

  /**
   * Initiates messages module
   */
  public init(): void {
    this.cleanupCronJob = new CronJob(
      "0 0 0 * * *", // Every day at 00:00:00
      () => {
        void (async () => {
          const date = new Date(Date.now() - OUTDATED_MESSAGE_TIMEOUT);
          await this.database.message.deleteMany({ where: { createdAt: { lt: date } } });
        })();
      },
      null,
      true,
    );
    this.bot.on(message(), (ctx, next) => this.saveMessage(ctx, next));
  }

  /**
   * Shutdowns messages module
   */
  public shutdown(): void {
    this.cleanupCronJob?.stop();
  }

  /**
   * Saves the message in the database if it's necessary
   * @param ctx Message context
   * @param next Function to continue processing
   */
  private async saveMessage(ctx: MessageCtx, next: () => Promise<void>): Promise<void> {
    const { message } = ctx.update;

    if ("media_group_id" in message) {
      await this.database.upsertChat(message.chat, message.from);
      await this.database.message.create({
        data: {
          authorId: message.from.id,
          chatId: message.chat.id,
          editorId: message.from.id,
          mediaGroupId: message.media_group_id,
          messageId: message.message_id,
        },
        select: { messageId: true },
      });
    }

    await next();
  }
}
