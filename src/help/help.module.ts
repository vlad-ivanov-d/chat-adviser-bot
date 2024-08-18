import { Module } from "@nestjs/common";

import { PrismaModule } from "src/prisma/prisma.module";
import { SettingsModule } from "src/settings/settings.module";

import { HelpService } from "./help.service";

@Module({
  imports: [PrismaModule, SettingsModule],
  providers: [HelpService],
})
export class HelpModule {}
