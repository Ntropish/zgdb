import { describe, it, expect, beforeEach } from "vitest";
import { ProllyTree } from "../prolly-tree.js";
import { BlockManager } from "../block-store.js";
import { fromString } from "uint8arrays/from-string";
import { NodeManager } from "../node-manager.js";
import { Configuration, defaultConfiguration } from "../configuration.js";
import { merge } from "lodash-es";

describe("ProllyTree Scanning", () => {
  let blockManager: BlockManager;
  let nodeManager: NodeManager;

  beforeEach(() => {
    const config: Partial<Configuration> = {
      hashingAlgorithm: "sha2-256",
      treeDefinition: {
        minFanout: 2,
        targetFanout: 4,
      },
      valueChunking: {
        chunkingStrategy: "fastcdc-v2020",
        maxInlineValueSize: 1,
        minChunkSize: 2,
        avgChunkSize: 4,
        maxChunkSize: 8,
      },
    };
    blockManager = new BlockManager(config);
    const fullConfig = merge({}, defaultConfiguration, config);
    nodeManager = new NodeManager(blockManager, fullConfig);
  });

  function populateTree(keys: string[]): ProllyTree {
    let tree = ProllyTree.createSync(blockManager);
    for (const key of keys) {
      const { tree: newTree } = tree.putSync(
        fromString(key),
        fromString(`value-of-${key}`)
      );
      tree = newTree;
    }
    return tree;
  }

  function S(s: string): Uint8Array {
    return fromString(s);
  }

  describe("scanSync", () => {
    it("should scan all key-value pairs in order", () => {
      const keys = ["a", "b", "c", "d", "e", "f", "g"];
      const tree = populateTree(keys);
      const results: [Uint8Array, Uint8Array][] = Array.from(
        tree.scanSync(S("a"))
      );
      expect(results.length).toBe(7);
      for (let i = 0; i < keys.length; i++) {
        expect(results[i][0]).toEqual(S(keys[i]));
        expect(results[i][1]).toEqual(S(`value-of-${keys[i]}`));
      }
    });

    it("should handle a scan that spans multiple nodes", async () => {
      const keys = Array.from(
        { length: 50 },
        (_, i) => `key${i.toString().padStart(2, "0")}`
      );
      const tree = populateTree(keys);

      const results = Array.from(tree.scanSync(S("key00")));
      expect(results.length).toBe(50);
      expect(results.map(([k]) => new TextDecoder().decode(k))).toEqual(keys);
    });

    it("should scan from a startKey to the end", () => {
      const keys = ["a", "b", "c", "d", "e"];
      const tree = populateTree(keys);
      const results = Array.from(tree.scanSync(S("c")));
      expect(results.length).toBe(3);
      expect(results.map(([k]) => new TextDecoder().decode(k))).toEqual([
        "c",
        "d",
        "e",
      ]);
    });

    it("should scan within a range [startKey, endKey]", () => {
      const keys = ["a", "b", "c", "d", "e", "f", "g"];
      const tree = populateTree(keys);
      const results = Array.from(tree.scanSync(S("c"), S("e")));
      expect(results.length).toBe(3);
      expect(results.map(([k]) => new TextDecoder().decode(k))).toEqual([
        "c",
        "d",
        "e",
      ]);
    });

    it("should return nothing if startKey is past the end", () => {
      const keys = ["a", "b", "c"];
      const tree = populateTree(keys);
      const results = Array.from(tree.scanSync(S("d")));
      expect(results.length).toBe(0);
    });

    it("should handle a startKey that does not exist", () => {
      const keys = ["a", "c", "e"];
      const tree = populateTree(keys);
      const results = Array.from(tree.scanSync(S("b")));
      expect(results.map(([k]) => new TextDecoder().decode(k))).toEqual([
        "c",
        "e",
      ]);
    });

    it("should handle an empty tree", () => {
      const tree = ProllyTree.createSync(blockManager);
      const results = Array.from(tree.scanSync(S("a")));
      expect(results.length).toBe(0);
    });
  });

  describe("scan (async)", () => {
    it("should scan all key-value pairs in order", async () => {
      const keys = ["a", "b", "c", "d", "e", "f", "g"];
      const tree = populateTree(keys);
      const results = [];
      for await (const pair of tree.scan(S("a"))) {
        results.push(pair);
      }
      expect(results.length).toBe(7);
      for (let i = 0; i < keys.length; i++) {
        expect(results[i][0]).toEqual(S(keys[i]));
        expect(results[i][1]).toEqual(S(`value-of-${keys[i]}`));
      }
    });

    it("should scan within a range [startKey, endKey]", async () => {
      const keys = ["a", "b", "c", "d", "e", "f", "g"];
      const tree = populateTree(keys);
      const results = [];
      for await (const pair of tree.scan(S("c"), S("e"))) {
        results.push(pair);
      }
      expect(results.length).toBe(3);
      expect(results.map(([k]) => new TextDecoder().decode(k))).toEqual([
        "c",
        "d",
        "e",
      ]);
    });
  });
});
