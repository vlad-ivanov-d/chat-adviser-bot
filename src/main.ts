import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";

/**
 * Bootstraps NestJS app
 */
const bootstrap = async (): Promise<void> => {
  const app = await NestFactory.createApplicationContext(AppModule);
  app.enableShutdownHooks();
};
void bootstrap();
