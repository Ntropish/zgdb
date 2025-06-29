import { describe, it, expect, beforeEach } from "vitest";
import { ProllyTree } from "../prolly-tree.js";
import { BlockManager } from "../block-store.js";
import { Configuration, defaultConfiguration } from "../configuration.js";
import { fromString } from "uint8arrays/from-string";

const enc = new TextEncoder();

describe("Simple Split Test", () => {
  let tree: ProllyTree;
  let blockManager: BlockManager;
  const config: Configuration = {
    ...defaultConfiguration,
    treeDefinition: {
      ...defaultConfiguration.treeDefinition,
      targetFanout: 2, // The node chunker will still use this as a hint
      minFanout: 1,
      boundaryChecker: {
        type: "prolly-v1",
        bits: 1, // High probability of splitting
        pattern: 0b1,
      },
    },
  };

  beforeEach(async () => {
    blockManager = new BlockManager(config);
    tree = await ProllyTree.create(blockManager);
  });

  it("should create a new root when the initial leaf splits", async () => {
    // Insert 3 items to trigger a split.
    // The leaf node will split into two nodes.
    // A new internal node will be created as the new root.
    await tree.put(enc.encode("key1"), enc.encode("val1"));
    await tree.put(enc.encode("key2"), enc.encode("val2"));
    await tree.put(enc.encode("key3"), enc.encode("val3"));

    // 1. Verify all keys are retrievable
    expect(
      new TextDecoder().decode((await tree.get(enc.encode("key1")))!)
    ).toBe("val1");
    expect(
      new TextDecoder().decode((await tree.get(enc.encode("key2")))!)
    ).toBe("val2");
    expect(
      new TextDecoder().decode((await tree.get(enc.encode("key3")))!)
    ).toBe("val3");

    // 2. Verify the tree structure
    const treeState = JSON.parse(await tree.print());
    expect(treeState.type).toBe("internal"); // The root should be an internal node
    expect(treeState.children.length).toBeGreaterThanOrEqual(2); // It should have at least two children
  });
});
