import { AddingBots } from "modules/addingBots";
import { Cleanup } from "modules/cleanup";
import { Help } from "modules/help";
import { Language } from "modules/language";
import { ProfanityFilter } from "modules/profanityFilter";
import { Settings } from "modules/settings";
import { TimeZone } from "modules/timeZone";
import { Voteban } from "modules/voteban";
import { Telegraf } from "telegraf";

import { Database } from "./modules/database";

export class App {
  private addingBots?: AddingBots;
  private cleanup?: Cleanup;
  private database?: Database;
  private help?: Help;
  private language?: Language;
  private profanityFilter?: ProfanityFilter;
  private settings?: Settings;
  private timeZone?: TimeZone;
  private voteban?: Voteban;

  /**
   * Creates app module
   * @param bot Telegraf instance
   */
  public constructor(private readonly bot: Telegraf) {}

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

    this.timeZone = new TimeZone(this.bot, this.database, this.settings);
    this.timeZone.init();

    this.voteban = new Voteban(this.bot, this.database, this.settings);
    this.voteban.init();
  }

  /**
   * Shutdowns app module
   * @param stopBot Stops the bot
   */
  public async shutdown(stopBot?: boolean): Promise<void> {
    this.cleanup?.shutdown();
    this.voteban?.shutdown();
    if (stopBot) {
      this.bot.stop();
    }
    await this.database?.shutdown();
  }
}
