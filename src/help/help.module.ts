import { Module } from "@nestjs/common";

import { PrismaModule } from "src/prisma/prisma.module";

import { HelpService } from "./help.service";

@Module({
  imports: [PrismaModule],
  providers: [HelpService],
})
export class HelpModule {}
