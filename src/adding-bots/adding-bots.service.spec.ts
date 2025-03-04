import { CacheModule } from "@nestjs/cache-manager";
import { Test } from "@nestjs/testing";
import { TelegrafModule } from "nestjs-telegraf";

import { PrismaModule } from "src/prisma/prisma.module";
import { SettingsModule } from "src/settings/settings.module";
import { store } from "src/utils/redis";

import { AddingBotsService } from "./adding-bots.service";

describe("AddingBotsService", () => {
  let service: AddingBotsService;

  beforeEach(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [
        CacheModule.register({ isGlobal: true, store }),
        TelegrafModule.forRoot({ launchOptions: false, token: process.env.TG_TOKEN ?? "" }),
        PrismaModule,
        SettingsModule,
      ],
      providers: [AddingBotsService],
    }).compile();

    service = testingModule.get<AddingBotsService>(AddingBotsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
