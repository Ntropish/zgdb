import { describe, it, expect, beforeEach } from "vitest";
import { ProllyTree } from "../prolly-tree.js";
import { BlockManager } from "../block-store.js";
import { Configuration, defaultConfiguration } from "../configuration.js";
import { InternalNodeProxy } from "../node-proxy.js";

const S = (s: string) => new TextEncoder().encode(s);
const D = (b: Uint8Array) => new TextDecoder().decode(b);

describe("ProllyTree Advanced Splitting", () => {
  let blockManager: BlockManager;
  let config: Configuration;

  beforeEach(async () => {
    config = {
      ...defaultConfiguration,
      treeDefinition: {
        ...defaultConfiguration.treeDefinition,
        targetFanout: 2,
        minFanout: 1,
        boundaryChecker: {
          type: "prolly-v1",
          bits: 1,
          pattern: 0b1,
        },
      },
    };
    blockManager = new BlockManager(config);
  });

  it("should handle a split that propagates to a new root", async () => {
    const tree = await ProllyTree.create(blockManager);

    const data: { key: string; value: string }[] = [
      { key: "a", value: "a_val" },
      { key: "b", value: "b_val" },
      { key: "c", value: "c_val" },
      { key: "d", value: "d_val" },
      { key: "e", value: "e_val" },
    ];

    for (const { key, value } of data) {
      await tree.put(S(key), S(value));
    }

    // Verify all keys are retrievable
    for (const { key, value } of data) {
      const retrievedValue = await tree.get(S(key));
      expect(D(retrievedValue!)).toBe(value);
    }
  });
});
