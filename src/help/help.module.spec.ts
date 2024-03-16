import { CacheModule } from "@nestjs/cache-manager";
import { Test, type TestingModule } from "@nestjs/testing";
import { TelegrafModule } from "nestjs-telegraf";

import { PrismaModule } from "src/prisma/prisma.module";
import { store } from "src/utils/redis";

import { HelpModule } from "./help.module";

describe("HelpModule", () => {
  let testingModule: TestingModule;

  beforeEach(async () => {
    testingModule = await Test.createTestingModule({
      imports: [
        CacheModule.register({ isGlobal: true, store }),
        TelegrafModule.forRoot({ launchOptions: false, token: process.env.BOT_TOKEN ?? "" }),
        PrismaModule,
        HelpModule,
      ],
    }).compile();
  });

  it("should be defined", () => {
    expect(testingModule).toBeDefined();
  });
});
