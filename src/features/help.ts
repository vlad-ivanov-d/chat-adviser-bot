import { t } from "i18next";
import { MessageCtx } from "types/context";
import { upsertChat } from "utils/prisma";
import { isCleanCommand } from "utils/telegraf";

export class Help {
  /**
   * Shows help message
   * @param ctx Message context
   */
  public async command(ctx: MessageCtx): Promise<void> {
    if (!isCleanCommand("help", ctx.message.text) && !isCleanCommand("start", ctx.message.text)) {
      return; // Not clean command, ignore.
    }
    const { language: lng } = await upsertChat(ctx.chat, ctx.message.from);
    const msg = [
      t("help:greeting", { BOT_LINK: `tg:user?id=${ctx.botInfo.id}`, lng }),
      ...[t("language:help", { lng }), t("addingBots:help", { lng }), t("voteban:help", { lng })].sort((a, b) =>
        a.localeCompare(b),
      ),
      `\n${t("help:ending", { lng })}`,
    ].join("\n");
    const replyToMessageId = ctx.chat.type === "private" ? undefined : ctx.message.message_id;
    await ctx.reply(msg, { parse_mode: "HTML", reply_to_message_id: replyToMessageId });
  }
}

export const help = new Help();
