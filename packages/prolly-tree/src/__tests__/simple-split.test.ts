import { describe, it, expect, beforeEach } from "vitest";
import { ProllyTree } from "../prolly-tree.js";
import { BlockManager } from "../block-store.js";
import { Configuration, defaultConfiguration } from "../configuration.js";
import { fromString } from "uint8arrays/from-string";
import { isLeafNodeProxy } from "../node-proxy.js";

const enc = new TextEncoder();

async function collectNodeHashes(tree: ProllyTree): Promise<string[]> {
  const collectedHashes: Set<string> = new Set();
  const rootNode = await tree.nodeManager.getNode(tree.root);
  if (!rootNode) {
    return [];
  }

  const queue: import("../node-proxy.js").NodeProxy[] = [rootNode];
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

describe("Simple Split Test", () => {
  let tree: ProllyTree;
  let blockManager: BlockManager;
  const config: Configuration = {
    ...defaultConfiguration,
    treeDefinition: {
      targetFanout: 2, // Force a split after 2 entries
      minFanout: 1,
    },
  };

  beforeEach(async () => {
    blockManager = new BlockManager(config);
    tree = await ProllyTree.create(blockManager);
  });

  it("should create a new root when the initial leaf splits", async () => {
    // Insert 3 items to trigger a split.
    // The leaf node will split into two nodes (with 2 and 1 items).
    // A new internal node will be created as the new root.
    let changed = false;
    ({ tree, changed } = await tree.put(
      enc.encode("key1"),
      enc.encode("val1")
    ));
    expect(changed).toBe(true);
    ({ tree, changed } = await tree.put(
      enc.encode("key2"),
      enc.encode("val2")
    ));
    expect(changed).toBe(true);
    ({ tree, changed } = await tree.put(
      enc.encode("key3"),
      enc.encode("val3")
    ));
    expect(changed).toBe(true);

    console.log("Tree structure after 3 insertions:");
    console.log(await tree.print());

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
    const rootNode = await tree.nodeManager.getNode(tree.root);
    expect(rootNode).toBeDefined();
    expect(rootNode!.isLeaf()).toBe(false); // The root should be an internal node

    const internalRoot =
      rootNode as import("../node-proxy.js").InternalNodeProxy;
    expect(internalRoot.keysLength).toBe(1);
    expect(internalRoot.addressesLength).toBe(2); // It should have two children

    // 3. Verify the total number of nodes
    const nodeCount = (await collectNodeHashes(tree)).length;
    expect(nodeCount).toBe(6); // 1 L2 root + 2 L1 internal + 3 L0 leaves
  });
});
