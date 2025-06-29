import { describe, it, expect, beforeEach } from "vitest";
import { NodeManager } from "../node-manager.js";
import { BlockManager } from "../block-store.js";
import {
  Address,
  KeyValuePair,
  createLeafNodeBuffer,
  createInternalNodeBuffer,
  LeafNodeProxy,
  InternalNodeProxy,
} from "../node-proxy.js";
import { Configuration, defaultConfiguration } from "../configuration.js";
import { fromString } from "uint8arrays/from-string";
import { sha256 } from "@noble/hashes/sha256";

describe("NodeManager", () => {
  let blockManager: BlockManager;
  let nodeManager: NodeManager;
  let config: Configuration;

  beforeEach(() => {
    config = {
      ...defaultConfiguration,
      treeDefinition: {
        targetFanout: 4,
        minFanout: 2,
      },
      hashingAlgorithm: "sha2-256",
    };
    blockManager = new BlockManager(config);
    nodeManager = new NodeManager(blockManager, config);
  });

  it("should get an existing node", async () => {
    const bytes = createLeafNodeBuffer(
      [{ key: fromString("a"), value: fromString("value-a") }],
      0
    );
    const address = await blockManager.put(bytes);

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
    expect(node.keysLength).toBe(1);

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
    const bytes = createLeafNodeBuffer(pairs, 0);
    const fullNode = new LeafNodeProxy(bytes, nodeManager);

    const { newAddress, split } = await nodeManager.splitNode(fullNode);

    expect(newAddress).toBeDefined();
    expect(split).toBeDefined();
    expect(split!.key).toEqual(fromString("c"));

    const leftNode = (await nodeManager.getNode(newAddress)) as LeafNodeProxy;
    const rightNode = (await nodeManager.getNode(
      split!.address
    )) as LeafNodeProxy;

    expect(leftNode).toBeDefined();
    expect(leftNode.keysLength).toBe(2);

    expect(rightNode).toBeDefined();
    expect(rightNode.keysLength).toBe(2);
  });

  it("should split an internal node that is too full", async () => {
    const children: Address[] = [
      sha256(fromString("child1")),
      sha256(fromString("child2")),
      sha256(fromString("child3")),
      sha256(fromString("child4")),
    ];
    const branches = [
      { key: fromString("b"), address: children[0] },
      { key: fromString("d"), address: children[1] },
      { key: fromString("f"), address: children[2] },
      { key: new Uint8Array(), address: children[3] },
    ];

    const bytes = createInternalNodeBuffer(branches, 100, 1);
    const fullNode = new InternalNodeProxy(bytes, nodeManager);

    const { newAddress, split } = await nodeManager.splitNode(fullNode);

    expect(newAddress).toBeDefined();
    expect(split).toBeDefined();
    expect(split!.key).toEqual(fromString("d"));

    const leftNode = (await nodeManager.getNode(
      newAddress
    )) as InternalNodeProxy;
    const rightNode = (await nodeManager.getNode(
      split!.address
    )) as InternalNodeProxy;

    expect(leftNode).toBeDefined();
    expect(leftNode.addressesLength).toBe(2);

    expect(rightNode).toBeDefined();
    expect(rightNode.addressesLength).toBe(2);
  });

  describe("_put", () => {
    it("should insert a key-value pair into a non-full leaf node", async () => {
      const pairs: KeyValuePair[] = [
        { key: fromString("a"), value: fromString("val-a") },
      ];
      const { node: leaf } = await nodeManager.createLeafNode(pairs);

      const { newAddress, split } = await nodeManager._put(
        leaf,
        fromString("b"),
        fromString("val-b")
      );

      expect(split).toBeUndefined();
      const newNode = (await nodeManager.getNode(newAddress)) as LeafNodeProxy;
      expect(newNode).toBeDefined();
      expect(newNode.keysLength).toBe(2);
    });

    it("should update the value for an existing key", async () => {
      const pairs: KeyValuePair[] = [
        { key: fromString("a"), value: fromString("val-a") },
      ];
      const { node: leaf } = await nodeManager.createLeafNode(pairs);

      const { newAddress, split } = await nodeManager._put(
        leaf,
        fromString("a"),
        fromString("new-val-a")
      );

      expect(split).toBeUndefined();
      const newNode = (await nodeManager.getNode(newAddress)) as LeafNodeProxy;
      expect(newNode).toBeDefined();
      expect(newNode.keysLength).toBe(1);
      expect(newNode.getPair(0).value).toEqual(fromString("new-val-a"));
    });

    it("should split a leaf node when _put makes it too full", async () => {
      const pairs: KeyValuePair[] = [
        { key: fromString("a"), value: fromString("val-a") },
        { key: fromString("b"), value: fromString("val-b") },
        { key: fromString("c"), value: fromString("val-c") },
      ];
      const { node: leaf } = await nodeManager.createLeafNode(pairs);

      // This put will increase the number of pairs to 4, which is the fanout, triggering a split
      const { newAddress, split } = await nodeManager._put(
        leaf,
        fromString("d"),
        fromString("val-d")
      );

      expect(newAddress).toBeDefined();
      expect(split).toBeDefined();

      const leftNode = (await nodeManager.getNode(newAddress)) as LeafNodeProxy;
      expect(leftNode).toBeDefined();
      expect(leftNode.keysLength).toBe(2);

      const rightNode = (await nodeManager.getNode(
        split!.address
      )) as LeafNodeProxy;
      expect(rightNode).toBeDefined();
      expect(rightNode.keysLength).toBe(2);
    });
  });

  describe("updateChild", () => {
    it("should update a child address in an internal node without a split", async () => {
      const { address: child1Address } = await nodeManager.createLeafNode([]);
      const { address: child2Address } = await nodeManager.createLeafNode([]);
      const { node: parent } = await nodeManager.createInternalNode([
        { key: fromString("m"), address: child1Address },
        { key: new Uint8Array(), address: child2Address },
      ]);

      const { address: newChild1Address } = await nodeManager.createLeafNode([
        { key: fromString("a"), value: fromString("val-a") },
      ]);

      const { newAddress, split } = await nodeManager.updateChild(
        parent,
        child1Address,
        newChild1Address
      );

      expect(split).toBeUndefined();
      const updatedParent = (await nodeManager.getNode(
        newAddress
      )) as InternalNodeProxy;
      expect(updatedParent).toBeDefined();
      expect(updatedParent.getAddress(0)).toEqual(newChild1Address);
    });

    it("should update a child address and handle a split", async () => {
      const { address: child1Address } = await nodeManager.createLeafNode([]);
      const { address: child2Address } = await nodeManager.createLeafNode([]);

      const { node: parent } = await nodeManager.createInternalNode([
        { key: fromString("m"), address: child1Address },
        { key: new Uint8Array(), address: child2Address },
      ]);

      const { address: newChild1Address } = await nodeManager.createLeafNode([
        { key: fromString("a"), value: fromString("val-a") },
      ]);
      const { address: splitChildAddress } = await nodeManager.createLeafNode([
        { key: fromString("g"), value: fromString("val-g") },
      ]);

      const { newAddress, split } = await nodeManager.updateChild(
        parent,
        child1Address,
        newChild1Address,
        { key: fromString("f"), address: splitChildAddress }
      );

      expect(split).toBeUndefined(); // The parent itself doesn't split in this test case
      const updatedParent = (await nodeManager.getNode(
        newAddress
      )) as InternalNodeProxy;
      expect(updatedParent).toBeDefined();
      expect(updatedParent.addressesLength).toBe(3);
      expect(updatedParent.getKey(0)).toEqual(fromString("f"));
    });
  });
});
