declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * Telegram bot API token
     */
    BOT_TOKEN?: string;
    /**
     * Node environment
     */
    NODE_ENV?: "development" | "production" | "test";
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
  }
}
