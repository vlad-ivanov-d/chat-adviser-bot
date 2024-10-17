import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable, type OnApplicationBootstrap, OnApplicationShutdown } from "@nestjs/common";
import { LanguageCode } from "@prisma/client";
import { Cache as CacheManager, type Store } from "cache-manager";
import type { RedisStore } from "cache-manager-redis-yet";
import { t } from "i18next";
import { InjectBot } from "nestjs-telegraf";
import { Telegraf } from "telegraf";

import { TelegramLanguage } from "./types/telegram-language";

@Injectable()
export class AppService implements OnApplicationBootstrap, OnApplicationShutdown {
  /**
   * Creates service
   * @param bot Telegraf instance
   * @param cacheManager Cache manager
   */
  public constructor(
    @InjectBot() private readonly bot: Telegraf,
    @Inject(CACHE_MANAGER) private readonly cacheManager: CacheManager<RedisStore | Store>,
  ) {}

  /**
   * Called once all modules have been initialized, but before listening for connections.
   */
  public async onApplicationBootstrap(): Promise<void> {
    // Clear storage before launch to prevent data mismatch errors when updating app version
    await this.cacheManager.reset();
    await this.setMyCommands();
  }

  /**
   * Called after connections close (app.close() resolves).
   */
  public async onApplicationShutdown(): Promise<void> {
    // Close cache store client
    if ("client" in this.cacheManager.store) {
      await this.cacheManager.store.client.quit();
    }
  }

  /**
   * Sets my commands for the bot
   */
  private async setMyCommands(): Promise<void> {
    await Promise.all([
      this.bot.telegram.setMyCommands(
        [
          { command: "mychats", description: t("settings:changeChatSettings", { lng: LanguageCode.EN }) },
          { command: "help", description: t("settings:help", { lng: LanguageCode.EN }) },
        ],
        { scope: { type: "all_private_chats" } },
      ),
      this.bot.telegram.setMyCommands(
        [
          { command: "mychats", description: t("settings:changeChatSettings", { lng: LanguageCode.RU }) },
          { command: "help", description: t("settings:help", { lng: LanguageCode.RU }) },
        ],
        { language_code: TelegramLanguage.RU, scope: { type: "all_private_chats" } },
      ),
    ]);
  }
}
