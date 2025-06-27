import { describe, it, expect } from "vitest";
import {
  createLeafNode,
  createInternalNode,
  serializeNode,
  deserializeNode,
  KeyValuePair,
  Address,
} from "../node.js";
import { fromString } from "uint8arrays/from-string";

describe("Node Factories", () => {
  describe("createLeafNode", () => {
    it("should create a leaf node with the correct properties", () => {
      const pairs: KeyValuePair[] = [
        [fromString("a"), fromString("value-a")],
        [fromString("b"), fromString("value-b")],
      ];
      const node = createLeafNode(pairs);
      expect(node.isLeaf).toBe(true);
      expect(node.pairs).toEqual(pairs);
    });
  });

  describe("createInternalNode", () => {
    it("should create an internal node with the correct properties", () => {
      const keys = [fromString("c")];
      const children: Address[] = [fromString("addr1"), fromString("addr2")];
      const node = createInternalNode(keys, children);
      expect(node.isLeaf).toBe(false);
      expect(node.keys).toEqual(keys);
      expect(node.children).toEqual(children);
    });

    it("should throw an error if the number of children is not one more than the number of keys", () => {
      const keys = [fromString("c")];
      const children: Address[] = [fromString("addr1")]; // Incorrect number of children
      expect(() => createInternalNode(keys, children)).toThrow(
        "Invariant violation: An internal node must have exactly one more child than it has keys."
      );

      const tooManyChildren: Address[] = [
        fromString("addr1"),
        fromString("addr2"),
        fromString("addr3"),
      ];
      expect(() => createInternalNode(keys, tooManyChildren)).toThrow(
        "Invariant violation: An internal node must have exactly one more child than it has keys."
      );
    });
  });

  describe("Serialization", () => {
    it("should serialize and deserialize a leaf node", () => {
      const pairs: KeyValuePair[] = [
        [fromString("a"), fromString("value-a")],
        [fromString("b"), fromString("value-b")],
      ];
      const originalNode = createLeafNode(pairs);
      const serialized = serializeNode(originalNode);
      const deserializedNode = deserializeNode(serialized);

      expect(deserializedNode).toEqual(originalNode);
    });

    it("should serialize and deserialize an internal node", () => {
      const keys = [fromString("c")];
      const children: Address[] = [fromString("addr1"), fromString("addr2")];
      const originalNode = createInternalNode(keys, children);
      const serialized = serializeNode(originalNode);
      const deserializedNode = deserializeNode(serialized);

      expect(deserializedNode).toEqual(originalNode);
    });
  });
});
