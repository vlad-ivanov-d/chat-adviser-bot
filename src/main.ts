import { NestFactory } from "@nestjs/core";
import type { TransformableInfo } from "logform";
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
            format.timestamp({ format: "MM/DD/YYYY, hh:mm:ss A" }),
            format.printf(
              (info: TransformableInfo & { context?: string; timestamp?: string }) =>
                `[Nest] - ${info.timestamp ?? ""} ${info.level} ` +
                `\u001b[33m[${info.context ?? ""}]\x1b[0m ${typeof info.message === "string" ? info.message : ""}`,
            ),
          ),
        }),
      }),
    }),
  });
  app.enableShutdownHooks();
};
void bootstrap();
