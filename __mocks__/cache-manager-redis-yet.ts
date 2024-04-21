export const redisStore = jest.fn(() => ({
  client: { quit: jest.fn() },
  reset: jest.fn(),
}));
