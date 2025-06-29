import { describe, it, expect, beforeEach } from "vitest";
import { NodeManager } from "../node-manager.js";
import { BlockManager } from "../block-store.js";
import {
  Address,
  KeyValuePair,
  LeafNodeProxy,
  InternalNodeProxy,
  Branch,
} from "../node-proxy.js";
import { Configuration, defaultConfiguration } from "../configuration.js";
import { fromString } from "uint8arrays/from-string";

describe("NodeManager", () => {
  let blockManager: BlockManager;
  let nodeManager: NodeManager;
  let config: Configuration;

  beforeEach(() => {
    config = {
      ...defaultConfiguration,
      treeDefinition: {
        ...defaultConfiguration.treeDefinition,
        targetFanout: 4,
        minFanout: 2,
        boundaryChecker: {
          type: "prolly-v1",
          bits: 2,
          pattern: 0b11,
        },
      },
      hashingAlgorithm: "sha2-256",
    };
    blockManager = new BlockManager(config);
    nodeManager = new NodeManager(blockManager, config);
  });

  it("should get an existing node", async () => {
    const { address } = await nodeManager.createLeafNode([
      { key: fromString("a"), value: fromString("value-a") },
    ]);

    const retrievedNode = await nodeManager.getNode(address);
    expect(retrievedNode).toBeDefined();
    expect(retrievedNode!.isLeaf()).toBe(true);
    const retrievedAddress = await blockManager.hashFn(retrievedNode!.bytes);
    expect(retrievedAddress).toEqual(address);
  });

  it("should create a new leaf node", async () => {
    const pairs: KeyValuePair[] = [
      { key: fromString("key1"), value: fromString("value1") },
    ];
    const { node, address } = await nodeManager.createLeafNode(pairs);

    expect(node).toBeDefined();
    expect(node.isLeaf()).toBe(true);
    expect(node.length).toBe(1);

    const storedBytes = await blockManager.get(address);
    expect(storedBytes).toBeDefined();
  });

  it("should split a leaf node that is too full", async () => {
    const pairs: KeyValuePair[] = [
      { key: fromString("a"), value: fromString("val-a") },
      { key: fromString("b"), value: fromString("val-b") },
      { key: fromString("c"), value: fromString("val-c") },
      { key: fromString("d"), value: fromString("val-d") },
    ];
    const { node: fullNode } = await nodeManager.createLeafNode(pairs);

    const newBranches = await nodeManager.splitNode(fullNode);

    expect(newBranches).toBeDefined();
    expect(newBranches.length).toBeGreaterThanOrEqual(1);

    let totalKeys = 0;
    for (const branch of newBranches) {
      const node = (await nodeManager.getNode(branch.address)) as LeafNodeProxy;
      totalKeys += node.length;
    }
    expect(totalKeys).toEqual(pairs.length);
  });

  it("should split an internal node that is too full", async () => {
    const children: Branch[] = [];
    for (let i = 0; i < 4; i++) {
      const { address } = await nodeManager.createLeafNode([
        { key: fromString(`k${i}`), value: fromString(`v${i}`) },
      ]);
      children.push({ key: fromString(`k${i}`), address });
    }

    const { node: fullNode } = await nodeManager.createInternalNode(children);

    const newBranches = await nodeManager.splitNode(fullNode);

    expect(newBranches).toBeDefined();
    expect(newBranches.length).toBeGreaterThanOrEqual(1);

    let totalBranches = 0;
    for (const branch of newBranches) {
      const node = (await nodeManager.getNode(
        branch.address
      )) as InternalNodeProxy;
      totalBranches += node.length;
    }
    expect(totalBranches).toEqual(children.length);
  });

  describe("_put", () => {
    it("should insert a key-value pair into a non-full leaf node", async () => {
      const pairs: KeyValuePair[] = [
        { key: fromString("a"), value: fromString("val-a") },
      ];
      const { node: leaf } = await nodeManager.createLeafNode(pairs);

      const { newAddress, newBranches } = await nodeManager._put(
        leaf,
        fromString("b"),
        fromString("val-b")
      );

      expect(newBranches).toBeUndefined();
      const newNode = (await nodeManager.getNode(newAddress)) as LeafNodeProxy;
      expect(newNode).toBeDefined();
      expect(newNode.length).toBe(2);
    });

    it("should update the value for an existing key", async () => {
      const pairs: KeyValuePair[] = [
        { key: fromString("a"), value: fromString("val-a") },
      ];
      const { node: leaf } = await nodeManager.createLeafNode(pairs);

      const { newAddress, newBranches } = await nodeManager._put(
        leaf,
        fromString("a"),
        fromString("new-val-a")
      );

      expect(newBranches).toBeUndefined();
      const newNode = (await nodeManager.getNode(newAddress)) as LeafNodeProxy;
      expect(newNode).toBeDefined();
      expect(newNode.length).toBe(1);
      expect(newNode.getPair(0).value).toEqual(fromString("new-val-a"));
    });

    it("should split a leaf node when _put makes it too full", async () => {
      // This test is probabilistic. We create enough data to make a split highly likely.
      let { node: leaf, address: leafAddress } =
        await nodeManager.createLeafNode([
          { key: fromString("a"), value: fromString("val-a") },
        ]);

      // Create a large number of pairs to insert
      const newPairs: KeyValuePair[] = Array.from({ length: 20 }, (_, i) => ({
        key: fromString(`new_key_${i.toString().padStart(2, "0")}`),
        value: fromString(`new_val_${i}`),
      }));

      let newBranches: Branch[] | undefined;
      for (const pair of newPairs) {
        const result = await nodeManager._put(leaf, pair.key, pair.value);
        leafAddress = result.newAddress; // The address of the node might change
        leaf = (await nodeManager.getNode(leafAddress)) as LeafNodeProxy;
        if (result.newBranches) {
          newBranches = result.newBranches;
          break; // A split occurred, we can stop inserting
        }
      }

      expect(newBranches).toBeDefined();
      expect(newBranches!.length).toBeGreaterThan(1);
    });
  });

  describe("updateChild", () => {
    it("should update a child address in an internal node without a split", async () => {
      const { address: child1Address } = await nodeManager.createLeafNode([
        { key: fromString("c1"), value: fromString("v1") },
      ]);
      const { address: child2Address } = await nodeManager.createLeafNode([
        { key: fromString("c2"), value: fromString("v2") },
      ]);
      const { node: parent } = await nodeManager.createInternalNode([
        { key: fromString("m1"), address: child1Address },
        { key: fromString("m2"), address: child2Address },
      ]);

      const { address: newChild1Address } = await nodeManager.createLeafNode([
        { key: fromString("a"), value: fromString("val-a") },
      ]);

      const { newAddress, newBranches } = await nodeManager.updateChild(
        parent,
        child1Address,
        [{ key: fromString("a"), address: newChild1Address }]
      );

      expect(newBranches).toBeUndefined();
      const updatedParent = (await nodeManager.getNode(
        newAddress
      )) as InternalNodeProxy;
      expect(updatedParent).toBeDefined();
      expect(updatedParent.getBranch(0).address).toEqual(newChild1Address);
    });

    it("should update a child address and handle a split", async () => {
      const initialChildren: Branch[] = [];
      for (let i = 0; i < 3; i++) {
        const { address } = await nodeManager.createLeafNode([]);
        initialChildren.push({ key: fromString(`c${i}`), address });
      }

      const { node: parent } = await nodeManager.createInternalNode(
        initialChildren
      );

      const replacingBranches: Branch[] = [];
      for (let i = 0; i < 20; i++) {
        const { address } = await nodeManager.createLeafNode([]);
        replacingBranches.push({ key: fromString(`r${i}`), address });
      }

      const { newBranches } = await nodeManager.updateChild(
        parent,
        initialChildren[0].address,
        replacingBranches
      );

      expect(newBranches).toBeDefined();
      expect(newBranches!.length).toBeGreaterThan(1);
    });
  });
});
