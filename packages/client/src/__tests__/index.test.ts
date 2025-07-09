import { describe, it, expect } from "vitest";
import { createDB } from "../index.js";

describe("client", () => {
  it("should be defined", () => {
    expect(createDB).toBeDefined();
  });
});
