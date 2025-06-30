import { describe, it, expect, beforeEach } from "vitest";
import { NodeManager } from "../node-manager.js";
import { BlockManager } from "../block-store.js";
import { KeyValuePair } from "../node-proxy.js";
import { Configuration, defaultConfiguration } from "../configuration.js";
import { fromString } from "uint8arrays/from-string";
import { ProllyTree } from "../prolly-tree.js";
import { faker } from "@faker-js/faker";
import { sampleSize } from "lodash-es";
import { logTree } from "./logTree.js";
import { toString } from "uint8arrays";

const generateManuscriptData = (count: number) => {
  return Array.from({ length: count }, () => ({
    key: fromString(faker.string.uuid()),
    value: fromString(faker.lorem.paragraph()),
  }));
};

describe("NodeManager Deep Tests", () => {
  let blockManager: BlockManager;
  let nodeManager: NodeManager;
  let config: Configuration;
  const MANUSCRIPT_COUNT = 500;

  beforeEach(() => {
    config = {
      ...defaultConfiguration,
      treeDefinition: {
        ...defaultConfiguration.treeDefinition,
        targetFanout: 8,
        minFanout: 4,
        boundaryChecker: {
          type: "prolly-v1",
          bits: 4,
          pattern: 0b1111,
        },
      },
      hashingAlgorithm: "sha2-256",
    };
    const store = new Map();
    blockManager = new BlockManager();
    nodeManager = new NodeManager(blockManager, config);
  });

  it("The Librarian of Babels Index: should handle mass insertions and updates via ProllyTree", async () => {
    const tree = await ProllyTree.create(blockManager);

    const manuscriptData = generateManuscriptData(MANUSCRIPT_COUNT);

    for (const data of manuscriptData) {
      await tree.put(data.key, data.value);
    }

    for (const data of manuscriptData) {
      const foundValue = await tree.get(data.key);
      expect(foundValue).toBeDefined();
      expect(foundValue).toEqual(data.value);
    }

    const manuscriptsToUpdate = sampleSize(manuscriptData, 50).map((m) => ({
      ...m,
      value: fromString(faker.lorem.sentence()),
    }));
    const updatedIds = new Set(
      manuscriptsToUpdate.map((m) => m.key.toString())
    );

    for (const data of manuscriptsToUpdate) {
      await tree.put(data.key, data.value);
    }

    for (const data of manuscriptsToUpdate) {
      const foundValue = await tree.get(data.key);
      expect(foundValue).toEqual(data.value);
    }

    const unchangedManuscripts = manuscriptData.filter(
      (m) => !updatedIds.has(m.key.toString())
    );
    for (const data of sampleSize(unchangedManuscripts, 50)) {
      const foundValue = await tree.get(data.key);
      expect(foundValue).toEqual(data.value);
    }
  });
});
