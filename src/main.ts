import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";
import { logger } from "./utils/logger";

/**
 * Bootstraps NestJS app
 */
const bootstrap = async (): Promise<void> => {
  const app = await NestFactory.createApplicationContext(AppModule, { logger });
  app.enableShutdownHooks();
};
void bootstrap();
