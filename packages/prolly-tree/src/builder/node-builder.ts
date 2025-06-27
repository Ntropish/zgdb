import { createFluentBuilder, FluentBuilder } from "@tsmk/builder";
import { LeafNode, InternalNode, Node, KeyValuePair } from "../node.js";

/**
 * A map of events that can be handled by the node builder.
 * This defines the fluent API methods available on the builder.
 */
interface NodeBuilderEventMap {
  isLeaf(isLeaf: boolean): void;
  setPairs(pairs: KeyValuePair[]): void;
}

/**
 * A fluent builder for creating Prolly Tree nodes.
 */
export type NodeBuilder = FluentBuilder<Partial<Node>, NodeBuilderEventMap>;

/**
 * Capabilities for the node builder.
 * These implement the logic for the fluent API methods.
 */
const nodeBuilderCapabilities: {
  [K in keyof NodeBuilderEventMap]: {
    apply: (...args: Parameters<NodeBuilderEventMap[K]>) => any;
    build: (
      product: Partial<Node>,
      applyReturn: any,
      ...args: Parameters<NodeBuilderEventMap[K]>
    ) => void;
  };
} = {
  isLeaf: {
    apply: (isLeaf: boolean) => isLeaf,
    build: (product: Partial<Node>, isLeaf: boolean) => {
      product.isLeaf = isLeaf;
    },
  },
  setPairs: {
    apply: (pairs: KeyValuePair[]) => pairs,
    build: (product: Partial<Node>, pairs: KeyValuePair[]) => {
      if (product.isLeaf) {
        (product as Partial<LeafNode>).pairs = pairs;
      } else {
        throw new Error("Cannot set pairs on a branch node.");
      }
    },
  },
};

/**
 * Creates a new fluent builder for constructing Prolly Tree nodes.
 * @returns A new NodeBuilder instance.
 */
export function createNodeBuilder(): NodeBuilder {
  // We have to cast because the generic builder doesn't know about the specific product type
  const builder = createFluentBuilder<Partial<Node>, NodeBuilderEventMap>(
    nodeBuilderCapabilities
  );
  return builder;
}
