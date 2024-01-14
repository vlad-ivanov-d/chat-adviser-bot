import { App } from "app";

/**
 * Bootstraps the app
 */
const bootstrap = async (): Promise<void> => {
  const app = new App();

  // Shutdown the app when Node.js server is turned off
  process.once("SIGINT", () => void app.shutdown(true));
  process.once("SIGTERM", () => void app.shutdown(true));

  await app.init();
  await app.bot.launch();
};
void bootstrap();
