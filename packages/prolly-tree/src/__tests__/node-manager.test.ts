import { describe, it, expect, beforeEach } from "vitest";
import { NodeManager } from "../node-manager.js";
import { BlockManager } from "../block-store.js";
import {
  Node,
  Address,
  KeyValuePair,
  createLeafNode,
  createInternalNode,
} from "../node.js";
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
    blockManager = new BlockManager({
      treeDefinition: { targetFanout: 4, minFanout: 2 },
      hashingAlgorithm: "sha2-256",
    });
    nodeManager = new NodeManager(blockManager, blockManager.config);
  });

  it("should get an existing node", async () => {
    const node = createLeafNode([[fromString("a"), fromString("value-a")]]);
    const address = await blockManager.putNode(node);

    const retrievedNode = await nodeManager.getNode(address);
    expect(retrievedNode).toBeDefined();
    expect(retrievedNode?.isLeaf).toBe(true);
    expect(retrievedNode?.address).toEqual(address);
  });

  it("should create a new leaf node", async () => {
    const pairs: KeyValuePair[] = [[fromString("key1"), fromString("value1")]];
    const node = await nodeManager.createLeafNode(pairs);

    expect(node).toBeDefined();
    expect(node.isLeaf).toBe(true);
    expect((node as any).pairs).toEqual(pairs);

    const address = (node as any).address;
    expect(address).toBeDefined();

    const storedNode = await blockManager.getNode(address);
    expect(storedNode).toBeDefined();
  });

  it("should split a leaf node that is too full", async () => {
    const pairs: KeyValuePair[] = [
      [fromString("a"), fromString("val-a")],
      [fromString("b"), fromString("val-b")],
      [fromString("c"), fromString("val-c")],
      [fromString("d"), fromString("val-d")],
    ];
    const fullNode = createLeafNode(pairs);

    const { newAddress, split } = await nodeManager.splitNode(fullNode);

    expect(newAddress).toBeDefined();
    expect(split).toBeDefined();
    expect(split.key).toEqual(fromString("c"));

    const leftNode = await blockManager.getNode(newAddress);
    const rightNode = await blockManager.getNode(split.address);

    expect(leftNode).toBeDefined();
    expect((leftNode as any).pairs.length).toBe(2);

    expect(rightNode).toBeDefined();
    expect((rightNode as any).pairs.length).toBe(2);
  });

  it("should split an internal node that is too full", async () => {
    const keys = [fromString("b"), fromString("d"), fromString("f")];
    const children: Address[] = [
      sha256(fromString("child1")),
      sha256(fromString("child2")),
      sha256(fromString("child3")),
      sha256(fromString("child4")),
    ];
    const fullNode = createInternalNode(keys, children);

    const { newAddress, split } = await nodeManager.splitNode(fullNode);

    expect(newAddress).toBeDefined();
    expect(split).toBeDefined();
    expect(split.key).toEqual(fromString("d")); // The middle key

    const leftNode = await blockManager.getNode(newAddress);
    const rightNode = await blockManager.getNode(split.address);

    expect(leftNode).toBeDefined();
    expect((leftNode as any).keys.length).toBe(1);
    expect((leftNode as any).children.length).toBe(2);

    expect(rightNode).toBeDefined();
    expect((rightNode as any).keys.length).toBe(1);
    expect((rightNode as any).children.length).toBe(2);
  });

  describe("_put", () => {
    it("should insert a key-value pair into a non-full leaf node", async () => {
      const pairs: KeyValuePair[] = [[fromString("a"), fromString("val-a")]];
      const leaf = await nodeManager.createLeafNode(pairs);

      const { newAddress, split } = await nodeManager._put(
        leaf,
        fromString("b"),
        fromString("val-b")
      );

      expect(split).toBeUndefined();
      const newNode = await nodeManager.getNode(newAddress);
      expect(newNode).toBeDefined();
      expect((newNode as any).pairs.length).toBe(2);
    });

    it("should update the value for an existing key", async () => {
      const pairs: KeyValuePair[] = [[fromString("a"), fromString("val-a")]];
      const leaf = await nodeManager.createLeafNode(pairs);

      const { newAddress, split } = await nodeManager._put(
        leaf,
        fromString("a"),
        fromString("new-val-a")
      );

      expect(split).toBeUndefined();
      const newNode = await nodeManager.getNode(newAddress);
      expect(newNode).toBeDefined();
      expect((newNode as any).pairs.length).toBe(1);
      expect((newNode as any).pairs[0][1]).toEqual(fromString("new-val-a"));
    });

    it("should split a leaf node when _put makes it too full", async () => {
      const pairs: KeyValuePair[] = [
        [fromString("a"), fromString("val-a")],
        [fromString("b"), fromString("val-b")],
        [fromString("c"), fromString("val-c")],
      ];
      const leaf = await nodeManager.createLeafNode(pairs);

      // This put will increase the number of pairs to 4, which is the fanout, triggering a split
      const { newAddress, split } = await nodeManager._put(
        leaf,
        fromString("d"),
        fromString("val-d")
      );

      expect(newAddress).toBeDefined();
      expect(split).toBeDefined();

      const leftNode = await blockManager.getNode(newAddress);
      expect(leftNode).toBeDefined();
      expect((leftNode as any).pairs.length).toBe(2);

      const rightNode = await blockManager.getNode(split!.address);
      expect(rightNode).toBeDefined();
      expect((rightNode as any).pairs.length).toBe(2);
    });
  });

  describe("updateChild", () => {
    it("should update a child address in an internal node without a split", async () => {
      const child1 = await nodeManager.createLeafNode([]);
      const child2 = await nodeManager.createLeafNode([]);
      const parent = await nodeManager.createNode(
        [],
        [fromString("m")],
        [child1.address!, child2.address!],
        false
      );

      const newChild1 = await nodeManager.createLeafNode([
        [fromString("a"), fromString("val-a")],
      ]);

      const { newAddress, split } = await nodeManager.updateChild(
        parent,
        child1.address!,
        newChild1.address!
      );

      expect(split).toBeUndefined();
      const updatedParent = await nodeManager.getNode(newAddress);
      expect(updatedParent).toBeDefined();
      expect((updatedParent as any).children[0]).toEqual(newChild1.address);
    });

    it("should update a child address and handle a split", async () => {
      const child1 = await nodeManager.createLeafNode([]);
      const child2 = await nodeManager.createLeafNode([]);
      const parent = await nodeManager.createNode(
        [],
        [fromString("m")],
        [child1.address!, child2.address!],
        false
      );

      const newChild1 = await nodeManager.createLeafNode([
        [fromString("a"), fromString("val-a")],
      ]);
      const splitChild = await nodeManager.createLeafNode([
        [fromString("g"), fromString("val-g")],
      ]);

      const { newAddress, split } = await nodeManager.updateChild(
        parent,
        child1.address!,
        newChild1.address!,
        { key: fromString("f"), address: splitChild.address! }
      );

      expect(split).toBeUndefined(); // The parent itself shouldn't split yet
      const updatedParent = await nodeManager.getNode(newAddress);
      expect(updatedParent).toBeDefined();
      expect((updatedParent as any).children.length).toBe(3);
      expect((updatedParent as any).keys.length).toBe(2);
      expect((updatedParent as any).keys[0]).toEqual(fromString("f"));
    });
  });
});
