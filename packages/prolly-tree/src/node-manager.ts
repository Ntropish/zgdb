import { BlockManager } from "./block-store.js";
import { Configuration } from "./configuration.js";
import { Node, LeafNode, InternalNode, Address, KeyValuePair } from "./node.js";
import { compare } from "uint8arrays/compare";

// A key-value pair for leaf nodes
export type LeafEntry = KeyValuePair;

// An entry for internal nodes, pairing a key with a child address.
// We model this as a tuple for clarity, but it's represented as separate
// `keys` and `children` arrays in the InternalNode interface.
export type InternalEntry = [Uint8Array, Address];

export class NodeManager {
  constructor(
    public readonly blockManager: BlockManager,
    private readonly config: Configuration
  ) {}

  async getNode(address: Address): Promise<Node> {
    const node = await this.blockManager.getNode(address);
    if (!node) {
      throw new Error(`Node not found at address: ${address.toString()}`);
    }
    return node;
  }

  async putNode(node: Node): Promise<Address> {
    return this.blockManager.putNode(node);
  }

  createLeafNode(pairs: KeyValuePair[]): LeafNode {
    // Ensure pairs are sorted by key
    pairs.sort(([keyA], [keyB]) => compare(keyA, keyB));
    return {
      isLeaf: true,
      pairs: pairs,
    };
  }

  createInternalNode(keys: Uint8Array[], children: Address[]): InternalNode {
    // Keys and children must be passed in correct sorted order.
    // The number of keys should be one less than the number of children.
    if (keys.length !== children.length - 1) {
      throw new Error(
        "Internal node invariant violated: keys.length must be children.length - 1"
      );
    }
    return {
      isLeaf: false,
      keys: keys,
      children: children,
    };
  }
}
