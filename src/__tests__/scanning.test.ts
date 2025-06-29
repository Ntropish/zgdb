import { describe, it, expect, beforeEach } from "vitest";
import { ProllyTree } from "../prolly-tree.js";
import { BlockManager } from "../block-store.js";
import { Configuration, defaultConfiguration } from "../configuration.js";

const S = (s: string) => new TextEncoder().encode(s);

describe("ProllyTree Scanning", () => {
  let blockManager: BlockManager;
  let config: Configuration;

  beforeEach(() => {
    config = {
      ...defaultConfiguration,
      treeDefinition: {
        ...defaultConfiguration.treeDefinition,
        targetFanout: 2, // smaller fanout for easier testing
      },
    };
    blockManager = new BlockManager(config);
  });

  async function populateTree(keys: string[]): Promise<ProllyTree> {
    let tree = await ProllyTree.create(blockManager);
    for (const key of keys) {
      const { tree: newTree } = await tree.put(S(key), S(`v-${key}`));
      tree = newTree;
    }
    return tree;
  }

  describe("scanSync", () => {
    it("should scan all key-value pairs in order", async () => {
      const keys = ["a", "b", "c", "d", "e"];
      const tree = await populateTree(keys);
      const results: [string, string][] = [];
      for (const [k, v] of tree.scanSync(S(""))) {
        results.push([
          new TextDecoder().decode(k),
          new TextDecoder().decode(v),
        ]);
      }
      expect(results.map(([k]) => k)).toEqual(keys);
      expect(results.map(([, v]) => v)).toEqual(keys.map((k) => `v-${k}`));
    });

    it("should handle a scan that spans multiple nodes", async () => {
      const keys = ["a", "b", "c", "d", "e", "f", "g"];
      const tree = await populateTree(keys);
      const results: string[] = [];
      for (const [k] of tree.scanSync(S("a"))) {
        results.push(new TextDecoder().decode(k));
      }
      expect(results).toEqual(keys);
    });

    it("should scan from a startKey to the end", async () => {
      const keys = ["a", "b", "c", "d", "e"];
      const tree = await populateTree(keys);
      const results: string[] = [];
      for (const [k] of tree.scanSync(S("c"))) {
        results.push(new TextDecoder().decode(k));
      }
      expect(results).toEqual(["c", "d", "e"]);
    });

    it("should scan within a range [startKey, endKey]", async () => {
      const keys = ["a", "b", "c", "d", "e"];
      const tree = await populateTree(keys);
      const results: string[] = [];
      for (const [k] of tree.scanSync(S("b"), S("d"))) {
        results.push(new TextDecoder().decode(k));
      }
      expect(results).toEqual(["b", "c", "d"]);
    });

    it("should return nothing if startKey is past the end", async () => {
      const keys = ["a", "b", "c"];
      const tree = await populateTree(keys);
      const results = Array.from(tree.scanSync(S("d")));
      expect(results.length).toBe(0);
    });

    it("should handle a startKey that does not exist", async () => {
      const keys = ["a", "c", "e"];
      const tree = await populateTree(keys);
      const results: string[] = [];
      for (const [k] of tree.scanSync(S("b"))) {
        results.push(new TextDecoder().decode(k));
      }
      expect(results).toEqual(["c", "e"]);
    });

    it("should handle an empty tree", async () => {
      const tree = await ProllyTree.create(blockManager);
      const results = Array.from(tree.scanSync(S("a")));
      expect(results.length).toBe(0);
    });
  });

  describe("scan (async)", () => {
    it("should scan all key-value pairs in order", async () => {
      const keys = ["a", "b", "c", "d", "e"];
      const tree = await populateTree(keys);
      const results: [string, string][] = [];
      for await (const [k, v] of tree.scan(S(""))) {
        results.push([
          new TextDecoder().decode(k),
          new TextDecoder().decode(v),
        ]);
      }
      expect(results.map(([k]) => k)).toEqual(keys);
      expect(results.map(([, v]) => v)).toEqual(keys.map((k) => `v-${k}`));
    });

    it("should scan within a range [startKey, endKey]", async () => {
      const keys = ["a", "b", "c", "d", "e"];
      const tree = await populateTree(keys);
      const results: string[] = [];
      for await (const [k] of tree.scan(S("b"), S("d"))) {
        results.push(new TextDecoder().decode(k));
      }
      expect(results).toEqual(["b", "c", "d"]);
    });
  });
});
