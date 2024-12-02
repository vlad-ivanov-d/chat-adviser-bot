import { Module } from "@nestjs/common";

import { PrismaModule } from "src/prisma/prisma.module";
import { SettingsModule } from "src/settings/settings.module";

import { SummaryService } from "./summary.service";

@Module({
  exports: [SummaryService],
  imports: [PrismaModule, SettingsModule],
  providers: [SummaryService],
})
export class SummaryModule {}
