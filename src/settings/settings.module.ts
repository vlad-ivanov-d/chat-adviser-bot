import { Module } from "@nestjs/common";

import { PrismaModule } from "src/prisma/prisma.module";

import { SettingsService } from "./settings.service";

@Module({
  exports: [SettingsService],
  imports: [PrismaModule],
  providers: [SettingsService],
})
export class SettingsModule {}
