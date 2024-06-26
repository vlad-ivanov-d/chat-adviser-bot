import { Injectable } from "@nestjs/common";
import { changeLanguage, t } from "i18next";
import { Ctx, Help, Start, Update } from "nestjs-telegraf";

import { PrismaService } from "src/prisma/prisma.service";
import { CommandCtx } from "src/types/telegraf-context";

@Update()
@Injectable()
export class HelpService {
  /**
   * Creates service
   * @param prismaService Database service
   */
  public constructor(private readonly prismaService: PrismaService) {}

  /**
   * Shows help message
   * @param ctx Text message context
   */
  @Help()
  @Start()
  public async helpCommand(@Ctx() ctx: CommandCtx): Promise<void> {
    if (!ctx.payload) {
      const { language } = await this.prismaService.upsertChatWithCache(ctx.chat, ctx.message.from);
      await changeLanguage(language);
      await ctx.reply(t("common:help", { BOT_LINK: `tg:user?id=${ctx.botInfo.id.toString()}` }), {
        parse_mode: "HTML",
        ...(ctx.chat.type !== "private" && { reply_parameters: { message_id: ctx.message.message_id } }),
      });
    }
  }
}
