import { Module } from "@nestjs/common";

import { PrismaModule } from "src/prisma/prisma.module";
import { SettingsModule } from "src/settings/settings.module";

import { WarningsService } from "./warnings.service";

@Module({
  imports: [PrismaModule, SettingsModule],
  providers: [WarningsService],
})
export class WarningsModule {}
