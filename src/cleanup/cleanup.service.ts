import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { On, Update } from "nestjs-telegraf";

import { PrismaService } from "src/prisma/prisma.service";
import { NextFunction } from "src/types/next-function";
import { MyChatMemberCtx } from "src/types/telegraf-context";

@Update()
@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

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
      this.logger.log(`The bot was kicked from a ${ctx.chat.type} chat`);
      await Promise.all([
        this.prismaService.deleteChatCache(ctx.chat.id),
        this.prismaService.chatSettings.deleteMany({ where: { id: ctx.chat.id } }),
      ]);
    }
    await next();
  }

  /**
   * Initiates cleanup cron job
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  public async cleanup(): Promise<void> {
    const deletedSenderChats = await this.prismaService.senderChat.deleteMany({
      where: {
        AND: [
          { votebanAuthorSenderChats: { none: {} } },
          { votebanCandidateSenderChats: { none: {} } },
          { warningSenderChats: { none: {} } },
        ],
      },
    });
    const deletedUsers = await this.prismaService.user.deleteMany({
      where: {
        AND: [
          { chatAdmins: { none: {} } },
          { chatAuthors: { none: {} } },
          { chatEditors: { none: {} } },
          { chatSettingsAuthors: { none: {} } },
          { chatSettingsEditors: { none: {} } },
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
    });
    this.logger.log(`Number of deleted unused sender chats: ${deletedSenderChats.count.toString()}`);
    this.logger.log(`Number of deleted unused users: ${deletedUsers.count.toString()}`);
    await this.deleteUnusedUsers();
  }

  /**
   * Deletes users which are authors and editors only for themselves
   */
  private async deleteUnusedUsers(): Promise<void> {
    const usersToCheck = await this.prismaService.user.findMany({
      select: { id: true, userAuthors: { select: { id: true } }, userEditors: { select: { id: true } } },
      where: {
        AND: [
          { chatAdmins: { none: {} } },
          { chatAuthors: { none: {} } },
          { chatEditors: { none: {} } },
          { chatSettingsAuthors: { none: {} } },
          { chatSettingsEditors: { none: {} } },
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
        userAuthors.length === 1 && userEditors.length === 1 && userAuthors[0].id === id && userEditors[0].id === id,
    );
    if (unusedUsers.length > 0) {
      await this.prismaService.user.deleteMany({ where: { id: { in: unusedUsers.map((u) => u.id) } } });
    }
    this.logger.log(`Number of deleted unused users (with the deep check): ${unusedUsers.length.toString()}`);
  }
}
