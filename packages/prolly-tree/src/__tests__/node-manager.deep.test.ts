import { describe, it, expect, beforeEach } from "vitest";
import { NodeManager } from "../node-manager.js";
import { BlockManager } from "../block-store.js";
import {
  NodeProxy,
  Address,
  KeyValuePair,
  InternalNodeProxy,
  LeafNodeProxy,
  isLeafNodeProxy,
  BranchPair,
} from "../node-proxy.js";
import { Configuration, defaultConfiguration } from "../configuration.js";
import { fromString } from "uint8arrays/from-string";
import { faker } from "@faker-js/faker";
import { sampleSize } from "lodash-es";
import { sha256 } from "@noble/hashes/sha256";

// A helper to find the path from the root to the correct leaf for a given key.
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
    const nextAddress = internalNode.getAddress(childIndex);
    if (!nextAddress)
      throw new Error(`Failed to find address for child index: ${childIndex}`);

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
    const config: Configuration = {
      ...defaultConfiguration,
      treeDefinition: {
        targetFanout: 8,
        minFanout: 4,
      },
      hashingAlgorithm: "sha2-256",
    };
    blockManager = new BlockManager(config);
    nodeManager = new NodeManager(blockManager, config);
  });

  it("The Librarian of Babels Index: should handle mass insertions and updates", async () => {
    const manuscripts = Array.from({ length: MANUSCRIPT_COUNT }, () => ({
      id: faker.string.uuid(),
      content: faker.lorem.paragraph(),
    }));
    const manuscriptData = manuscripts.map((m) => ({
      key: fromString(m.id),
      value: fromString(m.content),
    }));

    let { address: rootAddress } = await nodeManager.createLeafNode([]);

    for (const data of manuscriptData) {
      const path = await findPathToLeaf(nodeManager, rootAddress, data.key);
      const leaf = path[path.length - 1] as LeafNodeProxy;

      let { newAddress: currentAddress, split } = await nodeManager._put(
        leaf,
        data.key,
        data.value
      );

      for (let i = path.length - 2; i >= 0; i--) {
        const parent = path[i] as InternalNodeProxy;
        const oldChildAddress = await blockManager.hashFn(path[i + 1].bytes);
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
        const { address } = await nodeManager.createInternalNode([
          { key: split.key, address: currentAddress },
          { key: new Uint8Array(), address: split.address },
        ]);
        rootAddress = address;
      } else {
        rootAddress = currentAddress;
      }
    }

    for (const data of manuscriptData) {
      const path = await findPathToLeaf(nodeManager, rootAddress, data.key);
      const leaf = path[path.length - 1] as LeafNodeProxy;
      const { found, index } = leaf.findKeyIndex(data.key);
      expect(found).toBe(true);
      const foundPair = leaf.getPair(index);
      expect(foundPair.value).toEqual(data.value);
    }

    const manuscriptsToUpdate = sampleSize(manuscriptData, 50).map((m) => ({
      ...m,
      value: fromString(faker.lorem.sentence()),
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
        const oldChildAddress = await blockManager.hashFn(path[i + 1].bytes);
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
        const { address } = await nodeManager.createInternalNode([
          { key: split.key, address: currentAddress },
          { key: new Uint8Array(), address: split.address },
        ]);
        rootAddress = address;
      } else {
        rootAddress = currentAddress;
      }
    }

    for (const data of manuscriptsToUpdate) {
      const path = await findPathToLeaf(nodeManager, rootAddress, data.key);
      const leaf = path[path.length - 1] as LeafNodeProxy;
      const { found, index } = leaf.findKeyIndex(data.key);
      expect(found).toBe(true);
      const foundPair = leaf.getPair(index);
      expect(foundPair.value).toEqual(data.value);
    }

    const unchangedManuscripts = manuscriptData.filter(
      (m) => !updatedIds.has(m.key.toString())
    );
    for (const data of sampleSize(unchangedManuscripts, 50)) {
      const path = await findPathToLeaf(nodeManager, rootAddress, data.key);
      const leaf = path[path.length - 1] as LeafNodeProxy;
      const { found, index } = leaf.findKeyIndex(data.key);
      expect(found).toBe(true);
      const foundPair = leaf.getPair(index);
      expect(foundPair.value).toEqual(data.value);
    }
  });
});
