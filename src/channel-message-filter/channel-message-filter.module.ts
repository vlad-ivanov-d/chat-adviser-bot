import { Module } from "@nestjs/common";

import { PrismaModule } from "src/prisma/prisma.module";
import { SettingsModule } from "src/settings/settings.module";

import { ChannelMessageFilterService } from "./channel-message-filter.service";

@Module({
  imports: [PrismaModule, SettingsModule],
  providers: [ChannelMessageFilterService],
})
export class ChannelMessageFilterModule {}
