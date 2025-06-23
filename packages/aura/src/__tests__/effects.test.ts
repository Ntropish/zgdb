import { aura } from "../state";
import { createEffect } from "@tsmk/signals";

describe("Aura: Reactivity with Effects", () => {
  it("should run an effect when a dependency changes", () => {
    const state = aura({ count: 0 });
    let effectRunCount = 0;
    let latestValue = -1;

    createEffect(() => {
      effectRunCount++;
      latestValue = state.count;
    });

    // The effect should run once immediately.
    expect(effectRunCount).toBe(1);
    expect(latestValue).toBe(0);

    // Update the state and check if the effect runs again.
    state.count++;
    expect(effectRunCount).toBe(2);
    expect(latestValue).toBe(1);

    // Update it again to be sure.
    state.count = 42;
    expect(effectRunCount).toBe(3);
    expect(latestValue).toBe(42);
  });

  it("should handle multiple dependencies in an effect", () => {
    const state = aura({ a: 1, b: 2, c: 3 });
    let result = 0;

    createEffect(() => {
      result = state.a + state.b;
    });

    expect(result).toBe(3);

    state.a = 10;
    expect(result).toBe(12);

    state.b = 20;
    expect(result).toBe(30);

    // Should not re-run if a non-dependency changes.
    const oldResult = result;
    state.c = 100;
    expect(result).toBe(oldResult);
  });

  it("should handle nested dependencies", () => {
    const state = aura({ nested: { value: "hello" } });
    let result = "";

    createEffect(() => {
      result = state.nested.value.toUpperCase();
    });

    expect(result).toBe("HELLO");

    state.nested.value = "world";
    expect(result).toBe("WORLD");

    // Replace the nested object entirely
    state.nested = { value: "aura" };
    expect(result).toBe("AURA");
  });
});
