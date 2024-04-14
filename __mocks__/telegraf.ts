// Names must match the original
/* eslint-disable @typescript-eslint/naming-convention */

export const Scenes = { Stage: jest.fn() };

export const Telegraf = jest.fn().mockReturnValue({
  launch: jest.fn(),
  telegram: { setMyCommands: jest.fn() },
  use: jest.fn(),
});
