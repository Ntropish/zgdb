import { describe, it, expect, beforeEach } from "vitest";
import { ProllyTree, BlockManager } from "../index.js";
import { fromString } from "uint8arrays/from-string";

describe("ProllyTree", () => {
  let blockManager: BlockManager;

  beforeEach(() => {
    blockManager = new BlockManager({ hashingAlgorithm: "sha2-256" });
  });

  it("should create a tree, put a value, and get it back", async () => {
    const tree = await ProllyTree.create(blockManager);
    const key = fromString("hello");
    const value = fromString("world");

    const { tree: newTree, changed } = await tree.put(key, value);

    expect(changed).toBe(true);
    expect(newTree.root).not.toEqual(tree.root);

    const retrievedValue = await newTree.get(key);
    expect(retrievedValue).toEqual(value);
  });

  it("should return the same tree if the key-value pair is identical", async () => {
    const tree = await ProllyTree.create(blockManager);
    const key = fromString("hello");
    const value = fromString("world");

    const { tree: firstPutTree } = await tree.put(key, value);
    const { tree: secondPutTree, changed } = await firstPutTree.put(key, value);

    expect(changed).toBe(false);
    expect(secondPutTree.root).toEqual(firstPutTree.root);
  });

  it("should load an existing tree and retrieve a value", async () => {
    const tree = await ProllyTree.create(blockManager);
    const key = fromString("hello");
    const value = fromString("world");

    const { tree: newTree } = await tree.put(key, value);
    const rootAddress = newTree.root;

    const loadedTree = await ProllyTree.load(rootAddress, blockManager);
    const retrievedValue = await loadedTree.get(key);
    expect(retrievedValue).toEqual(value);
  });
});
