import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });

jest.mock("cache-manager-redis-yet", () => ({
  redisStore: jest.fn(() => ({
    client: { quit: jest.fn() },
    reset: jest.fn(),
  })),
}));

jest.mock("i18next", () => ({
  changeLanguage: jest.fn(),
  init: jest.fn(),
  t: jest.fn((key: string) => key),
}));

jest.mock("telegraf", () => ({
  Scenes: { Stage: jest.fn() },
  Telegraf: jest.fn(() => ({
    launch: jest.fn(),
    telegram: { setMyCommands: jest.fn() },
    use: jest.fn(),
  })),
}));

jest.mock("winston-loki", () =>
  jest.fn(() => ({
    _writableState: { objectMode: true },
    emit: jest.fn(),
    log: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    pipe: jest.fn(),
    write: jest.fn(),
  })),
);
