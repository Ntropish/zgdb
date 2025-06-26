import { createBuilder, CapabilityMap } from "../index.js";
import { describe, it, expect } from "vitest";

type Builder<
  TProduct extends object,
  TEventMap extends Record<string, any>
> = ReturnType<typeof createBuilder<TProduct, TEventMap>>;

describe("Builder Edge Cases: Deep Recursion", () => {
  it("should handle very deep recursion without crashing", async () => {
    interface TreeNode {
      name: string;
      child: TreeNode | null;
    }

    type NodeBuilder = Builder<TreeNode, NodeEventMap>;
    interface NodeEventMap {
      addChild(name: string): NodeBuilder;
      setName(name: string): void;
    }

    const nodeCapabilities: CapabilityMap<TreeNode, NodeEventMap> = {
      addChild: {
        apply: (name: string) => {
          const childBuilder = createBuilder<TreeNode, NodeEventMap>(
            nodeCapabilities
          );
          childBuilder.apply("setName", name);
          return childBuilder;
        },
        build: async (product: TreeNode, childBuilder: NodeBuilder) => {
          const childNode: TreeNode = { name: "", child: null };
          await childBuilder.build(childNode);
          product.child = childNode;
        },
      },
      setName: {
        build: (product: TreeNode, _: any, name: string) => {
          product.name = name;
        },
      },
    };

    const rootBuilder = createBuilder<TreeNode, NodeEventMap>(nodeCapabilities);
    rootBuilder.apply("setName", "root");

    const recursionDepth = 5000;
    let currentBuilder: NodeBuilder = rootBuilder;
    for (let i = 0; i < recursionDepth; i++) {
      currentBuilder = currentBuilder.apply("addChild", `node-${i}`);
    }

    const product = await rootBuilder.build({ name: "", child: null });

    let currentNode: TreeNode | null = product;
    for (let i = 0; i < recursionDepth; i++) {
      expect(currentNode?.child).not.toBeNull();
      currentNode = currentNode!.child;
    }

    expect(currentNode?.name).toBe(`node-${recursionDepth - 1}`);
  }, 30000); // Increase timeout for this test
});
