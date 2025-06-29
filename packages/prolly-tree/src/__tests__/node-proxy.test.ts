import { describe, it, expect } from "vitest";
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

describe("NodeProxy", () => {
  const leafPairs: KeyValuePair[] = [
    { key: fromString("a"), value: fromString("alpha") },
    { key: fromString("b"), value: fromString("bravo") },
  ];
  const leafBuffer = createLeafNodeBuffer(leafPairs);

  const branches: BranchPair[] = [
    { key: fromString("c"), address: new Uint8Array(32).fill(1) },
    { key: fromString("d"), address: new Uint8Array(32).fill(2) },
  ];
  const internalBuffer = createInternalNodeBuffer(branches, 100);

  describe("LeafNodeProxy", () => {
    const proxy = new LeafNodeProxy(leafBuffer);

    it("should correctly identify as a leaf node", () => {
      expect(proxy.isLeaf).toBe(true);
    });

    it("should return correct entry count and number of entries", () => {
      expect(proxy.entryCount).toBe(2);
      expect(proxy.numEntries).toBe(2);
    });

    it("should allow retrieving entries by index", () => {
      const entry0 = proxy.getEntry(0);
      expect(compare(entry0.key, fromString("a"))).toBe(0);
      expect(compare(entry0.value, fromString("alpha"))).toBe(0);

      const entry1 = proxy.getEntry(1);
      expect(compare(entry1.key, fromString("b"))).toBe(0);
      expect(compare(entry1.value, fromString("bravo"))).toBe(0);
    });

    it("should find the index of an existing entry", () => {
      expect(proxy.findEntryIndex(fromString("a"))).toBe(0);
      expect(proxy.findEntryIndex(fromString("b"))).toBe(1);
    });

    it("should return a negative index for a non-existing entry", () => {
      expect(proxy.findEntryIndex(fromString("aa"))).toBe(-2);
      expect(proxy.findEntryIndex(fromString("c"))).toBe(-3);
      expect(proxy.findEntryIndex(fromString("`"))).toBe(-1); // char before 'a'
    });

    it("should return the raw bytes", () => {
      expect(proxy.bytes).toEqual(leafBuffer);
    });
  });

  describe("InternalNodeProxy", () => {
    const proxy = new InternalNodeProxy(internalBuffer);

    it("should correctly identify as an internal node", () => {
      expect(proxy.isLeaf).toBe(false);
    });

    it("should return correct entry count and number of branches", () => {
      expect(proxy.entryCount).toBe(100);
      expect(proxy.numBranches).toBe(2);
    });

    it("should allow retrieving branches by index", () => {
      const branch0 = proxy.getBranch(0);
      expect(compare(branch0.key, fromString("c"))).toBe(0);
      expect(compare(branch0.address, new Uint8Array(32).fill(1))).toBe(0);

      const branch1 = proxy.getBranch(1);
      expect(compare(branch1.key, fromString("d"))).toBe(0);
      expect(compare(branch1.address, new Uint8Array(32).fill(2))).toBe(0);
    });

    it("should find the correct child index for a given key", () => {
      // Keys less than or equal to "c" should go to child 0
      expect(proxy.findChildIndex(fromString("a"))).toBe(0);
      expect(proxy.findChildIndex(fromString("c"))).toBe(0);

      // Keys greater than "c" and less than or equal to "d" go to child 1
      expect(proxy.findChildIndex(fromString("d"))).toBe(1);

      // Keys greater than "d" also go to the last child
      expect(proxy.findChildIndex(fromString("e"))).toBe(1);
    });
  });

  describe("createNodeProxy", () => {
    it("should create a LeafNodeProxy for leaf node bytes", () => {
      const proxy = createNodeProxy(leafBuffer);
      expect(proxy).toBeInstanceOf(LeafNodeProxy);
    });

    it("should create an InternalNodeProxy for internal node bytes", () => {
      const proxy = createNodeProxy(internalBuffer);
      expect(proxy).toBeInstanceOf(InternalNodeProxy);
    });
  });

  describe("isLeafNodeProxy", () => {
    it("should return true for a LeafNodeProxy", () => {
      const proxy = createNodeProxy(leafBuffer);
      expect(isLeafNodeProxy(proxy)).toBe(true);
    });

    it("should return false for an InternalNodeProxy", () => {
      const proxy = createNodeProxy(internalBuffer);
      expect(isLeafNodeProxy(proxy)).toBe(false);
    });
  });

  describe("Heavy Duty Tests", () => {
    it("Exercise 1: The 'Empty and Full' Symphony", () => {
      // Test 1: Empty Leaf Node
      const emptyLeafBuffer = createLeafNodeBuffer([]);
      const emptyLeafProxy = new LeafNodeProxy(emptyLeafBuffer);
      expect(emptyLeafProxy.isLeaf).toBe(true);
      expect(emptyLeafProxy.numEntries).toBe(0);
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

      const largeLeafBuffer = createLeafNodeBuffer(largeLeafPairs);
      const largeLeafProxy = new LeafNodeProxy(largeLeafBuffer);
      expect(largeLeafProxy.isLeaf).toBe(true);
      expect(largeLeafProxy.numEntries).toBe(101);
      expect(largeLeafProxy.entryCount).toBe(101);
      const entry = largeLeafProxy.getEntry(50);
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
      const balletBuffer = createLeafNodeBuffer(balletKeys);
      const balletProxy = new LeafNodeProxy(balletBuffer);

      // Find first, middle, last
      expect(balletProxy.findEntryIndex(fromString("key00"))).toBe(0);
      expect(balletProxy.findEntryIndex(fromString("key50"))).toBe(50);
      expect(balletProxy.findEntryIndex(fromString("key99"))).toBe(99);

      // Find keys that don't exist
      expect(balletProxy.findEntryIndex(fromString("a"))).toBe(-1); // Before all
      expect(balletProxy.findEntryIndex(fromString("key50a"))).toBe(-52); // Insertion point after key50
      expect(balletProxy.findEntryIndex(fromString("z"))).toBe(-101); // After all
    });

    it("Exercise 3: The 'UTF-8 Gauntlet'", () => {
      const utf8Pairs: KeyValuePair[] = [
        { key: fromString("a-key"), value: fromString("ascii") },
        { key: fromString("🔑-key"), value: fromString("emoji") },
        { key: fromString("ключ-key"), value: fromString("cyrillic") },
        { key: fromString("鍵-key"), value: fromString("japanese") },
      ].sort((a, b) => compare(a.key, b.key));

      const utf8Buffer = createLeafNodeBuffer(utf8Pairs);
      const utf8Proxy = new LeafNodeProxy(utf8Buffer);

      expect(utf8Proxy.numEntries).toBe(4);
      const emojiIndex = utf8Proxy.findEntryIndex(fromString("🔑-key"));
      expect(emojiIndex).toBeGreaterThan(-1);
      const entry = utf8Proxy.getEntry(emojiIndex);
      expect(compare(entry.value, fromString("emoji"))).toBe(0);
    });

    it("Exercise 4: The 'Maximum Payload' Stress Test", () => {
      // Large values
      const largeValuePairs: KeyValuePair[] = [
        { key: fromString("key1"), value: new Uint8Array(10_000).fill(1) },
        { key: fromString("key2"), value: new Uint8Array(20_000).fill(2) },
      ];
      const largeValueBuffer = createLeafNodeBuffer(largeValuePairs);
      const largeValueProxy = new LeafNodeProxy(largeValueBuffer);
      expect(largeValueProxy.numEntries).toBe(2);
      const val2 = largeValueProxy.getEntry(1).value;
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
      const manyEntriesBuffer = createLeafNodeBuffer(manyEntriesPairs);
      const manyEntriesProxy = new LeafNodeProxy(manyEntriesBuffer);
      expect(manyEntriesProxy.numEntries).toBe(500);
      expect(manyEntriesProxy.findEntryIndex(fromString("k357"))).toBe(357);
    });
  });
});
