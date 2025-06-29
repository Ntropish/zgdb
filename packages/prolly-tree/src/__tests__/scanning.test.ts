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
        boundaryChecker: {
          type: "prolly-v1",
          bits: 1, // High probability of splitting
          pattern: 0b1,
        },
      },
    };
    blockManager = new BlockManager(config);
  });

  async function populateTree(keys: string[]): Promise<ProllyTree> {
    const tree = await ProllyTree.create(blockManager);
    for (const key of keys) {
      await tree.put(S(key), S(`v-${key}`));
    }
    return tree;
  }

  describe("scanSync", () => {
    it("should scan all key-value pairs in order", async () => {
      const keys = ["a", "b", "c", "d", "e"];
      const tree = await populateTree(keys);
      const results: [string, string][] = [];
      for (const [k, v] of tree.scanSync()) {
        results.push([
          new TextDecoder().decode(k),
          new TextDecoder().decode(v),
        ]);
      }
      console.log(await tree.print());
      expect(results.map(([k]) => k)).toEqual(keys);
      expect(results.map(([, v]) => v)).toEqual(keys.map((k) => `v-${k}`));
    });

    it("should handle a scan that spans multiple nodes", async () => {
      const keys = ["a", "b", "c", "d", "e", "f", "g"];
      const tree = await populateTree(keys);
      const results: string[] = [];
      for (const [k] of tree.scanSync({
        start: { key: S("a"), inclusive: true },
      })) {
        results.push(new TextDecoder().decode(k));
      }
      expect(results).toEqual(keys);
    });

    it("should scan from a startKey to the end", async () => {
      const keys = ["a", "b", "c", "d", "e"];
      const tree = await populateTree(keys);
      const results: string[] = [];
      for (const [k] of tree.scanSync({
        start: { key: S("c"), inclusive: true },
      })) {
        results.push(new TextDecoder().decode(k));
      }
      expect(results).toEqual(["c", "d", "e"]);
    });

    it("should scan within a range [startKey, endKey]", async () => {
      const keys = ["a", "b", "c", "d", "e"];
      const tree = await populateTree(keys);
      const results: string[] = [];
      for (const [k] of tree.scanSync({
        start: { key: S("b"), inclusive: true },
        end: { key: S("d"), inclusive: true },
      })) {
        results.push(new TextDecoder().decode(k));
      }
      expect(results).toEqual(["b", "c", "d"]);
    });

    it("should handle exclusive startKey", async () => {
      const keys = ["a", "b", "c", "d", "e"];
      const tree = await populateTree(keys);
      const results: string[] = [];
      for (const [k] of tree.scanSync({
        start: { key: S("b"), inclusive: false },
        end: { key: S("d"), inclusive: true },
      })) {
        results.push(new TextDecoder().decode(k));
      }
      expect(results).toEqual(["c", "d"]);
    });

    it("should handle exclusive endKey", async () => {
      const keys = ["a", "b", "c", "d", "e"];
      const tree = await populateTree(keys);
      const results: string[] = [];
      for (const [k] of tree.scanSync({
        start: { key: S("b"), inclusive: true },
        end: { key: S("d"), inclusive: false },
      })) {
        results.push(new TextDecoder().decode(k));
      }
      expect(results).toEqual(["b", "c"]);
    });

    it("should handle exclusive startKey and endKey", async () => {
      const keys = ["a", "b", "c", "d", "e"];
      const tree = await populateTree(keys);
      const results: string[] = [];
      for (const [k] of tree.scanSync({
        start: { key: S("b"), inclusive: false },
        end: { key: S("d"), inclusive: false },
      })) {
        results.push(new TextDecoder().decode(k));
      }
      expect(results).toEqual(["c"]);
    });

    it("should return nothing if startKey is past the end", async () => {
      const keys = ["a", "b", "c"];
      const tree = await populateTree(keys);
      const results = Array.from(
        tree.scanSync({ start: { key: S("d"), inclusive: true } })
      );
      expect(results.length).toBe(0);
    });

    it("should handle a startKey that does not exist", async () => {
      const keys = ["a", "c", "e"];
      const tree = await populateTree(keys);
      const results: string[] = [];
      for (const [k] of tree.scanSync({
        start: { key: S("b"), inclusive: true },
      })) {
        results.push(new TextDecoder().decode(k));
      }
      expect(results).toEqual(["c", "e"]);
    });

    it("should handle an empty tree", async () => {
      const tree = await ProllyTree.create(blockManager);
      const results = Array.from(
        tree.scanSync({ start: { key: S("a"), inclusive: true } })
      );
      expect(results.length).toBe(0);
    });
  });

  describe("scan (async)", () => {
    it("should scan all key-value pairs in order", async () => {
      const keys = ["a", "b", "c", "d", "e"];
      const tree = await populateTree(keys);
      const results: [string, string][] = [];
      for await (const [k, v] of tree.scan()) {
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
      for await (const [k] of tree.scan({
        start: { key: S("b"), inclusive: true },
        end: { key: S("d"), inclusive: true },
      })) {
        results.push(new TextDecoder().decode(k));
      }
      expect(results).toEqual(["b", "c", "d"]);
    });
  });
});
