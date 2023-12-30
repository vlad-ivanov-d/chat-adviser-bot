import { App } from "app";
import { Telegraf } from "telegraf";
import { BOT_TOKEN } from "utils/envs";

/**
 * Bootstraps the app
 */
const bootstrap = async (): Promise<void> => {
  const bot = new Telegraf(BOT_TOKEN);
  const app = new App(bot);

  // Shutdown the app when Node.js server is turned off
  process.once("SIGINT", () => void app.shutdown(true));
  process.once("SIGTERM", () => void app.shutdown(true));

  await app.init();
  await bot.launch();
};
void bootstrap();
