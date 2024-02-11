import { Test } from "@nestjs/testing";
import { TelegrafModule } from "nestjs-telegraf";
import { BOT_TOKEN } from "src/app.constants";
import { PrismaModule } from "src/prisma/prisma.module";
import { SettingsModule } from "src/settings/settings.module";

import { VotebanService } from "./voteban.service";

describe("VotebanService", () => {
  let service: VotebanService;

  beforeEach(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [TelegrafModule.forRoot({ launchOptions: false, token: BOT_TOKEN }), PrismaModule, SettingsModule],
      providers: [VotebanService],
    }).compile();

    service = testingModule.get<VotebanService>(VotebanService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
