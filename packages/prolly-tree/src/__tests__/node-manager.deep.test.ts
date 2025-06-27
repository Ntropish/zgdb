import { describe, it, expect, beforeEach } from "vitest";
import { NodeManager } from "../node-manager.js";
import { BlockManager } from "../block-store.js";
import {
  Node,
  Address,
  KeyValuePair,
  InternalNode,
  LeafNode,
  createInternalNode,
  createLeafNode,
} from "../node.js";
import { Configuration, defaultConfiguration } from "../configuration.js";
import { fromString } from "uint8arrays/from-string";
import { faker } from "@faker-js/faker";
import { compare } from "uint8arrays/compare";

// A helper to find the path from the root to the correct leaf for a given key.
// This simulates the traversal logic that a tree implementation would use.
async function findPathToLeaf(
  nodeManager: NodeManager,
  rootAddress: Address,
  key: Uint8Array
): Promise<Node[]> {
  const path: Node[] = [];
  let current = await nodeManager.getNode(rootAddress);
  if (!current) throw new Error("Root node not found");
  path.push(current);

  while (!current.isLeaf) {
    const internalNode = current as InternalNode;
    const childIndex = internalNode.keys.findIndex((k) => compare(key, k) < 0);

    const nextAddress =
      childIndex === -1
        ? internalNode.children[internalNode.children.length - 1]
        : internalNode.children[childIndex];

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
  let config: Configuration;
  const MANUSCRIPT_COUNT = 500;

  beforeEach(() => {
    config = {
      ...defaultConfiguration,
      treeDefinition: {
        targetFanout: 8, // Use a smaller fanout to trigger more splits
        minFanout: 4,
      },
      hashingAlgorithm: "sha2-256",
    };
    blockManager = new BlockManager(config);
    nodeManager = new NodeManager(blockManager, config);
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
    let rootNode = await nodeManager.createLeafNode([]);
    let rootAddress = rootNode.address!;

    for (const data of manuscriptData) {
      const path = await findPathToLeaf(nodeManager, rootAddress, data.key);
      const leaf = path[path.length - 1];

      let { newAddress: currentAddress, split } = await nodeManager._put(
        leaf,
        data.key,
        data.value
      );

      // Propagate splits up the tree
      for (let i = path.length - 2; i >= 0; i--) {
        const parent = path[i];
        const oldChildAddress = path[i + 1].address!;
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
        const newRoot = await nodeManager.createNode(
          [],
          [split.key],
          [currentAddress, split.address],
          false
        );
        rootAddress = newRoot.address!;
      } else {
        rootAddress = currentAddress;
      }
    }

    // 3. Verify all manuscripts are retrievable
    for (const data of manuscriptData) {
      const path = await findPathToLeaf(nodeManager, rootAddress, data.key);
      const leaf = path[path.length - 1] as LeafNode;
      const foundPair = leaf.pairs.find((p) => compare(p[0], data.key) === 0);
      expect(foundPair).toBeDefined();
      expect(foundPair![1]).toEqual(data.value);
    }

    // 4. Update a random subset of manuscripts
    const manuscriptsToUpdate = manuscriptData.slice(0, 50).map((m) => ({
      ...m,
      value: fromString(faker.lorem.sentence()), // new, shorter content
    }));

    for (const data of manuscriptsToUpdate) {
      const path = await findPathToLeaf(nodeManager, rootAddress, data.key);
      const leaf = path[path.length - 1];

      let { newAddress: currentAddress, split } = await nodeManager._put(
        leaf,
        data.key,
        data.value
      );

      for (let i = path.length - 2; i >= 0; i--) {
        const parent = path[i];
        const oldChildAddress = path[i + 1].address!;
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
        const newRoot = await nodeManager.createNode(
          [],
          [split.key],
          [currentAddress, split.address],
          false
        );
        rootAddress = newRoot.address!;
      } else {
        rootAddress = currentAddress;
      }
    }

    // 5. Verify updated manuscripts and a sample of unchanged ones
    for (const data of manuscriptsToUpdate) {
      const path = await findPathToLeaf(nodeManager, rootAddress, data.key);
      const leaf = path[path.length - 1] as LeafNode;
      const foundPair = leaf.pairs.find((p) => compare(p[0], data.key) === 0);
      expect(foundPair).toBeDefined();
      expect(foundPair![1]).toEqual(data.value);
    }
    for (const data of manuscriptData.slice(50, 100)) {
      const path = await findPathToLeaf(nodeManager, rootAddress, data.key);
      const leaf = path[path.length - 1] as LeafNode;
      const foundPair = leaf.pairs.find((p) => compare(p[0], data.key) === 0);
      expect(foundPair).toBeDefined();
      expect(foundPair![1]).toEqual(data.value);
    }
  });
});
