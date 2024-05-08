import { CacheModule } from "@nestjs/cache-manager";
import { Logger, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { TelegrafModule } from "nestjs-telegraf";

import { AddingBotsModule } from "./adding-bots/adding-bots.module";
import { AppService } from "./app.service";
import { ChannelMessageFilterModule } from "./channel-message-filter/channel-message-filter.module";
import { CleanupModule } from "./cleanup/cleanup.module";
import { HelpModule } from "./help/help.module";
import { LanguageModule } from "./language/language.module";
import { MessagesModule } from "./messages/messages.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProfanityFilterModule } from "./profanity-filter/profanity-filter.module";
import { SettingsModule } from "./settings/settings.module";
import { TimeZoneModule } from "./time-zone/time-zone.module";
import { store } from "./utils/redis";
import { VotebanModule } from "./voteban/voteban.module";
import { WarningsModule } from "./warnings/warnings.module";

@Module({
  imports: [
    CacheModule.register({ isGlobal: true, store }),
    ConfigModule.forRoot(),
    ScheduleModule.forRoot(),
    TelegrafModule.forRoot({
      launchOptions: {
        webhook: process.env.TELEGRAM_WEBHOOK_DOMAIN
          ? {
              domain: process.env.TELEGRAM_WEBHOOK_DOMAIN,
              path: process.env.TELEGRAM_WEBHOOK_PATH,
              port: process.env.TELEGRAM_WEBHOOK_PORT ? Number(process.env.TELEGRAM_WEBHOOK_PORT) : undefined,
              secretToken: process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN,
            }
          : undefined,
      },
      middlewares: [
        async (ctx, next): Promise<void> => {
          const startTimestamp = Date.now();
          await next();
          new Logger().log(
            { labels: { request_time: Date.now() - startTimestamp }, message: "Update processing completed" },
            "TelegrafMiddleware",
          );
        },
      ],
      token: process.env.TELEGRAM_TOKEN ?? "",
    }),
    ProfanityFilterModule,
    AddingBotsModule,
    ChannelMessageFilterModule,
    CleanupModule,
    HelpModule,
    LanguageModule,
    MessagesModule,
    PrismaModule,
    SettingsModule,
    TimeZoneModule,
    VotebanModule,
    WarningsModule,
  ],
  providers: [AppService],
})
export class AppModule {}
