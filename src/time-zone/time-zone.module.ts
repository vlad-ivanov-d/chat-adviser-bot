import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { SettingsModule } from "src/settings/settings.module";

import { TimeZoneService } from "./time-zone.service";

@Module({
  imports: [PrismaModule, SettingsModule],
  providers: [TimeZoneService],
})
export class TimeZoneModule {}
