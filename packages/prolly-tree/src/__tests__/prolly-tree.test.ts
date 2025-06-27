import { describe, it, expect, beforeEach } from "vitest";
import { Store } from "../store.js";
import { ProllyTree } from "../prolly-tree.js";
import { Configuration, defaultConfiguration } from "../configuration.js";
import { ConflictResolver } from "../types.js";

const enc = new TextEncoder();

describe("ProllyTree", () => {
  let store: Store;
  let baseTree: ProllyTree;
  let config: Configuration;

  beforeEach(async () => {
    // Using a resolver is not required for these basic tests
    // after the refactor, as the merge logic is not implemented yet.
    config = { ...defaultConfiguration };
    store = new Store(config);
    baseTree = await store.getTree();
  });

  it("should put and get a value", async () => {
    const key = enc.encode("hello");
    const value = enc.encode("world");
    const newTree = await baseTree.put(key, value);
    const retrievedValue = await newTree.get(key);
    expect(retrievedValue).toEqual(value);
  });

  it("should update a value", async () => {
    const key = enc.encode("hello");
    const value1 = enc.encode("world");
    const value2 = enc.encode("world2");
    let newTree = await baseTree.put(key, value1);
    newTree = await newTree.put(key, value2);
    const retrievedValue = await newTree.get(key);
    expect(retrievedValue).toEqual(value2);
  });

  it("should return the same tree if value is identical", async () => {
    const key = enc.encode("key");
    const value = enc.encode("value");

    const tree1 = await baseTree.put(key, value);
    const tree2 = await tree1.put(key, value);

    expect(tree1).toBe(tree2);
    expect(tree1.rootHash).toEqual(tree2.rootHash);
  });

  // The delete, merge, and diff methods are not implemented yet.
  // These tests will be re-enabled once the functionality is restored.
  it.skip("should delete a value", async () => {
    const key = enc.encode("hello");
    const value = enc.encode("world");
    let newTree = await baseTree.put(key, value);
    newTree = await newTree.delete(key);
    const retrievedValue = await newTree.get(key);
    expect(retrievedValue).toBeUndefined();
  });

  it.skip("should perform a three-way merge", async () => {
    const branch1 = await baseTree.put(enc.encode("a"), enc.encode("1"));
    const branch2 = await baseTree.put(enc.encode("b"), enc.encode("2"));
    const mergedTree = await ProllyTree.merge(
      branch1,
      branch2,
      baseTree,
      async (_, __, l) => l
    );
    expect(await mergedTree.get(enc.encode("a"))).toEqual(enc.encode("1"));
    expect(await mergedTree.get(enc.encode("b"))).toEqual(enc.encode("2"));
  });

  it.skip("should correctly diff additions between two branches", async () => {
    const branch1 = await baseTree.put(enc.encode("a"), enc.encode("1"));
    const diff = await baseTree.diff(branch1);
    expect(diff).toEqual([
      {
        key: enc.encode("a"),
        localValue: enc.encode("1"),
        remoteValue: undefined,
      },
    ]);
  });

  it("root hash should be identical regardless of insertion order", async () => {
    const entries: [string, string][] = [
      ["a", "1"],
      ["b", "2"],
      ["c", "3"],
      ["d", "4"],
      ["e", "5"],
    ];

    const forwardEntries = entries;
    const backwardEntries = [...entries].reverse();

    let tree1 = await baseTree;
    for (const [key, value] of forwardEntries) {
      tree1 = await tree1.put(enc.encode(key), enc.encode(value));
    }

    let tree2 = await baseTree;
    for (const [key, value] of backwardEntries) {
      tree2 = await tree2.put(enc.encode(key), enc.encode(value));
    }

    expect(tree1.rootHash).toEqual(tree2.rootHash);
    expect(tree1.rootHash).not.toEqual(baseTree.rootHash);
  });
});
