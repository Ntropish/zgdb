import { describe, it, expect } from "vitest";
import { createNodeBuilder } from "../node-builder.js";
import { fromString } from "uint8arrays/from-string";
import { LeafNode, KeyValuePair, InternalNode, Address } from "../../node.js";

describe("NodeBuilder", () => {
  it("should build a leaf node", async () => {
    const pairs: KeyValuePair[] = [
      [fromString("a"), fromString("value-a")],
      [fromString("b"), fromString("value-b")],
    ];

    const builder = createNodeBuilder();
    const node = await builder.isLeaf(true).setPairs(pairs).build({});

    expect(node.isLeaf).toBe(true);
    const leafNode = node as LeafNode;
    expect(leafNode.pairs).toEqual(pairs);
  });

  it("should build an internal node", async () => {
    const keys = [fromString("b"), fromString("d")];
    const children: Address[] = [
      fromString("address-a"),
      fromString("address-c"),
      fromString("address-e"),
    ];

    const builder = createNodeBuilder();
    const node = await builder
      .isLeaf(false)
      .setKeys(keys)
      .setChildren(children)
      .build({});

    expect(node.isLeaf).toBe(false);
    const internalNode = node as InternalNode;
    expect(internalNode.keys).toEqual(keys);
    expect(internalNode.children).toEqual(children);
  });

  it("should throw an error when setting pairs on a branch node", async () => {
    const pairs: KeyValuePair[] = [[fromString("a"), fromString("value-a")]];
    const builder = createNodeBuilder();
    const promise = builder.isLeaf(false).setPairs(pairs).build({});
    await expect(promise).rejects.toThrow("Cannot set pairs on a branch node.");
  });

  it("should throw an error when setting keys on a leaf node", async () => {
    const keys = [fromString("b")];
    const builder = createNodeBuilder();
    const promise = builder.isLeaf(true).setKeys(keys).build({});
    await expect(promise).rejects.toThrow("Cannot set keys on a leaf node.");
  });

  it("should throw an error when setting children on a leaf node", async () => {
    const children: Address[] = [fromString("address-a")];
    const builder = createNodeBuilder();
    const promise = builder.isLeaf(true).setChildren(children).build({});
    await expect(promise).rejects.toThrow(
      "Cannot set children on a leaf node."
    );
  });

  it("should allow chaining in any order", async () => {
    const keys = [fromString("b")];
    const children: Address[] = [
      fromString("address-a"),
      fromString("address-c"),
    ];
    const builder = createNodeBuilder();

    // Set keys and children before specifying the node type
    const node = await builder
      .setKeys(keys)
      .setChildren(children)
      .isLeaf(false)
      .build({});

    expect(node.isLeaf).toBe(false);
    const internalNode = node as InternalNode;
    expect(internalNode.keys).toEqual(keys);
    expect(internalNode.children).toEqual(children);
  });
});
