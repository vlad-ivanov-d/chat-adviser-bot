import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { SettingsModule } from "src/settings/settings.module";

import { VotebanService } from "./voteban.service";

@Module({
  imports: [PrismaModule, SettingsModule],
  providers: [VotebanService],
})
export class VotebanModule {}
