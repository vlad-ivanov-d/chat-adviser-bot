import type { TransformableInfo } from "logform";
import { WinstonModule } from "nest-winston";
import { createLogger, format, transports } from "winston";

/**
 * Creates template for logger
 * @param info Transformable info
 * @returns Formatted message for logger
 */
export const templateFunction = (info: TransformableInfo & { context?: string; timestamp?: string }): string =>
  `[Nest] - ${info.timestamp ?? ""} ${info.level} ` +
  `\x1B[33m[${info.context ?? ""}]\x1B[39m ${typeof info.message === "string" ? info.message : ""}`;

export const logger = WinstonModule.createLogger({
  instance: createLogger({
    transports: new transports.Console({
      format: format.combine(
        format((info) => ({ ...info, level: info.level.toUpperCase().padStart(7, " ") }))(),
        format.colorize({ all: true }),
        format.timestamp({ format: "MM/DD/YYYY, hh:mm:ss A" }),
        format.printf(templateFunction),
      ),
    }),
  }),
});
