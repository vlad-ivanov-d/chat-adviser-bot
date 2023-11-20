// Telegram bot API token
process.env.BOT_TOKEN = "12345";
// Database user password
process.env.DATABASE_PASSWORD = "password";
// Database port
process.env.DATABASE_PORT = "5433";
// Database username
process.env.DATABASE_USER = "postgres";
// Connection URL for database server. Only for development and testing.
process.env.DATABASE_URL =
  `postgresql://${process.env.DATABASE_USER}:${process.env.DATABASE_PASSWORD}@` +
  `localhost:${process.env.DATABASE_PORT}/${process.env.DATABASE_USER}`;
