import { Test, type TestingModule } from "@nestjs/testing";

import { AppModule } from "./app.module";

describe("AppModule", () => {
  let testingModule: TestingModule;

  beforeEach(async () => {
    testingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
  });

  it("should be defined", () => {
    expect(testingModule).toBeDefined();
  });
});
