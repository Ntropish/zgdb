import { describe, it, expect, beforeEach } from "vitest";
import { NodeManager } from "../node-manager.js";
import { BlockManager } from "../block-store.js";
import { KeyValuePair } from "../node-proxy.js";
import { Configuration, defaultConfiguration } from "../configuration.js";
import { fromString } from "uint8arrays/from-string";
import { faker } from "@faker-js/faker";
import { ProllyTree } from "../prolly-tree.js";
import { sampleSize } from "lodash-es";
import { logTree } from "./logTree.js";

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
    blockManager = new BlockManager(config);
    nodeManager = new NodeManager(blockManager, config);
  });

  it.only("The Librarian of Babels Index: should handle mass insertions and updates via ProllyTree", async () => {
    const tree = await ProllyTree.create(blockManager);

    const manuscripts = Array.from({ length: MANUSCRIPT_COUNT }, () => ({
      id: faker.string.uuid(),
      content: faker.lorem.paragraph(),
    }));
    const manuscriptData = manuscripts.map((m) => ({
      key: fromString(m.id),
      value: fromString(m.content),
    }));

    for (const data of manuscriptData) {
      console.log(
        `put (${new TextDecoder().decode(data.key)}, ${new TextDecoder().decode(
          data.value
        )})`
      );
      await tree.put(data.key, data.value);
      logTree(await tree.print());
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
