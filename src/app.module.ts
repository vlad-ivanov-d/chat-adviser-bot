import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { TelegrafModule } from "nestjs-telegraf";

import { AddingBotsModule } from "./adding-bots/adding-bots.module";
import { BOT_TOKEN, WEBHOOK_DOMAIN, WEBHOOK_PATH, WEBHOOK_PORT } from "./app.constants";
import { ChannelMessageFilterModule } from "./channel-message-filter/channel-message-filter.module";
import { CleanupModule } from "./cleanup/cleanup.module";
import { HelpModule } from "./help/help.module";
import { LanguageModule } from "./language/language.module";
import { MessagesModule } from "./messages/messages.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProfanityFilterModule } from "./profanity-filter/profanity-filter.module";
import { SettingsModule } from "./settings/settings.module";
import { TimeZoneModule } from "./time-zone/time-zone.module";
import { VotebanModule } from "./voteban/voteban.module";
import { WarningsModule } from "./warnings/warnings.module";

@Module({
  imports: [
    ConfigModule.forRoot(),
    ScheduleModule.forRoot(),
    TelegrafModule.forRoot({
      launchOptions: {
        webhook: WEBHOOK_DOMAIN ? { domain: WEBHOOK_DOMAIN, path: WEBHOOK_PATH, port: WEBHOOK_PORT } : undefined,
      },
      token: BOT_TOKEN,
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
