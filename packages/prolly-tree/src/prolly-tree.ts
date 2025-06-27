import { BlockStore } from "./block.js";
import { Configuration, defaultConfiguration } from "./configuration.js";
import { isLeafNode, LeafNode, InternalNode, serializeNode } from "./node.js";
import { Diff, ConflictResolver } from "./types.js";
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

  static async merge(
    local: ProllyTree,
    remote: ProllyTree,
    base: ProllyTree,
    resolver: ConflictResolver
  ): Promise<ProllyTree> {
    const [localRoot, remoteRoot, baseRoot] = await Promise.all([
      local.store.getNode(local.rootHash),
      remote.store.getNode(remote.rootHash),
      base.store.getNode(base.rootHash),
    ]);

    if (!localRoot || !remoteRoot || !baseRoot) {
      throw new Error("One or more trees has no root node");
    }

    // The merge result could be a split, so we handle it like in `put`
    const mergeResult = await this._merge(
      localRoot,
      remoteRoot,
      baseRoot,
      resolver,
      local.store // Assume all stores are the same for now
    );

    if (mergeResult) {
      // TODO: Handle root split from merge
      return new ProllyTree(local.store, mergeResult.newAddress, local.config);
    } else {
      // No changes between local and remote from base
      return local;
    }
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

  async delete(key: Uint8Array): Promise<ProllyTree> {
    const rootNode = await this.store.getNode(this.rootHash);
    if (!rootNode) {
      throw new Error("Tree has no root node");
    }

    const newRootHash = await this._delete(rootNode, key);

    if (newRootHash) {
      return new ProllyTree(this.store, newRootHash, this.config);
    } else {
      // If _delete returns null, it means the key wasn't found.
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

  // Recursive helper for delete
  private async _delete(
    node: any, // Using any to avoid complex type casting for now
    key: Uint8Array
  ): Promise<Uint8Array | null> {
    if (isLeafNode(node)) {
      const pairIndex = node.pairs.findIndex(([k, v]) => compare(key, k) === 0);

      if (pairIndex === -1) {
        // Key not found, no change needed
        return null;
      }

      const newPairs = [...node.pairs];
      newPairs.splice(pairIndex, 1);
      const updatedLeaf: LeafNode = { ...node, pairs: newPairs };
      return this.store.putNode(updatedLeaf);
    } else {
      // Internal node logic
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

      const newChildAddress = await this._delete(childNode, key);

      if (!newChildAddress) {
        // Child was not modified, so no change needed
        return null;
      }

      // A child was updated, so we need to create a new internal node
      const newChildren = [...node.children];
      const actualChildIndex =
        childIndexToDescend === -1 ? 0 : childIndexToDescend + 1;
      newChildren[actualChildIndex] = newChildAddress;
      const newInternalNode: InternalNode = {
        ...node,
        children: newChildren,
      };

      return this.store.putNode(newInternalNode);
    }
  }

  private static async _merge(
    localNode: LeafNode | InternalNode,
    remoteNode: LeafNode | InternalNode,
    baseNode: LeafNode | InternalNode,
    resolver: ConflictResolver,
    store: BlockStore
  ): Promise<{ newAddress: Uint8Array; splitKey?: Uint8Array } | null> {
    // For now, we only handle leaf nodes
    if (
      isLeafNode(localNode) &&
      isLeafNode(remoteNode) &&
      isLeafNode(baseNode)
    ) {
      const mergedPairs: [Uint8Array, Uint8Array][] = [];
      let i = 0,
        j = 0,
        k = 0;
      const localPairs = localNode.pairs;
      const remotePairs = remoteNode.pairs;
      const basePairs = baseNode.pairs;

      while (
        i < localPairs.length ||
        j < remotePairs.length ||
        k < basePairs.length
      ) {
        const keyL = i < localPairs.length ? localPairs[i][0] : null;
        const keyR = j < remotePairs.length ? remotePairs[j][0] : null;
        const keyB = k < basePairs.length ? basePairs[k][0] : null;

        const advance = (l: boolean, r: boolean, b: boolean) => {
          if (l) i++;
          if (r) j++;
          if (b) k++;
        };

        const minKey = [keyL, keyR, keyB]
          .filter((key): key is Uint8Array => key !== null)
          .reduce((min, key) => (compare(key, min) < 0 ? key : min));

        const valL =
          keyL && compare(keyL, minKey) === 0 ? localPairs[i][1] : null;
        const valR =
          keyR && compare(keyR, minKey) === 0 ? remotePairs[j][1] : null;
        const valB =
          keyB && compare(keyB, minKey) === 0 ? basePairs[k][1] : null;

        // Now, the core merge logic based on valL, valR, valB
        if (valL && valR && valB) {
          // Present in all three
          const l_eq_b = compare(valL, valB) === 0;
          const r_eq_b = compare(valR, valB) === 0;
          if (l_eq_b && r_eq_b) {
            // No change
            mergedPairs.push([minKey, valB]);
          } else if (l_eq_b) {
            // Only remote changed
            mergedPairs.push([minKey, valR]);
          } else if (r_eq_b) {
            // Only local changed
            mergedPairs.push([minKey, valL]);
          } else {
            // Conflict
            const resolved = await resolver(minKey, valB, valL, valR);
            if (resolved) mergedPairs.push([minKey, resolved]);
          }
          advance(true, true, true);
        } else if (valL && valR) {
          // Added in both branches
          const resolved = await resolver(minKey, undefined, valL, valR);
          if (resolved) mergedPairs.push([minKey, resolved]);
          advance(true, true, false);
        } else if (valL && valB) {
          // In local and base, but not remote (deleted in remote)
          if (compare(valL, valB) === 0) {
            // Deleted in remote, unchanged in local. Net result: deleted.
          } else {
            // Modified in local, deleted in remote: conflict
            const resolved = await resolver(minKey, valB, valL, undefined);
            if (resolved) mergedPairs.push([minKey, resolved]);
          }
          advance(true, false, true);
        } else if (valR && valB) {
          // In remote and base, but not local (deleted in local)
          if (compare(valR, valB) === 0) {
            // Deleted in local, unchanged in remote. Net result: deleted.
          } else {
            // Modified in remote, deleted in local: conflict
            const resolved = await resolver(minKey, valB, undefined, valR);
            if (resolved) mergedPairs.push([minKey, resolved]);
          }
          advance(false, true, true);
        } else if (valL) {
          // Added only in local
          mergedPairs.push([minKey, valL]);
          advance(true, false, false);
        } else if (valR) {
          // Added only in remote
          mergedPairs.push([minKey, valR]);
          advance(false, true, false);
        } else if (valB) {
          // In base only, so deleted in both local and remote.
          advance(false, false, true);
        }
      }

      const mergedLeaf: LeafNode = { isLeaf: true, pairs: mergedPairs };
      // TODO: Handle node splitting
      const newAddress = await store.putNode(mergedLeaf);
      return { newAddress };
    } else if (
      !isLeafNode(localNode) &&
      !isLeafNode(remoteNode) &&
      !isLeafNode(baseNode)
    ) {
      // Logic for merging internal nodes will go here
      console.log("Merging internal nodes...");
      const newAddress = await store.putNode(localNode);
      return { newAddress };
    } else {
      throw new Error("Tree structures are not consistent for merge");
    }
  }
}
