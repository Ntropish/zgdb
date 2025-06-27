import { describe, it, expect } from "vitest";
import { createClient } from "../index";

describe("client", () => {
  it("should be defined", () => {
    expect(createClient).toBeDefined();
  });
});
