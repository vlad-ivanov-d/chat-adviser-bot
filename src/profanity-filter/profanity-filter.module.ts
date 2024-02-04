import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { SettingsModule } from "src/settings/settings.module";

import { ProfanityFilterService } from "./profanity-filter.service";

@Module({
  imports: [PrismaModule, SettingsModule],
  providers: [ProfanityFilterService],
})
export class ProfanityFilterModule {}
