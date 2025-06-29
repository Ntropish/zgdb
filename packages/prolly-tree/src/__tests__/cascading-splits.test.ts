import { describe, it, expect, beforeEach } from "vitest";
import { Store } from "../store.js";
import { ProllyTree } from "../prolly-tree.js";
import { BlockManager } from "../block-store.js";
import {
  NodeProxy,
  isLeafNodeProxy,
  InternalNodeProxy,
} from "../node-proxy.js";
import { Configuration, defaultConfiguration } from "../configuration.js";

const enc = new TextEncoder();

const splittingConfig: Configuration = {
  ...defaultConfiguration,
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
  const rootNode = await prollyTree.nodeManager.getNode(prollyTree.root);
  if (!rootNode) {
    return [];
  }

  const queue: NodeProxy[] = [rootNode];
  collectedHashes.add(prollyTree.root.toString());

  while (queue.length > 0) {
    const node = queue.shift();
    if (node && !isLeafNodeProxy(node)) {
      const internalNode = node as InternalNodeProxy;
      for (let i = 0; i < internalNode.addressesLength; i++) {
        const childAddress = internalNode.getAddress(i);
        if (childAddress && !collectedHashes.has(childAddress.toString())) {
          collectedHashes.add(childAddress.toString());
          const childNode = await prollyTree.nodeManager.getNode(childAddress);
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
    const numEntries = 30;
    for (let i = 0; i < numEntries; i++) {
      const key = `key-${i.toString().padStart(4, "0")}`;
      const value = `value-${i}`;
      const result = await tree.put(enc.encode(key), enc.encode(value));
      tree = result.tree;
    }

    // Verification
    for (let i = 0; i < numEntries; i++) {
      const key = `key-${i.toString().padStart(4, "0")}`;
      const value = await tree.get(enc.encode(key));
      expect(new TextDecoder().decode(value!)).toBe(`value-${i}`);
    }

    const rootNode = (await tree.nodeManager.getNode(
      tree.root
    )) as InternalNodeProxy;
    expect(rootNode.isLeaf()).toBe(false);

    expect(rootNode.addressesLength).toBeGreaterThan(1);

    const nodeCount = (await collectNodeHashes(tree, blockManager)).length;

    // print the tree
    expect(nodeCount).toBeLessThan(100);

    const finalRoot = await tree.get(enc.encode("key-0000"));
    expect(finalRoot).toBeDefined();
  });
});
