import { createFluentBuilder, FluentBuilder } from "@tsmk/builder";
import {
  LeafNode,
  InternalNode,
  Node,
  KeyValuePair,
  Address,
} from "../node.js";

/**
 * A map of events that can be handled by the node builder.
 * This defines the fluent API methods available on the builder.
 */
interface NodeBuilderEventMap {
  isLeaf(isLeaf: boolean): void;
  setPairs(pairs: KeyValuePair[]): void;
  setKeys(keys: Uint8Array[]): void;
  setChildren(children: Address[]): void;
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
      (product as Partial<LeafNode>).pairs = pairs;
    },
  },
  setKeys: {
    apply: (keys: Uint8Array[]) => keys,
    build: (product: Partial<Node>, keys: Uint8Array[]) => {
      (product as Partial<InternalNode>).keys = keys;
    },
  },
  setChildren: {
    apply: (children: Address[]) => children,
    build: (product: Partial<Node>, children: Address[]) => {
      (product as Partial<InternalNode>).children = children;
    },
  },
};

/**
 * Creates a new fluent builder for constructing Prolly Tree nodes.
 * @returns A new NodeBuilder instance.
 */
export function createNodeBuilder(): NodeBuilder {
  const builder = createFluentBuilder<Partial<Node>, NodeBuilderEventMap>(
    nodeBuilderCapabilities
  );

  const originalBuild = builder.build;
  builder.build = async (
    product: Partial<Node> = {}
  ): Promise<Partial<Node>> => {
    const builtProduct = await originalBuild(product);

    if (builtProduct.isLeaf === undefined) {
      throw new Error("Node type must be specified by calling isLeaf()");
    }

    if (builtProduct.isLeaf) {
      if ((builtProduct as Partial<InternalNode>).keys) {
        throw new Error("Cannot set keys on a leaf node.");
      }
      if ((builtProduct as Partial<InternalNode>).children) {
        throw new Error("Cannot set children on a leaf node.");
      }
    } else {
      if ((builtProduct as Partial<LeafNode>).pairs) {
        throw new Error("Cannot set pairs on a branch node.");
      }
    }

    return builtProduct;
  };

  return builder;
}
