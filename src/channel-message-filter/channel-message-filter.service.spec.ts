import { Test } from "@nestjs/testing";
import { TelegrafModule } from "nestjs-telegraf";
import { BOT_TOKEN } from "src/app.constants";
import { PrismaModule } from "src/prisma/prisma.module";
import { SettingsModule } from "src/settings/settings.module";

import { ChannelMessageFilterService } from "./channel-message-filter.service";

describe("ChannelMessageFilterService", () => {
  let service: ChannelMessageFilterService;

  beforeEach(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [TelegrafModule.forRoot({ launchOptions: false, token: BOT_TOKEN }), PrismaModule, SettingsModule],
      providers: [ChannelMessageFilterService],
    }).compile();

    service = testingModule.get<ChannelMessageFilterService>(ChannelMessageFilterService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
