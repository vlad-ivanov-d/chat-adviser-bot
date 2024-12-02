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
     * API key for AI
     */
    OPENAI_API_KEY?: string;
    /**
     * AI model
     */
    OPENAI_API_MODEL?: string;
    /**
     * AI API version
     */
    OPENAI_API_VERSION?: string;
    /**
     * URL for AI requests
     */
    OPENAI_BASE_URL?: string;
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
     * Telegram client API hash
     */
    TG_CLIENT_API_HASH?: string;
    /**
     * Telegram client API ID
     */
    TG_CLIENT_API_ID?: string;
    /**
     * Telegram bot API token
     */
    TG_TOKEN?: string;
    /**
     * Telegram bot webhook domain
     */
    TG_WEBHOOK_DOMAIN?: string;
    /**
     * Telegram bot webhook path
     */
    TG_WEBHOOK_PATH?: string;
    /**
     * Telegram bot webhook port
     */
    TG_WEBHOOK_PORT?: string;
    /**
     * Secret token to be sent back in Telegram webhook header for security
     */
    TG_WEBHOOK_SECRET_TOKEN?: string;
  }
}
