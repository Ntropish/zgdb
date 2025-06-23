import { aura } from "../state";

describe("Aura: Deeply Nested and Circular Structures", () => {
  it("should handle deeply nested object updates", () => {
    const state = aura({
      level1: {
        level2: {
          level3: {
            value: 10,
          },
        },
      },
    });

    expect(state.level1.level2.level3.value).toBe(10);

    // Modify the deepest property
    state.level1.level2.level3.value = 20;
    expect(state.level1.level2.level3.value).toBe(20);

    // Replace an intermediate object
    state.level1.level2 = { level3: { value: 30 } };
    expect(state.level1.level2.level3.value).toBe(30);

    // The new object should also be reactive
    state.level1.level2.level3.value = 40;
    expect(state.level1.level2.level3.value).toBe(40);
  });

  it("should handle circular references without infinite loops", () => {
    type Node = { name: string; child?: Node; parent?: Node };

    const parent: Node = { name: "parent" };
    const child: Node = { name: "child" };

    parent.child = child;
    child.parent = parent;

    const state = aura(parent);

    // Test reading from the circular structure
    expect(state.name).toBe("parent");
    expect(state.child?.name).toBe("child");
    expect(state.child?.parent?.name).toBe("parent");
    expect(state.child?.parent?.child?.name).toBe("child");

    // Test writing to the circular structure
    state.child!.name = "updated child";
    expect(state.child!.name).toBe("updated child");
    expect(state.child!.parent!.child!.name).toBe("updated child");
  });
});
