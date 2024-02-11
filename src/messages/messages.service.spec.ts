import { Test } from "@nestjs/testing";
import { TelegrafModule } from "nestjs-telegraf";
import { BOT_TOKEN } from "src/app.constants";
import { PrismaModule } from "src/prisma/prisma.module";

import { MessagesService } from "./messages.service";

describe("MessagesService", () => {
  let service: MessagesService;

  beforeEach(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [TelegrafModule.forRoot({ launchOptions: false, token: BOT_TOKEN }), PrismaModule],
      providers: [MessagesService],
    }).compile();

    service = testingModule.get<MessagesService>(MessagesService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});