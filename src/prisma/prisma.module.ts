import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Module } from "@nestjs/common";
import type { Cache as CacheManager } from "cache-manager";
import { getBotToken } from "nestjs-telegraf";
import type { Telegraf } from "telegraf";

import { PrismaService } from "./prisma.service";

let prismaService: PrismaService | undefined;

@Module({
  exports: [PrismaService],
  providers: [
    {
      inject: [getBotToken(), CACHE_MANAGER],
      provide: PrismaService,
      /**
       * Instance of a provider to be injected. It fixes the prisma warning in tests:
       * "This is the 10th instance of Prisma Client being started. Make sure this is intentional."
       * @param args Prisma service arguments
       * @returns Prisma service
       */
      useFactory: (...args: [Telegraf, CacheManager]) => {
        prismaService = prismaService ?? new PrismaService(...args);
        return prismaService;
      },
    },
  ],
})
export class PrismaModule {}
