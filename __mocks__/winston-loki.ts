export default jest.fn(() => ({
  _writableState: { objectMode: true },
  emit: jest.fn(),
  log: jest.fn(),
  on: jest.fn(),
  once: jest.fn(),
  pipe: jest.fn(),
  write: jest.fn(),
}));
