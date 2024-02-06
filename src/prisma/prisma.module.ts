import { Module } from "@nestjs/common";
import { getBotToken } from "nestjs-telegraf";
import type { Telegraf } from "telegraf";

import { PrismaService } from "./prisma.service";

let testPrismaService: PrismaService | undefined;

@Module({
  exports: [PrismaService],
  providers: [
    {
      inject: [getBotToken()],
      provide: PrismaService,
      /**
       * Instance of a provider to be injected. It fixes the prisma warning in tests:
       * "This is the 10th instance of Prisma Client being started. Make sure this is intentional."
       * @param bot Telegraf instance
       * @returns Prisma service
       */
      useFactory: (bot: Telegraf) => {
        const prismaService =
          process.env.NODE_ENV === "test" ? testPrismaService ?? new PrismaService(bot) : new PrismaService(bot);
        testPrismaService = prismaService;
        return prismaService;
      },
    },
  ],
})
export class PrismaModule {}
