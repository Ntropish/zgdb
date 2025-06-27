import { BlockStore } from "./block.js";
import { Configuration, defaultConfiguration } from "./configuration.js";
import { isLeafNode, LeafNode } from "./node.js";
import { Diff } from "./types.js";
import { compare } from "uint8arrays/compare";

export class ProllyTree {
  public readonly config: Configuration;

  constructor(
    public readonly store: BlockStore,
    public readonly rootHash: Uint8Array,
    config?: Configuration
  ) {
    this.config = config ?? defaultConfiguration;
  }

  async get(key: Uint8Array): Promise<Uint8Array | undefined> {
    let node = await this.store.getNode(this.rootHash);
    if (!node) {
      return undefined;
    }

    while (!isLeafNode(node)) {
      // Find the correct child to descend into
      const childIndex = node.keys.findIndex((k) => compare(key, k) < 0);

      if (childIndex === -1) {
        // key is greater than all keys, so descend into the rightmost child
        const childAddress = node.children[node.children.length - 1];
        node = await this.store.getNode(childAddress);
      } else {
        const childAddress = node.children[childIndex];
        node = await this.store.getNode(childAddress);
      }

      if (!node) {
        // This indicates a broken link in the tree
        throw new Error("Failed to traverse tree: node not found");
      }
    }

    // We've found the leaf node, now find the key
    const pair = node.pairs.find(([k, v]) => compare(key, k) === 0);
    return pair ? pair[1] : undefined;
  }

  async put(key: Uint8Array, value: Uint8Array): Promise<ProllyTree> {
    // TODO: This is a temporary, naive implementation.
    // It does not handle splitting nodes or updating existing values correctly.
    // It just creates a new root with the new key-value pair.
    const newLeaf: LeafNode = {
      isLeaf: true,
      pairs: [[key, value]],
    };
    const newRootHash = await this.store.putNode(newLeaf);
    return new ProllyTree(this.store, newRootHash, this.config);
  }
}
