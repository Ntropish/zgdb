import { aura } from "../state";
import { createEffect } from "@tsmk/signals";

describe("Aura: Dynamic Properties and Arrays", () => {
  it("should make dynamically added properties reactive", async () => {
    const state = aura<{ name?: string; details?: { age: number } }>({});
    let effectCallCount = 0;
    let latestName = "";
    let latestAge = 0;

    createEffect(() => {
      effectCallCount++;
      latestName = state.name || "default";
      if (state.details) {
        latestAge = state.details.age;
      }
    });

    expect(effectCallCount).toBe(1);
    expect(latestName).toBe("default");

    // Add a new property
    await (state.name = "Aura");
    expect(effectCallCount).toBe(2);
    expect(latestName).toBe("Aura");

    // Add a nested object
    await (state.details = { age: 1 });
    expect(effectCallCount).toBe(3);
    expect(latestAge).toBe(1);

    // Update the nested object's property
    await (state.details.age = 2);

    expect(effectCallCount).toBe(4);
    expect(latestAge).toBe(2);
  });

  it("should react to array mutations", async () => {
    const state = aura<{ items: string[] }>({ items: ["a", "b"] });
    let effectCallCount = 0;
    let latestLength = 0;
    let latestFirstItem = "";

    createEffect(() => {
      effectCallCount++;
      latestLength = state.items.length;
      latestFirstItem = state.items[0];
    });

    expect(effectCallCount).toBe(1);
    expect(latestLength).toBe(2);
    expect(latestFirstItem).toBe("a");

    // Test push
    await state.items.push("c");
    expect(effectCallCount).toBe(2);
    expect(latestLength).toBe(3);

    // Test direct index set
    await (state.items[0] = "z");
    expect(effectCallCount).toBe(3);
    expect(latestFirstItem).toBe("z");
  });
});
