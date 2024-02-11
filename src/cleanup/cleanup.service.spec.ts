import { Test } from "@nestjs/testing";
import { TelegrafModule } from "nestjs-telegraf";
import { BOT_TOKEN } from "src/app.constants";
import { PrismaModule } from "src/prisma/prisma.module";

import { CleanupService } from "./cleanup.service";

describe("CleanupService", () => {
  let service: CleanupService;

  beforeEach(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [TelegrafModule.forRoot({ launchOptions: false, token: BOT_TOKEN }), PrismaModule],
      providers: [CleanupService],
    }).compile();

    service = testingModule.get<CleanupService>(CleanupService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});