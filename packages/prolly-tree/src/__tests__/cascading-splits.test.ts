import { describe, it, expect, beforeEach } from "vitest";
import { ProllyTree } from "../prolly-tree.js";
import { BlockManager } from "../block-store.js";
import { Configuration, defaultConfiguration } from "../configuration.js";

const S = (s: string) => new TextEncoder().encode(s);
const D = (b: Uint8Array) => new TextDecoder().decode(b);

describe("Cascading Splits", () => {
  let blockManager: BlockManager;
  let config: Configuration;

  const N = 100; // A larger number to ensure multiple levels of splits
  const keys = Array.from({ length: N }, (_, i) =>
    S(`key${i.toString().padStart(3, "0")}`)
  );
  const values = Array.from({ length: N }, (_, i) =>
    S(`val${i.toString().padStart(3, "0")}`)
  );

  beforeEach(() => {
    config = {
      ...defaultConfiguration,
      treeDefinition: {
        ...defaultConfiguration.treeDefinition,
        targetFanout: 4,
        minFanout: 2,
        boundaryChecker: {
          type: "prolly-v1",
          bits: 2,
          pattern: 0b11,
        },
      },
    };
    blockManager = new BlockManager(config);
  });

  it("should correctly handle cascading splits resulting in a multi-level tree", async () => {
    const tree = await ProllyTree.create(blockManager);

    for (let i = 0; i < N; i++) {
      await tree.put(keys[i], values[i]);
    }

    // Verify all keys are retrievable
    for (let i = 0; i < N; i++) {
      const retrievedValue = tree.getSync(keys[i]);
      expect(retrievedValue).toBeDefined();
      expect(D(retrievedValue!)).toBe(D(values[i]));
    }
  });
});
