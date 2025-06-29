import { describe, it, expect } from "vitest";
import { createClient } from "../index.js";

describe("client", () => {
  it("should be defined", () => {
    expect(createClient).toBeDefined();
  });
});
