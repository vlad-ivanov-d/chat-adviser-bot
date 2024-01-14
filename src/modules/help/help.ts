import { changeLanguage, t } from "i18next";
import type { Database } from "modules/database";
import type { Telegraf } from "telegraf";
import type { BasicModule } from "types/basicModule";
import type { TextMessageCtx } from "types/telegrafContext";

export class Help implements BasicModule {
  /**
   * Creates help module
   * @param bot Telegraf bot instance
   * @param database Database
   */
  public constructor(
    private readonly bot: Telegraf,
    private readonly database: Database,
  ) {}

  /**
   * Initiates help module
   */
  public init(): void {
    this.bot.hears(["/help", "/start"], (ctx) => this.helpCommand(ctx));
  }

  /**
   * Shows help message
   * @param ctx Text message context
   */
  private async helpCommand(ctx: TextMessageCtx): Promise<void> {
    const { language } = await this.database.upsertChat(ctx.chat, ctx.message.from);
    await changeLanguage(language);
    await ctx.reply(t("common:help", { BOT_LINK: `tg:user?id=${ctx.botInfo.id}` }), {
      parse_mode: "HTML",
      reply_to_message_id: ctx.chat.type === "private" ? undefined : ctx.message.message_id,
    });
  }
}
