import { CacheModule } from "@nestjs/cache-manager";
import { Test } from "@nestjs/testing";
import { LanguageCode } from "@prisma/client";
import { changeLanguage, t } from "i18next";
import { TelegrafModule } from "nestjs-telegraf";

import { mockTextMessageCtx } from "__mocks__/telegraf-context";
import { bot } from "fixtures/users";
import { PrismaModule } from "src/prisma/prisma.module";
import { PrismaService } from "src/prisma/prisma.service";
import type { TextMessageCtx } from "src/types/telegraf-context";
import { store } from "src/utils/redis";

import { HelpService } from "./help.service";

describe("HelpService", () => {
  let prismaService: PrismaService;
  let service: HelpService;

  beforeEach(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [
        CacheModule.registerAsync({
          isGlobal: true,
          /**
           * Initiates Redis store
           * @returns Cache manager with Redis store
           */
          useFactory: () => ({ store }),
        }),
        TelegrafModule.forRoot({ launchOptions: false, token: process.env.BOT_TOKEN ?? "" }),
        PrismaModule,
      ],
      providers: [HelpService],
    }).compile();

    prismaService = testingModule.get<PrismaService>(PrismaService);
    service = testingModule.get<HelpService>(HelpService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("answers to /help command in a supergroup chat", async () => {
    const replySpy = jest.fn();
    const ctx: TextMessageCtx = mockTextMessageCtx({ reply: replySpy });
    prismaService.upsertChatWithCache = jest.fn().mockReturnValueOnce({ language: LanguageCode.EN });

    await service.helpCommand(ctx);

    expect(changeLanguage).toHaveBeenCalledWith("EN");
    expect(t).toHaveBeenCalledWith("common:help", { BOT_LINK: `tg:user?id=${bot.id}` });
    expect(replySpy).toHaveBeenCalledWith("common:help", { parse_mode: "HTML", reply_parameters: { message_id: 1 } });
  });
});
