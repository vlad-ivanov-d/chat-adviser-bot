import { Logger } from "@nestjs/common";

import type { NextFunction } from "src/types/next-function";

/**
 * Logs request duration in milliseconds
 * @param ctx Middleware context
 * @param next Function to continue processing
 */
export const logRequestTime = async (ctx: unknown, next: NextFunction): Promise<void> => {
  const startTimestamp = Date.now();
  await next();
  new Logger().log(
    { labels: { request_time: Date.now() - startTimestamp }, message: "Update processing completed" },
    "TelegrafMiddleware",
  );
};
