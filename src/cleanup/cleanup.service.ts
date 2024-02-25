import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ChatType } from "@prisma/client";
import { On, Update } from "nestjs-telegraf";
import { PrismaService } from "src/prisma/prisma.service";
import { NextFunction } from "src/types/next-function";
import { MyChatMemberCtx } from "src/types/telegraf-context";

@Update()
@Injectable()
export class CleanupService {
  /**
   * Creates service
   * @param prismaService Database service
   */
  public constructor(private readonly prismaService: PrismaService) {}

  /**
   * Cleanups chats
   * @param ctx Callback context
   * @param next Function to continue processing
   */
  @On("my_chat_member")
  public async cleanupChats(ctx: MyChatMemberCtx, next: NextFunction): Promise<void> {
    const { status } = ctx.update.my_chat_member.new_chat_member;
    if (status === "kicked" || status === "left") {
      await Promise.all([
        this.prismaService.deleteChatCache(ctx.chat.id),
        this.prismaService.chat.deleteMany({ where: { id: ctx.chat.id } }),
      ]);
    }
    await next();
  }

  /**
   * Initiates cleanup cron job
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  public async cleanup(): Promise<void> {
    await this.checkUnusedPrivateChats();
    await this.prismaService.$transaction([
      this.prismaService.senderChat.deleteMany({
        where: {
          AND: [
            { votebanAuthorSenderChats: { none: {} } },
            { votebanCandidateSenderChats: { none: {} } },
            { warningSenderChats: { none: {} } },
          ],
        },
      }),
      this.prismaService.user.deleteMany({
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
            { warningAuthors: { none: {} } },
            { warningEditors: { none: {} } },
            { warningUsers: { none: {} } },
          ],
        },
      }),
    ]);
    await this.checkUnusedUsers();
  }

  /**
   * Removes private chats where there is no activity
   */
  private async checkUnusedPrivateChats(): Promise<void> {
    const chatsToCheck = await this.prismaService.chat.findMany({
      select: { createdAt: true, id: true, updatedAt: true },
      where: { chatSettingsHistory: { none: {} }, type: ChatType.PRIVATE },
    });
    const unusedChats = chatsToCheck.filter((c) => {
      // It's possible that there will be a small difference in milliseconds. Check that it's less than 1000 ms.
      return Math.abs(c.updatedAt.getTime() - c.createdAt.getTime()) < 1000;
    });
    if (unusedChats.length > 0) {
      await this.prismaService.chat.deleteMany({ where: { id: { in: unusedChats.map((c) => c.id) } } });
    }
  }

  /**
   * Removes users which are authors and editors only for themselves
   */
  private async checkUnusedUsers(): Promise<void> {
    const usersToCheck = await this.prismaService.user.findMany({
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
          { OR: [{ NOT: { userAuthors: { none: {} } } }, { NOT: { userEditors: { none: {} } } }] },
          { votebanAuthors: { none: {} } },
          { votebanBanVoterAuthors: { none: {} } },
          { votebanBanVoterEditors: { none: {} } },
          { votebanCandidates: { none: {} } },
          { votebanEditors: { none: {} } },
          { votebanNoBanVoterAuthors: { none: {} } },
          { votebanNoBanVoterEditors: { none: {} } },
          { warningAuthors: { none: {} } },
          { warningEditors: { none: {} } },
          { warningUsers: { none: {} } },
        ],
      },
    });
    const unusedUsers = usersToCheck.filter(
      ({ id, userAuthors, userEditors }) =>
        (userAuthors.length === 0 || (userAuthors.length === 1 && userAuthors[0].id === id)) &&
        (userEditors.length === 0 || (userEditors.length === 1 && userEditors[0].id === id)),
    );
    if (unusedUsers.length > 0) {
      await this.prismaService.user.deleteMany({ where: { id: { in: unusedUsers.map((u) => u.id) } } });
    }
  }
}
