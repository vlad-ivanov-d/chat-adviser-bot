import { Injectable } from "@nestjs/common";
import { changeLanguage, t } from "i18next";
import { Ctx, Help, Start, Update } from "nestjs-telegraf";

import { CommandWithoutPayload } from "src/decorators/command-without-payload";
import { PrismaService } from "src/prisma/prisma.service";
import { SettingsService } from "src/settings/settings.service";
import { CommandCtx } from "src/types/telegraf-context";

@Update()
@Injectable()
export class HelpService {
  /**
   * Creates service
   * @param prismaService Database service
   * @param settingsService Settings service
   */
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly settingsService: SettingsService,
  ) {}

  /**
   * Shows help message
   * @param ctx Text message context
   */
  @Help()
  @CommandWithoutPayload()
  public async helpCommand(@Ctx() ctx: CommandCtx): Promise<void> {
    const { settings } = await this.prismaService.upsertChatWithCache(ctx.chat, ctx.message.from);
    await changeLanguage(settings.language);
    await ctx.reply(t("common:help", { BOT_LINK: `tg:user?id=${ctx.botInfo.id.toString()}` }), {
      parse_mode: "HTML",
      ...(ctx.chat.type !== "private" && { reply_parameters: { message_id: ctx.message.message_id } }),
    });
  }

  /**
   * Shows start message
   * @param ctx Text message context
   */
  @Start()
  @CommandWithoutPayload()
  public async startCommand(@Ctx() ctx: CommandCtx): Promise<void> {
    // Ignore if the chat is not private
    if (ctx.chat.type !== "private") {
      return;
    }
    const { settings } = await this.prismaService.upsertChatWithCache(ctx.chat, ctx.message.from);
    await changeLanguage(settings.language);
    await ctx.reply(t("common:help", { BOT_LINK: `tg:user?id=${ctx.botInfo.id.toString()}` }), { parse_mode: "HTML" });
    await this.settingsService.renderChats(ctx);
  }
}
