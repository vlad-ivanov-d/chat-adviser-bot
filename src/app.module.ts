import { CacheModule } from "@nestjs/cache-manager";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { TelegrafModule } from "nestjs-telegraf";

import { AddingBotsModule } from "./adding-bots/adding-bots.module";
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
    CacheModule.registerAsync({
      isGlobal: true,
      /**
       * Initiates Redis store
       * @returns Cache manager with Redis store
       */
      useFactory: () => ({ store }),
    }),
    ConfigModule.forRoot(),
    ScheduleModule.forRoot(),
    TelegrafModule.forRoot({
      launchOptions: {
        webhook: process.env.WEBHOOK_DOMAIN
          ? {
              domain: process.env.WEBHOOK_DOMAIN,
              path: process.env.WEBHOOK_PATH,
              port: process.env.WEBHOOK_PORT ? Number(process.env.WEBHOOK_PORT) : undefined,
              secretToken: process.env.WEBHOOK_SECRET_TOKEN,
            }
          : undefined,
      },
      token: process.env.BOT_TOKEN ?? "",
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
})
export class AppModule {}
