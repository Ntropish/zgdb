import { aura } from "../state";

describe("aura", () => {
  it("should create a reactive proxy for a simple object", () => {
    const state = aura({ count: 0 });
    expect(state.count).toBe(0);
    state.count++;
    expect(state.count).toBe(1);
  });

  it("should handle nested objects", () => {
    const state = aura({ nested: { value: "test" } });
    expect(state.nested.value).toBe("test");
    state.nested.value = "new test";
    expect(state.nested.value).toBe("new test");
  });

  it("should handle adding new properties", () => {
    const state = aura<{ count: number; name?: string }>({ count: 0 });
    state.name = "aura";
    expect(state.name).toBe("aura");
  });

  it("should not re-wrap an existing aura proxy", () => {
    const original = aura({ count: 0 });
    const wrapped = aura(original);
    expect(wrapped).toBe(original);
  });
});
