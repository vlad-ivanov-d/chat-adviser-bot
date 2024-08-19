import { CacheModule } from "@nestjs/cache-manager";
import { Test } from "@nestjs/testing";
import { LanguageCode } from "@prisma/client";
import { changeLanguage, t } from "i18next";
import { TelegrafModule } from "nestjs-telegraf";

import { privateChat } from "fixtures/chats";
import { bot } from "fixtures/users";
import { PrismaModule } from "src/prisma/prisma.module";
import { PrismaService } from "src/prisma/prisma.service";
import { SettingsModule } from "src/settings/settings.module";
import { SettingsService } from "src/settings/settings.service";
import { store } from "src/utils/redis";
import { mockCommandCtx } from "test/mocks/telegraf";

import { HelpService } from "./help.service";

describe("HelpService", () => {
  const helpTranslationPath = "common:help";
  let prismaService: PrismaService;
  let service: HelpService;
  let settingsService: SettingsService;

  beforeEach(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [
        CacheModule.register({ isGlobal: true, store }),
        TelegrafModule.forRoot({ launchOptions: false, token: process.env.TELEGRAM_TOKEN ?? "" }),
        PrismaModule,
        SettingsModule,
      ],
      providers: [HelpService],
    }).compile();

    prismaService = testingModule.get<PrismaService>(PrismaService);
    service = testingModule.get<HelpService>(HelpService);
    settingsService = testingModule.get<SettingsService>(SettingsService);
  });

  it("answers to /help command in a supergroup chat", async () => {
    prismaService.upsertChatWithCache = jest.fn().mockReturnValueOnce({ settings: { language: LanguageCode.EN } });
    const ctx = mockCommandCtx();
    const replySpy = jest.spyOn(ctx, "reply");

    await service.helpCommand(ctx);

    expect(changeLanguage).toHaveBeenCalledWith("EN");
    expect(t).toHaveBeenCalledWith(helpTranslationPath, { BOT_LINK: `tg:user?id=${bot.id.toString()}` });
    expect(replySpy).toHaveBeenCalledWith(helpTranslationPath, {
      parse_mode: "HTML",
      reply_parameters: { message_id: 1 },
    });
  });

  it("answers to /start command in a private chat", async () => {
    prismaService.upsertChatWithCache = jest.fn().mockReturnValueOnce({ settings: { language: LanguageCode.EN } });
    const ctx = mockCommandCtx({ chat: privateChat });
    const renderChatsSpy = jest.spyOn(settingsService, "renderChats").mockImplementation(jest.fn());
    const replySpy = jest.spyOn(ctx, "reply");

    await service.startCommand(ctx);

    expect(changeLanguage).toHaveBeenCalledWith("EN");
    expect(t).toHaveBeenCalledWith(helpTranslationPath, { BOT_LINK: `tg:user?id=${bot.id.toString()}` });
    expect(replySpy).toHaveBeenCalledWith(helpTranslationPath, { parse_mode: "HTML" });
    expect(renderChatsSpy).toHaveBeenCalledWith(ctx);
  });
});
