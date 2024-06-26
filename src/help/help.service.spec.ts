import { CacheModule } from "@nestjs/cache-manager";
import { Test } from "@nestjs/testing";
import { LanguageCode } from "@prisma/client";
import { changeLanguage, t } from "i18next";
import { TelegrafModule } from "nestjs-telegraf";

import { bot } from "fixtures/users";
import { PrismaModule } from "src/prisma/prisma.module";
import { PrismaService } from "src/prisma/prisma.service";
import { store } from "src/utils/redis";
import { mockCommandCtx } from "test/mocks/telegraf";

import { HelpService } from "./help.service";

describe("HelpService", () => {
  let prismaService: PrismaService;
  let service: HelpService;

  beforeEach(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [
        CacheModule.register({ isGlobal: true, store }),
        TelegrafModule.forRoot({ launchOptions: false, token: process.env.TELEGRAM_TOKEN ?? "" }),
        PrismaModule,
      ],
      providers: [HelpService],
    }).compile();

    prismaService = testingModule.get<PrismaService>(PrismaService);
    service = testingModule.get<HelpService>(HelpService);
  });

  it("answers to /help command in a supergroup chat", async () => {
    prismaService.upsertChatWithCache = jest.fn().mockReturnValueOnce({ language: LanguageCode.EN });
    const ctx = mockCommandCtx();
    const replySpy = jest.spyOn(ctx, "reply");

    await service.helpCommand(ctx);

    expect(changeLanguage).toHaveBeenCalledWith("EN");
    expect(t).toHaveBeenCalledWith("common:help", { BOT_LINK: `tg:user?id=${bot.id.toString()}` });
    expect(replySpy).toHaveBeenCalledWith("common:help", { parse_mode: "HTML", reply_parameters: { message_id: 1 } });
  });
});
