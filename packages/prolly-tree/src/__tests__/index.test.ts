import { describe, it, expect } from "vitest";
import { ProllyTree, Store } from "../index";

describe("prolly-tree", () => {
  it("should have ProllyTree and Store defined", () => {
    expect(ProllyTree).toBeDefined();
    expect(Store).toBeDefined();
  });
});
