declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * Telegram bot API token
     */
    BOT_TOKEN?: string;
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
     * Telegram bot webhook domain
     */
    WEBHOOK_DOMAIN?: string;
    /**
     * Telegram bot webhook path
     */
    WEBHOOK_PATH?: string;
    /**
     * Telegram bot webhook port
     */
    WEBHOOK_PORT?: string;
    /**
     * Secret token to be sent back in Telegram webhook header for security
     */
    WEBHOOK_SECRET_TOKEN?: string;
  }
}
