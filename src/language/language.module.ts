import { Module } from "@nestjs/common";

import { PrismaModule } from "src/prisma/prisma.module";
import { SettingsModule } from "src/settings/settings.module";

import { LanguageService } from "./language.service";

@Module({
  exports: [LanguageService],
  imports: [PrismaModule, SettingsModule],
  providers: [LanguageService],
})
export class LanguageModule {}
