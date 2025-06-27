import { describe, it, expect, beforeEach } from "vitest";
import { Store } from "../store.js";
import { ProllyTree } from "../prolly-tree.js";
import { BlockManager } from "../block-store.js";
import { InternalNode } from "../node.js";

const enc = new TextEncoder();

// A configuration with a very small max node size to force splits easily
const splittingConfig = {
  treeDefinition: {
    targetFanout: 4,
    minFanout: 2,
  },
  valueChunking: {
    chunkingStrategy: "fastcdc-v2020" as const,
    maxInlineValueSize: 128,
    minChunkSize: 64,
    avgChunkSize: 128,
    maxChunkSize: 256, // small size to trigger splits
  },
  hashingAlgorithm: "blake3" as const,
};

describe("ProllyTree Splitting", () => {
  let store: Store;
  let tree: ProllyTree;
  let blockManager: BlockManager;

  beforeEach(async () => {
    store = new Store(splittingConfig);
    tree = await store.getTree();
    blockManager = store.blockManager;
  });

  it("should split a leaf node when it becomes too large", async () => {
    const initialRoot = tree.root;

    // Insert enough entries to cause a split
    for (let i = 0; i < 10; i++) {
      const key = `key${i}`;
      const value = `value${i}`;
      const result = await tree.put(enc.encode(key), enc.encode(value));
      tree = result.tree;
    }

    // After splitting, the root hash should have changed
    expect(tree.root).not.toEqual(initialRoot);

    // The new root should be an internal node
    const rootNode = await blockManager.getNode(tree.root);
    expect(rootNode).toBeDefined();
    expect(rootNode!.isLeaf).toBe(false);

    // It should have at least two children
    const internalRoot = rootNode as InternalNode;
    expect(internalRoot.children.length).toBeGreaterThanOrEqual(2);

    // Verify all keys are still retrievable
    for (let i = 0; i < 10; i++) {
      const key = `key${i}`;
      const value = await tree.get(enc.encode(key));
      expect(new TextDecoder().decode(value!)).toBe(`value${i}`);
    }
  });
});
