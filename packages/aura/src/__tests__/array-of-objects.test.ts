import { aura } from "../state";
import { createEffect } from "@tsmk/signals";

const nextTick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("Aura: Array of Objects", () => {
  it("should react to mutations on objects within an array", async () => {
    const state = aura<{ users: { id: number; name: string }[] }>({
      users: [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
      ],
    });

    let latestName = "";
    let effectCallCount = 0;

    createEffect(() => {
      effectCallCount++;
      latestName = state.users[0].name;
    });

    expect(effectCallCount).toBe(1);
    expect(latestName).toBe("Alice");

    state.users[0].name = "Alicia";
    await nextTick();

    expect(effectCallCount).toBe(2);
    expect(latestName).toBe("Alicia");
  });
});
