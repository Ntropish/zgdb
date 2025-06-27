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
    const rootNode = await this.store.getNode(this.rootHash);
    if (!rootNode) {
      // This should not happen if the tree is initialized correctly
      throw new Error("Tree has no root node");
    }

    const newRootHash = await this._put(rootNode, key, value);

    if (newRootHash) {
      return new ProllyTree(this.store, newRootHash, this.config);
    } else {
      // If _put returns null, it means the key already existed and the value was identical.
      // No change was made, so we can return the same tree instance.
      return this;
    }
  }

  // Recursive helper for put
  private async _put(
    node: any, // Using any to avoid complex type casting for now
    key: Uint8Array,
    value: Uint8Array
  ): Promise<Uint8Array | null> {
    if (isLeafNode(node)) {
      const existingPairIndex = node.pairs.findIndex(
        ([k, v]) => compare(key, k) === 0
      );

      let newPairs = [...node.pairs];
      if (existingPairIndex !== -1) {
        // Key exists, check if value is the same
        if (compare(newPairs[existingPairIndex][1], value) === 0) {
          // Value is identical, no change needed
          return null;
        }
        // Update existing value
        newPairs[existingPairIndex] = [key, value];
      } else {
        // Insert new key-value pair and maintain sort order
        newPairs.push([key, value]);
        newPairs.sort(([a], [b]) => compare(a, b));
      }

      const updatedLeaf: LeafNode = { ...node, pairs: newPairs };

      // TODO: Check if node needs to be split
      // const nodeIsTooLarge = serializeNode(updatedLeaf).length > this.config.valueChunking.maxChunkSize;
      // if (nodeIsTooLarge) {
      //   ... split logic ...
      // }

      return this.store.putNode(updatedLeaf);
    } else {
      // TODO: Internal node logic
      throw new Error("Internal node put logic not implemented yet.");
    }
  }
}
