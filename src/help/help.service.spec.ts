import { CacheModule } from "@nestjs/cache-manager";
import { Test } from "@nestjs/testing";
import { TelegrafModule } from "nestjs-telegraf";
import { PrismaModule } from "src/prisma/prisma.module";
import { store } from "src/utils/redis";

import { HelpService } from "./help.service";

describe("HelpService", () => {
  let service: HelpService;

  beforeEach(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [
        CacheModule.registerAsync({
          isGlobal: true,
          /**
           * Initiates Redis store
           * @returns Cache factory with Redis store
           */
          useFactory: () => ({ store }),
        }),
        TelegrafModule.forRoot({ launchOptions: false, token: process.env.BOT_TOKEN ?? "" }),
        PrismaModule,
      ],
      providers: [HelpService],
    }).compile();

    service = testingModule.get<HelpService>(HelpService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
