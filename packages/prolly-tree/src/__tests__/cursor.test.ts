import { describe, it, expect, beforeEach } from "vitest";
import { ProllyTree } from "../prolly-tree.js";
import { BlockManager } from "../block-store.js";
import { Configuration, defaultConfiguration } from "../configuration.js";
import { KeyValuePair } from "../node-proxy.js";

const S = (s: string) => new TextEncoder().encode(s);
const D = (b: Uint8Array) => new TextDecoder().decode(b);

describe("ProllyTree Cursor", () => {
  let blockManager: BlockManager;
  let config: Configuration;
  let tree: ProllyTree;

  const N = 50; // Number of entries to test with
  const keys = Array.from(
    { length: N },
    (_, i) => `key${i.toString().padStart(3, "0")}`
  );
  const values = Array.from(
    { length: N },
    (_, i) => `val${i.toString().padStart(3, "0")}`
  );

  async function populateTree(
    keys: string[],
    values: string[]
  ): Promise<ProllyTree> {
    const tree = await ProllyTree.create(blockManager);
    for (let i = 0; i < keys.length; i++) {
      await tree.put(S(keys[i]), S(values[i]));
    }
    return tree;
  }

  beforeEach(async () => {
    config = {
      ...defaultConfiguration,
      treeDefinition: {
        ...defaultConfiguration.treeDefinition,
        targetFanout: 4,
        minFanout: 2,
        boundaryChecker: {
          type: "prolly-v1",
          bits: 1, // High probability of splitting
          pattern: 0b1,
        },
      },
    };
    blockManager = new BlockManager(config);
    tree = await populateTree(keys, values);
  });

  describe("seekSync", () => {
    it("should seek to the first key", () => {
      const cursor = tree.createCursor();
      cursor.seekSync(S("key000"));
      expect(D(cursor.current!.key)).toBe("key000");
    });

    it("should seek to a key in the middle", () => {
      const cursor = tree.createCursor();
      cursor.seekSync(S("key025"));
      expect(D(cursor.current!.key)).toBe("key025");
    });

    it("should seek to the first key at or after a non-existent key", () => {
      const cursor = tree.createCursor();
      cursor.seekSync(S("key025a"));
      expect(D(cursor.current!.key)).toBe("key026");
    });

    it("should return null when seeking past the last key", () => {
      const cursor = tree.createCursor();
      const pair = cursor.seekSync(S("key999"));
      expect(pair).toBeNull();
    });
  });

  describe("nextSync", () => {
    it("should iterate through all pairs in order", () => {
      const cursor = tree.createCursor();
      cursor.seekSync(S("key000"));
      const collectedKeys: string[] = [];
      while (cursor.current) {
        collectedKeys.push(D(cursor.current.key));
        cursor.nextSync();
      }
      expect(collectedKeys).toEqual(keys);
    });

    it("should return null at the end of iteration", () => {
      const cursor = tree.createCursor();
      cursor.seekSync(S("key049"));
      expect(cursor.current).not.toBeNull();
      const pair = cursor.nextSync();
      expect(pair).toBeNull();
      expect(cursor.current).toBeNull();
    });
  });

  describe("seek (async)", () => {
    it("should seek to the first key", async () => {
      const cursor = tree.createCursor();
      await cursor.seek(S("key000"));
      expect(D(cursor.current!.key)).toBe("key000");
    });

    it("should seek to a key in the middle", async () => {
      const cursor = tree.createCursor();
      await cursor.seek(S("key025"));
      expect(D(cursor.current!.key)).toBe("key025");
    });

    it("should seek to the first key at or after a non-existent key", async () => {
      const cursor = tree.createCursor();
      await cursor.seek(S("key025a"));
      expect(D(cursor.current!.key)).toBe("key026");
    });

    it("should return null when seeking past the last key", async () => {
      const cursor = tree.createCursor();
      const pair = await cursor.seek(S("key999"));
      expect(pair).toBeNull();
    });
  });

  describe("next (async)", () => {
    it("should iterate through all pairs in order", async () => {
      const cursor = tree.createCursor();
      await cursor.seek(S("key000"));
      const collectedKeys: string[] = [];
      while (cursor.current) {
        collectedKeys.push(D(cursor.current.key));
        await cursor.next();
      }
      expect(collectedKeys).toEqual(keys);
    });
  });

  describe("Edge Cases", () => {
    let emptyTree: ProllyTree;
    beforeEach(async () => {
      emptyTree = await ProllyTree.create(blockManager);
    });

    it("should handle seeking in an empty tree", () => {
      const cursor = emptyTree.createCursor();
      const pair = cursor.seekSync(S("any"));
      expect(pair).toBeNull();
    });

    it("should handle next() in an empty tree", () => {
      const cursor = emptyTree.createCursor();
      cursor.seekSync(S("any"));
      const pair = cursor.nextSync();
      expect(pair).toBeNull();
    });
  });
});
