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
});
