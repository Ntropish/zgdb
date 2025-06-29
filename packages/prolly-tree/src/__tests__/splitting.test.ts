import { describe, it, expect, beforeEach } from "vitest";
import { ProllyTree } from "../prolly-tree.js";
import { BlockManager } from "../block-store.js";
import { Configuration, defaultConfiguration } from "../configuration.js";

const enc = new TextEncoder();

// A configuration with a very small max node size to force splits easily
const splittingConfig: Configuration = {
  ...defaultConfiguration,
  treeDefinition: {
    ...defaultConfiguration.treeDefinition,
    targetFanout: 4,
    minFanout: 2,
    boundaryChecker: {
      type: "prolly-v1",
      bits: 1, // High probability of splitting
      pattern: 0b1,
    },
  },
};

describe("ProllyTree Splitting", () => {
  let tree: ProllyTree;
  let blockManager: BlockManager;

  beforeEach(async () => {
    blockManager = new BlockManager(splittingConfig);
    tree = await ProllyTree.create(blockManager);
  });

  it("should split a leaf node when it becomes too large", async () => {
    const initialRoot = tree.root;

    // Insert enough entries to cause a split
    for (let i = 0; i < 10; i++) {
      const key = `key${i}`;
      const value = `value${i}`;
      await tree.put(enc.encode(key), enc.encode(value));
    }

    // After splitting, the root hash should have changed
    expect(tree.root).not.toEqual(initialRoot);

    // The new root should be an internal node with at least two children
    const treeState = JSON.parse(await tree.print());
    expect(treeState.type).toBe("internal");
    expect(treeState.children.length).toBeGreaterThanOrEqual(2);

    // Verify all keys are still retrievable
    for (let i = 0; i < 10; i++) {
      const key = `key${i}`;
      const value = await tree.get(enc.encode(key));
      expect(new TextDecoder().decode(value!)).toBe(`value${i}`);
    }
  });
});
