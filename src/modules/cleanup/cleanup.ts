import { CronJob } from "cron";
import type { Database } from "modules/database";
import type { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import type { BasicModule } from "types/basicModule";

export class Cleanup implements BasicModule {
  /**
   * Cleanup cron job instance
   */
  private cronJob?: CronJob;

  /**
   * Creates cleanup module
   * @param bot Telegraf bot instance
   * @param database Database service
   */
  public constructor(
    private readonly bot: Telegraf,
    private readonly database: Database,
  ) {}

  /**
   * Initiates cleanup module
   */
  public init(): void {
    this.bot.on(message("left_chat_member"), async (ctx, next): Promise<void> => {
      if (ctx.update.message.left_chat_member.id === ctx.botInfo.id) {
        await this.database.chat.deleteMany({ where: { id: ctx.chat.id } });
      }
      await next();
    });
    this.cronJob = new CronJob(
      "0 0 0 * * *", // Every day at 00:00:00
      () => {
        void (async () => {
          await this.cleanupSenderChats();
          await this.cleanupUsers();
        })();
      },
      null,
      true,
    );
  }

  /**
   * Shutdowns cleanup module
   */
  public shutdown(): void {
    this.cronJob?.stop();
  }

  /**
   * Removes unused sender chats
   */
  private async cleanupSenderChats(): Promise<void> {
    await this.database.senderChat.deleteMany({
      where: { AND: [{ votebanAuthorSenderChats: { none: {} } }, { votebanCandidateSenderChats: { none: {} } }] },
    });
  }

  /**
   * Removes unused users
   */
  private async cleanupUsers(): Promise<void> {
    // Remove unused users from database
    await this.database.user.deleteMany({
      where: {
        AND: [
          { chatAdmins: { none: {} } },
          { chatAuthors: { none: {} } },
          { chatEditors: { none: {} } },
          { chatSettingsHistoryAuthors: { none: {} } },
          { chatSettingsHistoryEditors: { none: {} } },
          { messageAuthors: { none: {} } },
          { messageEditors: { none: {} } },
          { profaneWordAuthors: { none: {} } },
          { profaneWordEditors: { none: {} } },
          { senderChatAuthors: { none: {} } },
          { senderChatEditors: { none: {} } },
          { userAuthors: { none: {} } },
          { userEditors: { none: {} } },
          { votebanAuthors: { none: {} } },
          { votebanBanVoterAuthors: { none: {} } },
          { votebanBanVoterEditors: { none: {} } },
          { votebanCandidates: { none: {} } },
          { votebanEditors: { none: {} } },
          { votebanNoBanVoterAuthors: { none: {} } },
          { votebanNoBanVoterEditors: { none: {} } },
        ],
      },
    });
    // Find unused users which are authors and editors only for themselves
    const maybeUnusedUsers = await this.database.user.findMany({
      select: { id: true, userAuthors: { select: { id: true } }, userEditors: { select: { id: true } } },
      where: {
        AND: [
          { chatAdmins: { none: {} } },
          { chatAuthors: { none: {} } },
          { chatEditors: { none: {} } },
          { chatSettingsHistoryAuthors: { none: {} } },
          { chatSettingsHistoryEditors: { none: {} } },
          { messageAuthors: { none: {} } },
          { messageEditors: { none: {} } },
          { profaneWordAuthors: { none: {} } },
          { profaneWordEditors: { none: {} } },
          { senderChatAuthors: { none: {} } },
          { senderChatEditors: { none: {} } },
          { NOT: { userAuthors: { none: {} } } },
          { NOT: { userEditors: { none: {} } } },
          { votebanAuthors: { none: {} } },
          { votebanBanVoterAuthors: { none: {} } },
          { votebanBanVoterEditors: { none: {} } },
          { votebanCandidates: { none: {} } },
          { votebanEditors: { none: {} } },
          { votebanNoBanVoterAuthors: { none: {} } },
          { votebanNoBanVoterEditors: { none: {} } },
        ],
      },
    });
    const unusedUsers = maybeUnusedUsers.filter(
      ({ id, userAuthors, userEditors }) =>
        userAuthors.length === 1 &&
        userAuthors.map((a) => a.id).includes(id) &&
        userEditors.length === 1 &&
        userEditors.map((a) => a.id).includes(id),
    );
    await this.database.user.deleteMany({ where: { id: { in: unusedUsers.map((u) => u.id) } } });
  }
}
