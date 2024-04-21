import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";
import { createLogger } from "./utils/logger";

/**
 * Bootstraps NestJS app
 */
const bootstrap = async (): Promise<void> => {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: createLogger() });
  app.enableShutdownHooks();
};
void bootstrap();
