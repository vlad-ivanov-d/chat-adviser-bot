import { Module } from "@nestjs/common";

import { PrismaModule } from "src/prisma/prisma.module";
import { SettingsModule } from "src/settings/settings.module";

import { AddingBotsService } from "./adding-bots.service";

@Module({
  imports: [PrismaModule, SettingsModule],
  providers: [AddingBotsService],
})
export class AddingBotsModule {}
