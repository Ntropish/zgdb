import { describe, it, expect } from "vitest";
import { createNodeBuilder } from "../node-builder.js";
import { fromString } from "uint8arrays/from-string";
import { LeafNode, KeyValuePair } from "../../node.js";

describe("NodeBuilder", () => {
  it("should build a leaf node", async () => {
    const pairs: KeyValuePair[] = [
      [fromString("a"), fromString("value-a")],
      [fromString("b"), fromString("value-b")],
    ];

    const builder = createNodeBuilder();
    const node = await builder.isLeaf(true).setPairs(pairs).build({});

    expect(node.isLeaf).toBe(true);
    expect((node as LeafNode).pairs).toEqual(pairs);
  });
});
