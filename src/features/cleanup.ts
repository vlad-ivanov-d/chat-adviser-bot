import { CronJob } from "cron";
import { prisma } from "utils/prisma";

export class Cleanup {
  private cronJob?: CronJob;

  /**
   * Starts cleanup cron job
   */
  public startCronJob(): void {
    this.stopCronJob();
    this.cronJob = new CronJob(
      "0 0 0 * * *", // Every day at 00:00:00
      () => {
        void (async () => {
          await this.cleanupVoteban();
          await this.cleanupSenderChats();
          await this.cleanupUsers();
        })();
      },
      null,
      true,
    );
  }

  /**
   * Stops cleanup cron job
   */
  public stopCronJob(): void {
    this.cronJob?.stop();
  }

  /**
   * Expires votings by removing old data
   */
  private async cleanupVoteban(): Promise<void> {
    const monthAgoDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    // Remove expired votings from database
    await prisma.voteban.deleteMany({ where: { createdAt: { lt: monthAgoDate } } });
  }

  /**
   * Removes unused sender chats
   */
  private async cleanupSenderChats(): Promise<void> {
    await prisma.senderChat.deleteMany({
      where: { AND: [{ votebanAuthorSenderChats: { none: {} } }, { votebanCandidateSenderChats: { none: {} } }] },
    });
  }

  /**
   * Removes unused users
   */
  private async cleanupUsers(): Promise<void> {
    const monthAgoDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    // Remove unused users from database
    await prisma.user.deleteMany({
      where: {
        AND: [
          { chatAdmins: { none: {} } },
          { chatAuthors: { none: {} } },
          { chatEditors: { none: {} } },
          { chatSettingsHistoryAuthors: { none: {} } },
          { chatSettingsHistoryEditors: { none: {} } },
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
    const maybeUnusedUsers = await prisma.user.findMany({
      select: { id: true, userAuthors: { select: { id: true } }, userEditors: { select: { id: true } } },
      where: {
        AND: [
          { updatedAt: { lt: monthAgoDate } },
          { chatAdmins: { none: {} } },
          { chatAuthors: { none: {} } },
          { chatEditors: { none: {} } },
          { chatSettingsHistoryAuthors: { none: {} } },
          { chatSettingsHistoryEditors: { none: {} } },
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
    await prisma.user.deleteMany({ where: { id: { in: unusedUsers.map((u) => u.id) } } });
  }
}

export const cleanup = new Cleanup();
