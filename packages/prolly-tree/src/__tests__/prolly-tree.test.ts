import { describe, it, expect, beforeEach } from "vitest";
import { ProllyTree, BlockManager, defaultConfiguration } from "../index.js";
import { fromString } from "uint8arrays/from-string";

describe("ProllyTree", () => {
  let blockManager: BlockManager;

  beforeEach(() => {
    blockManager = new BlockManager(defaultConfiguration);
  });

  it("should create a tree, put a value, and get it back", async () => {
    const tree = await ProllyTree.create(blockManager);
    const initialRoot = tree.root;
    const key = fromString("hello");
    const value = fromString("world");

    await tree.put(key, value);

    expect(tree.root).not.toEqual(initialRoot);

    const retrievedValue = await tree.get(key);
    expect(retrievedValue).toEqual(value);
  });

  it("should not change the root if the key-value pair is identical", async () => {
    const tree = await ProllyTree.create(blockManager);
    const key = fromString("hello");
    const value = fromString("world");

    await tree.put(key, value);
    const rootAfterFirstPut = tree.root;

    await tree.put(key, value); // put the same data again

    expect(tree.root).toEqual(rootAfterFirstPut);
  });

  it("should load an existing tree and retrieve a value", async () => {
    const tree = await ProllyTree.create(blockManager);
    const key = fromString("hello");
    const value = fromString("world");

    await tree.put(key, value);
    const rootAddress = tree.root;

    const loadedTree = await ProllyTree.load(rootAddress, blockManager);
    const retrievedValue = await loadedTree.get(key);
    expect(retrievedValue).toEqual(value);
  });
});
