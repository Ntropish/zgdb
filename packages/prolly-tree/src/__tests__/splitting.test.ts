import { describe, it, expect, beforeEach } from "vitest";
import {
  Store,
  ProllyTree,
  Configuration,
  defaultConfiguration,
  FastCDCChunking,
} from "../index.js";

const enc = new TextEncoder();

describe("ProllyTree Splitting", () => {
  let store: Store;
  let config: Configuration;

  beforeEach(async () => {
    // Use FastCDC config to access maxChunkSize, and set it low to force a split
    const fastCdcConfig: FastCDCChunking = {
      chunkingStrategy: "fastcdc-v2020",
      maxInlineValueSize: 1024,
      minChunkSize: 64,
      avgChunkSize: 128,
      maxChunkSize: 150, // Very low threshold to guarantee a split
    };
    config = {
      ...defaultConfiguration,
      valueChunking: fastCdcConfig,
      hashingAlgorithm: "sha2-256",
    };
    store = new Store(config);
  });

  it("should split a leaf node when it becomes too large", async () => {
    let tree = await store.getTree();

    // Insert enough data to trigger a split.
    // Each pair is roughly 10 bytes for key, 10 for value, plus overhead.
    // 10 pairs should be enough to exceed the 150 byte limit.
    for (let i = 0; i < 10; i++) {
      const key = enc.encode(`key${i.toString().padStart(2, "0")}`);
      const value = enc.encode(`value${i}`);
      tree = await tree.put(key, value);
    }

    // After splitting, the root should no longer be a leaf node.
    const rootNode = await store.blockStore.getNode(tree.rootHash);
    expect(rootNode).toBeDefined();
    if (!rootNode) return; // type guard

    expect(rootNode.isLeaf).toBe(false);

    // Verify that we can still retrieve all the keys
    for (let i = 0; i < 10; i++) {
      const key = enc.encode(`key${i.toString().padStart(2, "0")}`);
      const value = enc.encode(`value${i}`);
      const result = await tree.get(key);
      expect(result).toEqual(value);
    }
  });
});
