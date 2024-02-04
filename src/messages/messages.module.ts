import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";

import { MessagesService } from "./messages.service";

@Module({
  imports: [PrismaModule],
  providers: [MessagesService],
})
export class MessagesModule {}
