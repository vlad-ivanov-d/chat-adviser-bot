import { CronJob } from "cron";
import { prisma } from "utils/prisma";

export class Cleanup {
  private cronJob?: CronJob;

  /**
   * Starts cleanup cron job
   */
  public startCronJob(): void {
    this.stopCronJob();
    this.cronJob = new CronJob({
      cronTime: "0 0 0 * * *", // Every day at 00:00:00
      /**
       * The function to fire at the specified time.
       */
      onTick: () => {
        void this.removeGarbage();
      },
      start: true,
    });
  }

  /**
   * Stops cleanup job
   */
  public stopCronJob(): void {
    this.cronJob?.stop();
  }

  /**
   * Removes unnecessary data from database
   */
  private async removeGarbage(): Promise<void> {
    const monthAgoDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    await prisma.$transaction([
      // Remove expired votings from database
      prisma.voteban.deleteMany({ where: { createdAt: { lt: monthAgoDate } } }),
      // Remove unused sender chats from database
      prisma.senderChat.deleteMany({
        where: {
          AND: [{ votebanAuthorSenderChats: { none: {} } }, { votebanCandidateSenderChats: { none: {} } }],
        },
      }),
      // Remove unused users from database
      prisma.user.deleteMany({
        where: {
          AND: [
            { chatAdmins: { none: {} } },
            { chatAuthors: { none: {} } },
            { chatEditors: { none: {} } },
            { chatSettingsHistoryAuthors: { none: {} } },
            { chatSettingsHistoryEditors: { none: {} } },
            { senderChatAuthors: { none: {} } },
            { senderChatEditors: { none: {} } },
            { userAuthors: { none: {} } },
            { userEditors: { none: {} } },
            { votebanAuthors: { none: {} } },
            { votebanBanVoterEditors: { none: {} } },
            { votebanCandidates: { none: {} } },
            { votebanEditors: { none: {} } },
            { votebanNoBanVoterAuthors: { none: {} } },
            { votebanNoBanVoterEditors: { none: {} } },
          ],
        },
      }),
    ]);
  }
}

export const cleanup = new Cleanup();
