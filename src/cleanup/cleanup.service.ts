import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Ctx, Next, On, Update } from "nestjs-telegraf";
import { PrismaService } from "src/prisma/prisma.service";
import { NextFunction } from "src/types/next-function";
import { LeftChatMemberContext } from "src/types/telegraf-context";

@Update()
@Injectable()
export class CleanupService {
  /**
   * Creates cleanup service
   * @param prismaService Database service
   */
  public constructor(private readonly prismaService: PrismaService) {}

  /**
   * Initiates cleanup module
   * @param ctx Callback context
   * @param next Function to continue processing
   */
  @On("left_chat_member")
  public async cleanupChats(@Ctx() ctx: LeftChatMemberContext, @Next() next: NextFunction): Promise<void> {
    if (ctx.update.message.left_chat_member.id === ctx.botInfo.id) {
      this.prismaService.removeUpsertChatCache(ctx.chat.id);
      await this.prismaService.chat.deleteMany({ where: { id: ctx.chat.id } });
    }
    await next();
  }

  /**
   * Initiates cleanup cron job
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  public async cleanup(): Promise<void> {
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
    await this.cleanupPotentiallyUnusedUsers();
  }

  /**
   * Removes users which are authors and editors only for themselves
   */
  private async cleanupPotentiallyUnusedUsers(): Promise<void> {
    const maybeUnusedUsers = await this.prismaService.user.findMany({
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
          { warningAuthors: { none: {} } },
          { warningEditors: { none: {} } },
          { warningUsers: { none: {} } },
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
    await this.prismaService.user.deleteMany({ where: { id: { in: unusedUsers.map((u) => u.id) } } });
  }
}
