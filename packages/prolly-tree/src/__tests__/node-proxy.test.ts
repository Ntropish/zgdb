import { describe, it, expect, beforeEach } from "vitest";
import {
  LeafNodeProxy,
  InternalNodeProxy,
  createNodeProxy,
  isLeafNodeProxy,
  createLeafNodeBuffer,
  createInternalNodeBuffer,
  KeyValuePair,
  BranchPair,
} from "../node-proxy.js";
import { compare } from "uint8arrays/compare";
import { fromString } from "uint8arrays/from-string";
import { NodeManager } from "../node-manager.js";
import { BlockManager } from "../block-store.js";
import { defaultConfiguration } from "../configuration.js";

describe("NodeProxy", () => {
  let nodeManager: NodeManager;
  let blockManager: BlockManager;

  beforeEach(() => {
    blockManager = new BlockManager();
    nodeManager = new NodeManager(blockManager, defaultConfiguration);
  });

  const leafPairs: KeyValuePair[] = [
    { key: fromString("a"), value: fromString("alpha") },
    { key: fromString("b"), value: fromString("bravo") },
  ];
  const leafBuffer = createLeafNodeBuffer(leafPairs, 0);

  const branches: BranchPair[] = [
    { key: fromString("c"), address: new Uint8Array(32).fill(1) },
    { key: new Uint8Array(), address: new Uint8Array(32).fill(2) },
  ];
  const internalBuffer = createInternalNodeBuffer(branches, 100, 1);

  describe("LeafNodeProxy", () => {
    let proxy: LeafNodeProxy;
    beforeEach(() => {
      proxy = new LeafNodeProxy(leafBuffer, nodeManager);
    });

    it("should correctly identify as a leaf node", () => {
      expect(proxy.isLeaf()).toBe(true);
    });

    it("should return correct entry count and number of keys", () => {
      expect(proxy.entryCount).toBe(2);
      expect(proxy.keysLength).toBe(2);
    });

    it("should allow retrieving key-value pairs by index", () => {
      const pair0 = proxy.getPair(0);
      expect(compare(pair0.key, fromString("a"))).toBe(0);
      expect(compare(pair0.value, fromString("alpha"))).toBe(0);

      const pair1 = proxy.getPair(1);
      expect(compare(pair1.key, fromString("b"))).toBe(0);
      expect(compare(pair1.value, fromString("bravo"))).toBe(0);
    });

    it("should find the index of an existing key", () => {
      const { found: foundA, index: indexA } = proxy.findKeyIndex(
        fromString("a")
      );
      expect(foundA).toBe(true);
      expect(indexA).toBe(0);

      const { found: foundB, index: indexB } = proxy.findKeyIndex(
        fromString("b")
      );
      expect(foundB).toBe(true);
      expect(indexB).toBe(1);
    });

    it("should return the correct index for a non-existing key", () => {
      const { found: foundAA, index: indexAA } = proxy.findKeyIndex(
        fromString("aa")
      );
      expect(foundAA).toBe(false);
      expect(indexAA).toBe(1); // insertion point

      const { found: foundC, index: indexC } = proxy.findKeyIndex(
        fromString("c")
      );
      expect(foundC).toBe(false);
      expect(indexC).toBe(2); // insertion point

      const { found: foundBacktick, index: indexBacktick } = proxy.findKeyIndex(
        fromString("`")
      );
      expect(foundBacktick).toBe(false);
      expect(indexBacktick).toBe(0);
    });

    it("should return the raw bytes", () => {
      expect(proxy.bytes).toEqual(leafBuffer);
    });
  });

  describe("InternalNodeProxy", () => {
    let proxy: InternalNodeProxy;
    beforeEach(() => {
      proxy = new InternalNodeProxy(internalBuffer, nodeManager);
    });

    it("should correctly identify as an internal node", () => {
      expect(proxy.isLeaf()).toBe(false);
    });

    it("should return correct entry count and number of addresses", () => {
      expect(proxy.entryCount).toBe(100);
      expect(proxy.addressesLength).toBe(2);
    });

    it("should allow retrieving keys and addresses by index", () => {
      const key0 = proxy.getKey(0);
      const address0 = proxy.getAddress(0);
      expect(compare(key0!, fromString("c"))).toBe(0);
      expect(compare(address0!, new Uint8Array(32).fill(1))).toBe(0);

      const address1 = proxy.getAddress(1);
      expect(compare(address1!, new Uint8Array(32).fill(2))).toBe(0);
    });

    it("should find the correct child index for a given key", () => {
      expect(proxy.findChildIndex(fromString("a"))).toBe(0);
      expect(proxy.findChildIndex(fromString("c"))).toBe(1);
      expect(proxy.findChildIndex(fromString("d"))).toBe(1);
      expect(proxy.findChildIndex(fromString("e"))).toBe(1);
    });
  });

  describe("createNodeProxy", () => {
    it("should create a LeafNodeProxy for leaf node bytes", () => {
      const proxy = createNodeProxy(leafBuffer, nodeManager);
      expect(proxy).toBeInstanceOf(LeafNodeProxy);
    });

    it("should create an InternalNodeProxy for internal node bytes", () => {
      const proxy = createNodeProxy(internalBuffer, nodeManager);
      expect(proxy).toBeInstanceOf(InternalNodeProxy);
    });
  });

  describe("isLeafNodeProxy", () => {
    it("should return true for a LeafNodeProxy", () => {
      const proxy = createNodeProxy(leafBuffer, nodeManager);
      expect(isLeafNodeProxy(proxy)).toBe(true);
    });

    it("should return false for an InternalNodeProxy", () => {
      const proxy = createNodeProxy(internalBuffer, nodeManager);
      expect(isLeafNodeProxy(proxy)).toBe(false);
    });
  });

  describe("Heavy Duty Tests", () => {
    it("Exercise 1: The 'Empty and Full' Symphony", () => {
      // Test 1: Empty Leaf Node
      const emptyLeafBuffer = createLeafNodeBuffer([], 0);
      const emptyLeafProxy = new LeafNodeProxy(emptyLeafBuffer, nodeManager);
      expect(emptyLeafProxy.isLeaf()).toBe(true);
      expect(emptyLeafProxy.keysLength).toBe(0);
      expect(emptyLeafProxy.entryCount).toBe(0);

      // Test 2: Full Leaf Node with varied data
      const largeLeafPairs: KeyValuePair[] = Array.from(
        { length: 100 },
        (_, i) => ({
          key: fromString(`key${i.toString().padStart(3, "0")}`),
          value: new Uint8Array(i * 10).fill(i),
        })
      );
      largeLeafPairs.push({ key: fromString(""), value: fromString("empty") }); // empty key
      largeLeafPairs.sort((a, b) => compare(a.key, b.key));

      const largeLeafBuffer = createLeafNodeBuffer(largeLeafPairs, 0);
      const largeLeafProxy = new LeafNodeProxy(largeLeafBuffer, nodeManager);
      expect(largeLeafProxy.isLeaf()).toBe(true);
      expect(largeLeafProxy.keysLength).toBe(101);
      expect(largeLeafProxy.entryCount).toBe(101);
      const entry = largeLeafProxy.getPair(50);
      expect(compare(entry.key, fromString("key049"))).toBe(0); // offset by empty key sort
      expect(entry.value.length).toBe(49 * 10);
    });

    it("Exercise 2: The 'Binary Search Ballet'", () => {
      const balletKeys: KeyValuePair[] = Array.from(
        { length: 100 },
        (_, i) => ({
          key: fromString(`key${i.toString().padStart(2, "0")}`),
          value: fromString(`${i}`),
        })
      );
      const balletBuffer = createLeafNodeBuffer(balletKeys, 0);
      const balletProxy = new LeafNodeProxy(balletBuffer, nodeManager);

      // Find first, middle, last
      expect(balletProxy.findKeyIndex(fromString("key00")).found).toBe(true);
      expect(balletProxy.findKeyIndex(fromString("key50")).found).toBe(true);
      expect(balletProxy.findKeyIndex(fromString("key99")).found).toBe(true);

      // Find keys that don't exist
      expect(balletProxy.findKeyIndex(fromString("a")).found).toBe(false); // Before all
      expect(balletProxy.findKeyIndex(fromString("key50a")).found).toBe(false); // Insertion point after key50
      expect(balletProxy.findKeyIndex(fromString("z")).found).toBe(false); // After all
    });

    it("Exercise 3: The 'UTF-8 Gauntlet'", () => {
      const utf8Pairs: KeyValuePair[] = [
        { key: fromString("a-key"), value: fromString("ascii") },
        { key: fromString("🔑-key"), value: fromString("emoji") },
        { key: fromString("ключ-key"), value: fromString("cyrillic") },
        { key: fromString("鍵-key"), value: fromString("japanese") },
      ].sort((a, b) => compare(a.key, b.key));

      const utf8Buffer = createLeafNodeBuffer(utf8Pairs, 0);
      const utf8Proxy = new LeafNodeProxy(utf8Buffer, nodeManager);

      expect(utf8Proxy.keysLength).toBe(4);
      const emojiIndex = utf8Proxy.findKeyIndex(fromString("🔑-key"));
      expect(emojiIndex.found).toBe(true);
      const entry = utf8Proxy.getPair(emojiIndex.index);
      expect(compare(entry.value, fromString("emoji"))).toBe(0);
    });

    it("Exercise 4: The 'Maximum Payload' Stress Test", () => {
      // Large values
      const largeValuePairs: KeyValuePair[] = [
        { key: fromString("key1"), value: new Uint8Array(10_000).fill(1) },
        { key: fromString("key2"), value: new Uint8Array(20_000).fill(2) },
      ];
      const largeValueBuffer = createLeafNodeBuffer(largeValuePairs, 0);
      const largeValueProxy = new LeafNodeProxy(largeValueBuffer, nodeManager);
      expect(largeValueProxy.keysLength).toBe(2);
      const val2 = largeValueProxy.getPair(1).value;
      expect(val2.length).toBe(20_000);
      expect(val2[0]).toBe(2);

      // Large number of entries
      const manyEntriesPairs: KeyValuePair[] = Array.from(
        { length: 500 },
        (_, i) => ({
          key: fromString(`k${i}`),
          value: fromString(`v${i}`),
        })
      );
      const manyEntriesBuffer = createLeafNodeBuffer(manyEntriesPairs, 0);
      const manyEntriesProxy = new LeafNodeProxy(
        manyEntriesBuffer,
        nodeManager
      );
      expect(manyEntriesProxy.keysLength).toBe(500);
      expect(manyEntriesProxy.findKeyIndex(fromString("k357")).found).toBe(
        true
      );
    });
  });
});
