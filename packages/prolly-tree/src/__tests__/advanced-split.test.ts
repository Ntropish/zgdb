import { describe, it, expect, beforeEach } from "vitest";
import { ProllyTree } from "../prolly-tree.js";
import { BlockManager } from "../block-store.js";
import { Configuration, defaultConfiguration } from "../configuration.js";
import { fromString } from "uint8arrays/from-string";
import { isLeafNodeProxy, NodeProxy } from "../node-proxy.js";

const enc = new TextEncoder();

async function collectNodeHashes(tree: ProllyTree): Promise<string[]> {
  const collectedHashes: Set<string> = new Set();
  const rootNode = await tree.nodeManager.getNode(tree.root);
  if (!rootNode) {
    return [];
  }

  const queue: NodeProxy[] = [rootNode];
  collectedHashes.add(tree.root.toString());

  while (queue.length > 0) {
    const node = queue.shift();
    if (node && !isLeafNodeProxy(node)) {
      const internalNode = node as import("../node-proxy.js").InternalNodeProxy;
      for (let i = 0; i < internalNode.addressesLength; i++) {
        const childAddress = internalNode.getAddress(i);
        if (childAddress && !collectedHashes.has(childAddress.toString())) {
          collectedHashes.add(childAddress.toString());
          const childNode = await tree.nodeManager.getNode(childAddress);
          if (childNode) {
            queue.push(childNode);
          }
        }
      }
    }
  }

  return Array.from(collectedHashes);
}

describe("Advanced Split Test", () => {
  let tree: ProllyTree;
  let blockManager: BlockManager;
  const config: Configuration = {
    ...defaultConfiguration,
    treeDefinition: {
      targetFanout: 3, // A slightly larger fanout
      minFanout: 2,
    },
  };

  beforeEach(async () => {
    blockManager = new BlockManager(config);
    tree = await ProllyTree.create(blockManager);
  });

  it("should handle multiple splits and maintain tree balance", async () => {
    const numEntries = 10;
    const entries: { key: Uint8Array; value: Uint8Array }[] = [];
    for (let i = 0; i < numEntries; i++) {
      const key = enc.encode(`key${i.toString().padStart(2, "0")}`);
      const value = enc.encode(`val${i}`);
      entries.push({ key, value });
      const { tree: newTree } = await tree.put(key, value);
      tree = newTree;
    }

    console.log("Tree structure after 10 insertions (fanout 3):");
    console.log(await tree.print());

    // 1. Verify all keys are retrievable
    for (const entry of entries) {
      const val = await tree.get(entry.key);
      expect(new TextDecoder().decode(val!)).toEqual(
        new TextDecoder().decode(entry.value)
      );
    }

    // 2. Verify tree structure
    const rootNode = await tree.nodeManager.getNode(tree.root);
    expect(rootNode).toBeDefined();
    expect(rootNode!.isLeaf()).toBe(false);
    expect(rootNode!.level).toBe(2);

    // With 10 entries and a fanout of 3, we expect a root with 2 children,
    // which in turn point to a total of 4 leaf nodes.
    const internalRoot =
      rootNode as import("../node-proxy.js").InternalNodeProxy;
    expect(internalRoot.addressesLength).toBe(2);

    // 3. Verify total node count
    // 1 root + 2 L1 internal nodes + 4 L0 leaf nodes = 7 total nodes
    const nodeCount = (await collectNodeHashes(tree)).length;
    expect(nodeCount).toBe(7);
  });
});
