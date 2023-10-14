import { t } from "i18next";
import { TextMessageCtx } from "types/context";
import { upsertPrismaChat } from "utils/prisma";
import { isCleanCommand } from "utils/telegraf";

export class Help {
  /**
   * Shows help message
   * @param ctx Text message context
   */
  async command(ctx: TextMessageCtx): Promise<void> {
    if (!isCleanCommand("help", ctx.message.text) && !isCleanCommand("start", ctx.message.text)) {
      return; // Not clean command, ignore.
    }

    const { language: lng } = await upsertPrismaChat(ctx.chat, ctx.message.from);

    const featureList = [
      t("addingBots:help", { lng }),
      t("language:help", { lng }),
      t("profanityFilter:help", { lng }),
      t("voteban:help", { lng }),
    ]
      .sort((a, b) => a.localeCompare(b))
      .join("\n\n");
    const msg = t("common:help", { BOT_LINK: `tg:user?id=${ctx.botInfo.id}`, FEATURE_LIST: featureList, lng });

    await ctx.reply(msg, {
      parse_mode: "HTML",
      reply_to_message_id: ctx.chat.type === "private" ? undefined : ctx.message.message_id,
    });
  }
}

export const help = new Help();
