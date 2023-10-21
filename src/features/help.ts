import { t } from "i18next";
import { TextMessageCtx } from "types/context";
import { upsertPrismaChat } from "utils/prisma";
import { isCleanCommand } from "utils/telegraf";

export class Help {
  /**
   * Shows help message
   * @param ctx Text message context
   * @param cleanCommand Clean command name
   */
  public async command(ctx: TextMessageCtx, cleanCommand: string): Promise<void> {
    if (!isCleanCommand(cleanCommand, ctx.message.text)) {
      return; // Not clean command, ignore.
    }

    const { language: lng } = await upsertPrismaChat(ctx.chat, ctx.message.from);
    const msg = t("common:help", { BOT_LINK: `tg:user?id=${ctx.botInfo.id}`, lng });

    await ctx.reply(msg, {
      parse_mode: "HTML",
      reply_to_message_id: ctx.chat.type === "private" ? undefined : ctx.message.message_id,
    });
  }
}

export const help = new Help();
