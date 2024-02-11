import { Test } from "@nestjs/testing";
import { TelegrafModule } from "nestjs-telegraf";
import { BOT_TOKEN } from "src/app.constants";
import { PrismaModule } from "src/prisma/prisma.module";
import { SettingsModule } from "src/settings/settings.module";

import { AddingBotsService } from "./adding-bots.service";

describe("AddingBotsService", () => {
  let service: AddingBotsService;

  beforeEach(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [TelegrafModule.forRoot({ launchOptions: false, token: BOT_TOKEN }), PrismaModule, SettingsModule],
      providers: [AddingBotsService],
    }).compile();

    service = testingModule.get<AddingBotsService>(AddingBotsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
