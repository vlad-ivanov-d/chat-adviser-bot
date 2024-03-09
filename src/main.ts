import { NestFactory } from "@nestjs/core";
import { WinstonModule } from "nest-winston";
import { createLogger, format, transports } from "winston";

import { AppModule } from "./app.module";

/**
 * Bootstraps NestJS app
 */
const bootstrap = async (): Promise<void> => {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: WinstonModule.createLogger({
      instance: createLogger({
        transports: new transports.Console({
          format: format.combine(
            format((info) => ({ ...info, level: info.level.toUpperCase().padStart(7, " ") }))(),
            format.colorize({ all: true }),
            format.ms(),
            format.timestamp({ format: "MM/DD/YYYY, hh:mm:ss A" }),
            format.printf(
              (info) =>
                `[Nest] - ${info.timestamp} ${info.level} ` +
                `\u001b[33m[${info.context}]\x1b[0m ${info.message} \u001b[33m${info.ms}\x1b[0m`,
            ),
          ),
        }),
      }),
    }),
  });
  app.enableShutdownHooks();
};
void bootstrap();
