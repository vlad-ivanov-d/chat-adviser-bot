import { Injectable } from "@nestjs/common";
import { changeLanguage, t } from "i18next";
import { Ctx, Hears, Update } from "nestjs-telegraf";
import { PrismaService } from "src/prisma/prisma.service";
import { TextMessageCtx } from "src/types/telegraf-context";

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
  @Hears(["/help", "/start"])
  public async helpCommand(@Ctx() ctx: TextMessageCtx): Promise<void> {
    const { language } = await this.prismaService.upsertChatWithCache(ctx.chat, ctx.message.from);
    await changeLanguage(language);
    await ctx.reply(t("common:help", { BOT_LINK: `tg:user?id=${ctx.botInfo.id}` }), {
      parse_mode: "HTML",
      reply_to_message_id: ctx.chat.type === "private" ? undefined : ctx.message.message_id,
    });
  }
}
