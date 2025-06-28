import { describe, it, expect } from "vitest";
import { createZgClient } from "../../zg/schema.zg.js";

describe("ZG Playground Client", () => {
  it("should be able to import the generated client", () => {
    expect(createZgClient).toBeDefined();
  });
});
