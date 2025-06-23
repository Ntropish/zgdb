import { aura } from "../state";
import { createEffect } from "@tsmk/signals";

const nextTick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("Aura: Deleting Properties", () => {
  it("should handle property deletion and trigger effects", async () => {
    const state = aura<{ name?: string }>({ name: "Aura" });
    let latestName: string | undefined = "";
    let effectCallCount = 0;

    createEffect(() => {
      effectCallCount++;
      latestName = state.name;
    });

    expect(effectCallCount).toBe(1);
    expect(latestName).toBe("Aura");

    // We have to cast to any to delete a property on a typed object
    delete (state as any).name;
    await nextTick();

    expect(effectCallCount).toBe(2);
    expect(latestName).toBeUndefined();
  });
});
