import { CacheModule } from "@nestjs/cache-manager";
import { Test } from "@nestjs/testing";
import { TelegrafModule } from "nestjs-telegraf";

import { PrismaModule } from "src/prisma/prisma.module";
import { store } from "src/utils/redis";

import { MessagesService } from "./messages.service";

describe("MessagesService", () => {
  let service: MessagesService;

  beforeEach(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [
        CacheModule.register({ isGlobal: true, store }),
        TelegrafModule.forRoot({ launchOptions: false, token: process.env.TG_TOKEN ?? "" }),
        PrismaModule,
      ],
      providers: [MessagesService],
    }).compile();

    service = testingModule.get<MessagesService>(MessagesService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
