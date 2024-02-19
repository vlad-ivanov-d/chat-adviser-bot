import { CacheModule } from "@nestjs/cache-manager";
import { Test } from "@nestjs/testing";
import { TelegrafModule } from "nestjs-telegraf";
import { BOT_TOKEN } from "src/app.constants";
import { PrismaModule } from "src/prisma/prisma.module";
import { cache } from "src/utils/cache";

import { HelpService } from "./help.service";

describe("HelpService", () => {
  let service: HelpService;

  beforeEach(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [
        CacheModule.register({ isGlobal: true, store: cache }),
        TelegrafModule.forRoot({ launchOptions: false, token: BOT_TOKEN }),
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
