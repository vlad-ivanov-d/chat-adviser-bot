import type { LoggerService } from "@nestjs/common";
import type { TransformableInfo } from "logform";
import { WinstonModule } from "nest-winston";
import * as winston from "winston";
import LokiTransport from "winston-loki";

/**
 * Creates template for logger
 * @param info Transformable info
 * @returns Formatted message for logger
 */
export const templateFunction = (info: TransformableInfo & { context?: string; timestamp?: string }): string =>
  `[Nest] - ${info.timestamp ?? ""} ${info.level} ` +
  `\x1B[33m[${info.context ?? ""}]\x1B[39m ${typeof info.message === "string" ? info.message : ""}`;

/**
 * Creates logger service
 * @returns Logger service
 */
export const createLogger = (): LoggerService =>
  WinstonModule.createLogger({
    instance: winston.createLogger({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format((info) => ({ ...info, level: info.level.toUpperCase().padStart(7, " ") }))(),
            winston.format.colorize({ all: true }),
            winston.format.timestamp({ format: "MM/DD/YYYY, hh:mm:ss A" }),
            winston.format.printf(templateFunction),
          ),
        }),
        ...(process.env.LOKI_URL
          ? [new LokiTransport({ host: process.env.LOKI_URL, labels: { job: "syslog", service_name: "bot" } })]
          : []),
      ],
    }),
  });
