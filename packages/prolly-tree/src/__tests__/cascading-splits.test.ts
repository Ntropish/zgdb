import { describe, it, expect, beforeEach } from "vitest";
import { Store } from "../store.js";
import { ProllyTree } from "../prolly-tree.js";
import { BlockManager } from "../block-store.js";
import { Node, isLeafNode, LeafNode, InternalNode } from "../node.js";
import { Configuration, defaultConfiguration } from "../configuration.js";

const enc = new TextEncoder();

const splittingConfig: Configuration = {
  treeDefinition: {
    targetFanout: 4,
    minFanout: 2,
  },
  valueChunking: {
    chunkingStrategy: "fastcdc-v2020",
    maxInlineValueSize: 128,
    minChunkSize: 64,
    avgChunkSize: 128,
    maxChunkSize: 256, // small size to trigger splits
  },
  hashingAlgorithm: "blake3",
};

async function collectNodeHashes(
  prollyTree: ProllyTree,
  blockManager: BlockManager
): Promise<string[]> {
  const collectedHashes: Set<string> = new Set();
  const rootNode = await blockManager.getNode(prollyTree.root);
  if (!rootNode) {
    return [];
  }

  const queue: Node[] = [rootNode];
  collectedHashes.add(prollyTree.root.toString());

  while (queue.length > 0) {
    const node = queue.shift();
    if (node && !isLeafNode(node)) {
      for (const childAddress of node.children) {
        if (!collectedHashes.has(childAddress.toString())) {
          collectedHashes.add(childAddress.toString());
          const childNode = await blockManager.getNode(childAddress);
          if (childNode) {
            queue.push(childNode);
          }
        }
      }
    }
  }

  return Array.from(collectedHashes);
}

describe("Cascading Splits", () => {
  let tree: ProllyTree;
  let blockManager: BlockManager;
  const config: Configuration = {
    ...defaultConfiguration,
    treeDefinition: {
      targetFanout: 2, // Small fanout to trigger splits easily
      minFanout: 1,
    },
  };

  beforeEach(async () => {
    blockManager = new BlockManager(config);
    tree = await ProllyTree.create(blockManager);
  });

  it("should handle multiple levels of splits correctly", async () => {
    // This test inserts enough entries to cause splits to cascade up the tree.
    // The number of entries needed depends on the node size.
    // With default config, nodes split around 32 entries.
    // To cause a cascading split, we need to fill up enough leaf nodes
    // to cause an internal node to split.
    const numEntries = 30; // Should be enough to cause multiple levels of splits
    let counts = [];
    for (let i = 0; i < numEntries; i++) {
      const key = `key-${i.toString().padStart(4, "0")}`; // Padded for consistent sorting
      const value = `value-${i}`;
      const result = await tree.put(enc.encode(key), enc.encode(value));
      tree = result.tree;
      const nodeCount = (await collectNodeHashes(tree, blockManager)).length;
      counts.push(`${i}: ${nodeCount}`);
    }

    // Verification
    // 1. Check if all keys are retrievable
    for (let i = 0; i < numEntries; i++) {
      const key = `key-${i.toString().padStart(4, "0")}`;
      const value = await tree.get(enc.encode(key));
      expect(new TextDecoder().decode(value!)).toBe(`value-${i}`);
    }

    // 2. Check the tree structure (optional, but good for debugging)
    const rootNode = (await blockManager.getNode(tree.root)) as InternalNode;
    expect(rootNode.isLeaf).toBe(false);

    // The root should have children, indicating at least one split happened.
    expect(rootNode.children.length).toBeGreaterThan(1);

    // 3. Check for runaway node creation (a symptom of the previous bug)
    const nodeCount = (await collectNodeHashes(tree, blockManager)).length;
    // The exact number is hard to predict, but it should be reasonable.
    // For 10 entries with a fanout of 2, we should see significant branching.
    expect(nodeCount).toBeLessThan(100);

    const finalRoot = await tree.get(enc.encode("key-0000"));
    expect(finalRoot).toBeDefined();
  });
});
