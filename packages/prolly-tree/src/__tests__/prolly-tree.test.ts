import { describe, it, expect, beforeEach } from "vitest";
import { Store, ProllyTree } from "../index.js";
import { Configuration, defaultConfiguration } from "../configuration.js";

const enc = new TextEncoder();

// This is the target API we are building towards.
// The Prolly Tree library itself is unopinionated about the values.
type ConflictResolver = (
  key: Uint8Array,
  base: Uint8Array | undefined,
  local: Uint8Array | undefined,
  remote: Uint8Array | undefined
) => Promise<Uint8Array | undefined>;

// A simple resolver for testing that always chooses the "remote" value.
const remoteWinsResolver: ConflictResolver = async (
  key,
  base,
  local,
  remote
) => {
  return remote;
};

describe("ProllyTree with Store", () => {
  let store: Store;
  let baseTree: ProllyTree;
  let config: Configuration;

  beforeEach(async () => {
    config = { ...defaultConfiguration, hashingAlgorithm: "sha2-256" };
    store = new Store(config);
    baseTree = await store.getTree();
  });

  describe("Core Operations", () => {
    it("should put and get a value", async () => {
      const key = enc.encode("hello");
      const value = enc.encode("world");

      const tree = await baseTree.put(key, value);
      const result = await tree.get(key);

      expect(result).toEqual(value);
      expect(tree.rootHash).not.toEqual(baseTree.rootHash);
    });

    it("should update a value for an existing key", async () => {
      const key = enc.encode("key");

      let tree = await baseTree.put(key, enc.encode("value1"));
      const firstRootHash = tree.rootHash;
      tree = await tree.put(key, enc.encode("value2"));
      const secondRootHash = tree.rootHash;

      const result = await tree.get(key);
      expect(result).toEqual(enc.encode("value2"));
      expect(firstRootHash).not.toEqual(secondRootHash);
    });

    it("should return the same tree if value is identical", async () => {
      const key = enc.encode("key");
      const value = enc.encode("value");

      const tree1 = await baseTree.put(key, value);
      const tree2 = await tree1.put(key, value);

      expect(tree1).toBe(tree2);
      expect(tree1.rootHash).toEqual(tree2.rootHash);
    });

    it("should delete a value", async () => {
      const key = enc.encode("key");
      let tree = await baseTree.put(key, enc.encode("value1"));
      tree = await tree.delete(key);
      const result = await tree.get(key);
      expect(result).toBeUndefined();
    });

    it("should handle cheap clones", async () => {
      const tree = await baseTree.put(enc.encode("a"), enc.encode("1"));
      const clone = await store.getTree(tree.rootHash);
      expect(clone.rootHash).toEqual(tree.rootHash);
      expect(await clone.get(enc.encode("a"))).toEqual(enc.encode("1"));
    });
  });

  describe("Merging", () => {
    it("should merge disjoint changes without a conflict", async () => {
      const branch1 = await baseTree.put(enc.encode("a"), enc.encode("1"));
      const branch2 = await baseTree.put(enc.encode("b"), enc.encode("2"));

      const mergedTree = await ProllyTree.merge(
        branch1,
        branch2,
        baseTree,
        remoteWinsResolver
      );

      expect(await mergedTree.get(enc.encode("a"))).toEqual(enc.encode("1"));
      expect(await mergedTree.get(enc.encode("b"))).toEqual(enc.encode("2"));
    });

    it("should use the resolver for a direct conflict", async () => {
      const key = enc.encode("conflict");
      const base = await baseTree.put(key, enc.encode("base-val"));
      const branch1 = await base.put(key, enc.encode("local-val"));
      const branch2 = await base.put(key, enc.encode("remote-val"));

      const mergedTree = await ProllyTree.merge(
        branch1,
        branch2,
        base,
        remoteWinsResolver
      );

      expect(await mergedTree.get(key)).toEqual(enc.encode("remote-val"));
    });

    it("should handle a conflict with one side deleting", async () => {
      const key = enc.encode("delete-conflict");
      const base = await baseTree.put(key, enc.encode("delete-base"));

      const branch1 = await base.delete(key);
      const branch2 = await base.put(key, enc.encode("delete-remote"));

      const mergedTree = await ProllyTree.merge(
        branch1,
        branch2,
        base,
        remoteWinsResolver
      );

      expect(await mergedTree.get(key)).toEqual(enc.encode("delete-remote"));
    });
  });

  // These features are not implemented yet, so we skip the tests.
  describe.skip("Advanced Features", () => {
    it("root hash should be identical regardless of insertion order", async () => {
      let tree1 = await baseTree.put(enc.encode("a"), enc.encode("1"));
      tree1 = await tree1.put(enc.encode("b"), enc.encode("2"));

      let tree2 = await store.getTree();
      tree2 = await tree2.put(enc.encode("b"), enc.encode("2"));
      tree2 = await tree2.put(enc.encode("a"), enc.encode("1"));

      expect(tree1.rootHash).toEqual(tree2.rootHash);
    });

    it("should correctly diff additions between two branches", async () => {
      const branch1 = await baseTree.put(enc.encode("a"), enc.encode("1"));
      const branch2 = await baseTree.put(enc.encode("b"), enc.encode("2"));
      const diffs = await branch1.diff(branch2);
      expect(diffs).toEqual([
        {
          key: enc.encode("a"),
          localValue: undefined,
          remoteValue: enc.encode("1"),
        },
        {
          key: enc.encode("b"),
          localValue: undefined,
          remoteValue: enc.encode("2"),
        },
      ]);
    });
  });
});
