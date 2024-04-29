declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * Connection URL for Loki
     */
    LOKI_URL?: string;
    /**
     * Node environment
     */
    NODE_ENV?: "development" | "production" | "test";
    /**
     * Redis host
     */
    REDIS_HOST?: string;
    /**
     * Redis password
     */
    REDIS_PASSWORD?: string;
    /**
     * Redis port
     */
    REDIS_PORT?: string;
    /**
     * Telegram bot API token
     */
    TELEGRAM_TOKEN?: string;
    /**
     * Telegram bot webhook domain
     */
    TELEGRAM_WEBHOOK_DOMAIN?: string;
    /**
     * Telegram bot webhook path
     */
    TELEGRAM_WEBHOOK_PATH?: string;
    /**
     * Telegram bot webhook port
     */
    TELEGRAM_WEBHOOK_PORT?: string;
    /**
     * Secret token to be sent back in Telegram webhook header for security
     */
    TELEGRAM_WEBHOOK_SECRET_TOKEN?: string;
  }
}
