import { describe, it, expect, beforeEach } from "vitest";
import { NodeManager } from "../node-manager.js";
import { BlockManager } from "../block-store.js";
import {
  NodeProxy,
  Address,
  KeyValuePair,
  InternalNodeProxy,
  LeafNodeProxy,
  createInternalNodeBuffer,
  isLeafNodeProxy,
} from "../node-proxy.js";
import { Configuration } from "../configuration.js";
import { fromString } from "uint8arrays/from-string";
import { faker } from "@faker-js/faker";
import { compare } from "uint8arrays/compare";
import { sampleSize } from "lodash-es";

// A helper to find the path from the root to the correct leaf for a given key.
// This simulates the traversal logic that a tree implementation would use.
async function findPathToLeaf(
  nodeManager: NodeManager,
  rootAddress: Address,
  key: Uint8Array
): Promise<NodeProxy[]> {
  const path: NodeProxy[] = [];
  let current = await nodeManager.getNode(rootAddress);
  if (!current) throw new Error("Root node not found");
  path.push(current);

  while (!isLeafNodeProxy(current)) {
    const internalNode = current as InternalNodeProxy;
    const childIndex = internalNode.findChildIndex(key);

    const nextAddress = internalNode.getBranch(childIndex).address;

    current = await nodeManager.getNode(nextAddress);
    if (!current)
      throw new Error(`Failed to find node at address: ${nextAddress}`);
    path.push(current);
  }
  return path;
}

describe("NodeManager Deep Tests", () => {
  let blockManager: BlockManager;
  let nodeManager: NodeManager;
  const MANUSCRIPT_COUNT = 500;

  beforeEach(() => {
    // The config object is now implicitly created by the BlockManager
    blockManager = new BlockManager({
      treeDefinition: {
        targetFanout: 8, // Use a smaller fanout to trigger more splits
        minFanout: 4,
      },
      hashingAlgorithm: "sha2-256",
    });
    nodeManager = new NodeManager(blockManager, blockManager.config);
  });

  it("The Librarian of Babels Index: should handle mass insertions and updates", async () => {
    // 1. Generate Manuscripts
    const manuscripts = new Array(MANUSCRIPT_COUNT).fill(0).map(() => ({
      id: faker.string.uuid(),
      content: faker.lorem.paragraph(),
    }));
    const manuscriptData = manuscripts.map((m) => ({
      key: fromString(m.id),
      value: fromString(m.content),
    }));

    // 2. Insert all manuscripts, simulating the tree's growth
    let { address: rootAddress } = await nodeManager.createLeafNode([]);

    for (const data of manuscriptData) {
      const path = await findPathToLeaf(nodeManager, rootAddress, data.key);
      const leaf = path[path.length - 1] as LeafNodeProxy;

      let { newAddress: currentAddress, split } = await nodeManager._put(
        leaf,
        data.key,
        data.value
      );

      // Propagate splits up the tree
      for (let i = path.length - 2; i >= 0; i--) {
        const parent = path[i] as InternalNodeProxy;
        const oldChildAddress = blockManager.hashFn(path[i + 1].bytes);
        const result = await nodeManager.updateChild(
          parent,
          oldChildAddress,
          currentAddress,
          split
        );
        currentAddress = result.newAddress;
        split = result.split;
      }

      // If a split propagates all the way to the root, create a new root
      if (split) {
        // This is a simplified root creation. A real tree would need to handle subtree entry counts.
        const newRootBytes = createInternalNodeBuffer(
          [
            { key: split.key, address: currentAddress },
            { key: new Uint8Array(), address: split.address },
          ],
          leaf.entryCount * 2
        ); // Placeholder entry count
        rootAddress = await blockManager.put(newRootBytes);
      } else {
        rootAddress = currentAddress;
      }
    }

    // 3. Verify all manuscripts are retrievable
    for (const data of manuscriptData) {
      const path = await findPathToLeaf(nodeManager, rootAddress, data.key);
      const leaf = path[path.length - 1] as LeafNodeProxy;
      const foundIndex = leaf.findEntryIndex(data.key);
      expect(foundIndex).toBeGreaterThanOrEqual(0);
      const foundPair = leaf.getEntry(foundIndex);
      expect(foundPair.value).toEqual(data.value);
    }

    // 4. Update a random subset of manuscripts
    const manuscriptsToUpdate = sampleSize(manuscriptData, 50).map((m) => ({
      ...m,
      value: fromString(faker.lorem.sentence()), // new, shorter content
    }));
    const updatedIds = new Set(
      manuscriptsToUpdate.map((m) => m.key.toString())
    );

    for (const data of manuscriptsToUpdate) {
      const path = await findPathToLeaf(nodeManager, rootAddress, data.key);
      const leaf = path[path.length - 1] as LeafNodeProxy;

      let { newAddress: currentAddress, split } = await nodeManager._put(
        leaf,
        data.key,
        data.value
      );

      for (let i = path.length - 2; i >= 0; i--) {
        const parent = path[i] as InternalNodeProxy;
        const oldChildAddress = blockManager.hashFn(path[i + 1].bytes);
        const result = await nodeManager.updateChild(
          parent,
          oldChildAddress,
          currentAddress,
          split
        );
        currentAddress = result.newAddress;
        split = result.split;
      }

      if (split) {
        const newRootBytes = createInternalNodeBuffer(
          [
            { key: split.key, address: currentAddress },
            { key: new Uint8Array(), address: split.address },
          ],
          leaf.entryCount * 2
        ); // Placeholder entry count
        rootAddress = await blockManager.put(newRootBytes);
      } else {
        rootAddress = currentAddress;
      }
    }

    // 5. Verify updated manuscripts and a sample of truly unchanged ones
    for (const data of manuscriptsToUpdate) {
      const path = await findPathToLeaf(nodeManager, rootAddress, data.key);
      const leaf = path[path.length - 1] as LeafNodeProxy;
      const foundIndex = leaf.findEntryIndex(data.key);
      expect(foundIndex).toBeGreaterThanOrEqual(0);
      const foundPair = leaf.getEntry(foundIndex);
      expect(foundPair.value).toEqual(data.value);
    }

    const unchangedManuscripts = manuscriptData.filter(
      (m) => !updatedIds.has(m.key.toString())
    );
    for (const data of sampleSize(unchangedManuscripts, 50)) {
      const path = await findPathToLeaf(nodeManager, rootAddress, data.key);
      const leaf = path[path.length - 1] as LeafNodeProxy;
      const foundIndex = leaf.findEntryIndex(data.key);
      expect(foundIndex).toBeGreaterThanOrEqual(0);
      const foundPair = leaf.getEntry(foundIndex);
      expect(foundPair.value).toEqual(data.value);
    }
  });
});
