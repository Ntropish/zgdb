import { BlockStore } from "./block.js";
import { Configuration, defaultConfiguration } from "./configuration.js";
import { isLeafNode, LeafNode, InternalNode, serializeNode } from "./node.js";
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

    const putResult = await this._put(rootNode, key, value);

    if (putResult) {
      if (putResult.splitKey) {
        // The root itself was split. We need to create a new root.
        const newRoot: InternalNode = {
          isLeaf: false,
          keys: [putResult.splitKey],
          children: [this.rootHash, putResult.newAddress],
        };
        const newRootAddress = await this.store.putNode(newRoot);
        return new ProllyTree(this.store, newRootAddress, this.config);
      } else {
        return new ProllyTree(this.store, putResult.newAddress, this.config);
      }
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
  ): Promise<{ newAddress: Uint8Array; splitKey?: Uint8Array } | null> {
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

      let nodeIsTooLarge = false;
      if (this.config.valueChunking.chunkingStrategy === "fastcdc-v2020") {
        nodeIsTooLarge =
          serializeNode(updatedLeaf).length >
          this.config.valueChunking.maxChunkSize;
      }

      if (nodeIsTooLarge) {
        // The node is too large, we need to split it.
        const midpoint = Math.ceil(updatedLeaf.pairs.length / 2);
        const leftPairs = updatedLeaf.pairs.slice(0, midpoint);
        const rightPairs = updatedLeaf.pairs.slice(midpoint);

        const leftLeaf: LeafNode = { isLeaf: true, pairs: leftPairs };
        const rightLeaf: LeafNode = { isLeaf: true, pairs: rightPairs };

        const [leftAddress, rightAddress] = await Promise.all([
          this.store.putNode(leftLeaf),
          this.store.putNode(rightLeaf),
        ]);

        // The key for the new internal node is the first key of the right leaf.
        const splitKey = rightPairs[0][0];

        const newInternalNode: InternalNode = {
          isLeaf: false,
          keys: [splitKey],
          children: [leftAddress, rightAddress],
        };
        const newAddress = await this.store.putNode(newInternalNode);
        return { newAddress, splitKey };
      } else {
        // The node is not too large, just store it.
        const newAddress = await this.store.putNode(updatedLeaf);
        return { newAddress };
      }
    } else {
      // Internal node logic
      // Find the correct child to descend into
      const childIndexToDescend = node.keys.findIndex(
        (k: Uint8Array) => compare(key, k) > 0
      );
      const address =
        childIndexToDescend === -1
          ? node.children[0]
          : node.children[childIndexToDescend + 1];

      const childNode = await this.store.getNode(address);
      if (!childNode) {
        throw new Error("Failed to traverse tree: child node not found");
      }

      const putResult = await this._put(childNode, key, value);

      if (!putResult) {
        // Child was not modified, so no change needed
        return null;
      }

      let newInternalNode: InternalNode;
      const actualChildIndex =
        childIndexToDescend === -1 ? 0 : childIndexToDescend + 1;

      if (putResult.splitKey) {
        // The child split, so we need to add a new key and child to this node.
        const newKeys = [...node.keys];
        newKeys.splice(actualChildIndex, 0, putResult.splitKey);

        const newChildren = [...node.children];
        newChildren.splice(actualChildIndex + 1, 0, putResult.newAddress);

        newInternalNode = { ...node, keys: newKeys, children: newChildren };
      } else {
        // A child was updated without splitting, so we just update its address.
        const newChildren = [...node.children];
        newChildren[actualChildIndex] = putResult.newAddress;
        newInternalNode = { ...node, children: newChildren };
      }

      // Now, check if this internal node needs to split
      let nodeIsTooLarge = false;
      if (this.config.valueChunking.chunkingStrategy === "fastcdc-v2020") {
        nodeIsTooLarge =
          serializeNode(newInternalNode).length >
          this.config.valueChunking.maxChunkSize;
      }

      if (nodeIsTooLarge) {
        const midpoint = Math.ceil(newInternalNode.children.length / 2);
        const splitKey = newInternalNode.keys[midpoint - 1];

        const leftChildren = newInternalNode.children.slice(0, midpoint);
        const leftKeys = newInternalNode.keys.slice(0, midpoint - 1);
        const leftNode: InternalNode = {
          isLeaf: false,
          keys: leftKeys,
          children: leftChildren,
        };

        const rightChildren = newInternalNode.children.slice(midpoint);
        const rightKeys = newInternalNode.keys.slice(midpoint);
        const rightNode: InternalNode = {
          isLeaf: false,
          keys: rightKeys,
          children: rightChildren,
        };

        const [leftAddress, rightAddress] = await Promise.all([
          this.store.putNode(leftNode),
          this.store.putNode(rightNode),
        ]);

        const newParentNode: InternalNode = {
          isLeaf: false,
          keys: [splitKey],
          children: [leftAddress, rightAddress],
        };

        const newParentAddress = await this.store.putNode(newParentNode);

        return { newAddress: newParentAddress, splitKey: splitKey };
      } else {
        const newAddress = await this.store.putNode(newInternalNode);
        return { newAddress };
      }
    }
  }
}
