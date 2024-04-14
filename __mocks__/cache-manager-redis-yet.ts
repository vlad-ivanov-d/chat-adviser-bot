export const redisStore = jest.fn().mockReturnValue({
  client: { quit: jest.fn() },
  reset: jest.fn(),
});
