import { AddingBots } from "modules/addingBots";
import { Cleanup } from "modules/cleanup";
import { Help } from "modules/help";
import { Language } from "modules/language";
import { Messages } from "modules/messages";
import { MessagesOnBehalfOfChannels } from "modules/messagesOnBehalfOfChannels";
import { ProfanityFilter } from "modules/profanityFilter";
import { Settings } from "modules/settings";
import { TimeZone } from "modules/timeZone";
import { Voteban } from "modules/voteban";
import { Telegraf } from "telegraf";
import { BOT_TOKEN } from "utils/envs";

import { Database } from "./modules/database";

export class App {
  public readonly bot: Telegraf;

  private addingBots?: AddingBots;
  private cleanup?: Cleanup;
  private database?: Database;
  private help?: Help;
  private language?: Language;
  private messages?: Messages;
  private messagesOnBehalfOfChannels?: MessagesOnBehalfOfChannels;
  private profanityFilter?: ProfanityFilter;
  private settings?: Settings;
  private timeZone?: TimeZone;
  private voteban?: Voteban;

  /**
   * Creates app module
   */
  public constructor() {
    this.bot = new Telegraf(BOT_TOKEN);
  }

  /**
   * Initiates app module
   */
  public async init(): Promise<void> {
    this.database = new Database(this.bot);
    await this.database.init();

    this.settings = new Settings(this.bot, this.database);
    this.settings.init();

    this.profanityFilter = new ProfanityFilter(this.bot, this.database, this.settings);
    this.profanityFilter.init();

    this.addingBots = new AddingBots(this.bot, this.database, this.settings);
    this.addingBots.init();

    this.cleanup = new Cleanup(this.bot, this.database);
    this.cleanup.init();

    this.help = new Help(this.bot, this.database);
    this.help.init();

    this.language = new Language(this.bot, this.database, this.settings);
    await this.language.init();

    this.messagesOnBehalfOfChannels = new MessagesOnBehalfOfChannels(this.bot, this.database, this.settings);
    this.messagesOnBehalfOfChannels.init();

    this.messages = new Messages(this.bot, this.database);
    this.messages.init();

    this.timeZone = new TimeZone(this.bot, this.database, this.settings);
    this.timeZone.init();

    this.voteban = new Voteban(this.bot, this.database, this.settings);
    this.voteban.init();
  }

  /**
   * Initiates app module and process Telegram updates. Useful for tests.
   */
  public async initAndProcessUpdates(): Promise<void> {
    await this.init();
    const updates = await this.bot.telegram.getUpdates(50, 100, 0, []);
    for (const update of updates) {
      await this.bot.handleUpdate(update);
    }
  }

  /**
   * Shutdowns app module
   * @param stopBot Stops the bot
   */
  public async shutdown(stopBot?: boolean): Promise<void> {
    this.cleanup?.shutdown();
    this.messages?.shutdown();
    this.voteban?.shutdown();
    if (stopBot) {
      this.bot.stop();
    }
    // The connection to the database must be closed after all other modules
    await this.database?.shutdown();
  }
}
