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
    const localDiffs = await base.diff(local);
    const remoteDiffs = await base.diff(remote);

    const mergedDiffs = await ProllyTree._mergeDiffs(
      localDiffs,
      remoteDiffs,
      resolver
    );

    let workingTree = base;
    for (const diff of mergedDiffs) {
      if (diff.remoteValue !== undefined) {
        // This covers additions and modifications
        workingTree = await workingTree.put(diff.key, diff.remoteValue);
      } else {
        // This covers deletions
        workingTree = await workingTree.delete(diff.key);
      }
    }
    return workingTree;
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

  async diff(other: ProllyTree): Promise<Diff[]> {
    const [thisRoot, otherRoot] = await Promise.all([
      this.store.getNode(this.rootHash),
      other.store.getNode(other.rootHash),
    ]);
    if (!thisRoot || !otherRoot) {
      throw new Error("One or both trees have no root node");
    }
    return this._diff(thisRoot, otherRoot);
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

  private async _diff(
    thisNode: LeafNode | InternalNode,
    otherNode: LeafNode | InternalNode
  ): Promise<Diff[]> {
    if (thisNode.isLeaf !== otherNode.isLeaf) {
      // One is a leaf and the other is an internal node.
      // This is a major structural change. For simplicity, we'll treat it as
      // all of `thisNode`'s pairs being deleted and all of `otherNode`'s pairs being added.
      // A more sophisticated diff could be done, but this is a reasonable start.
      const diffs: Diff[] = [];
      const thisPairs = isLeafNode(thisNode)
        ? thisNode.pairs
        : await this.getAllPairs(thisNode);
      const otherPairs = isLeafNode(otherNode)
        ? otherNode.pairs
        : await this.getAllPairs(otherNode);

      thisPairs.forEach(([key, value]) =>
        diffs.push({ key, localValue: value, remoteValue: undefined })
      );
      otherPairs.forEach(([key, value]) =>
        diffs.push({ key, localValue: undefined, remoteValue: value })
      );
      return diffs;
    }

    if (isLeafNode(thisNode) && isLeafNode(otherNode)) {
      const diffs: Diff[] = [];
      let i = 0,
        j = 0;
      const pairs1 = thisNode.pairs;
      const pairs2 = otherNode.pairs;

      while (i < pairs1.length || j < pairs2.length) {
        const p1 = i < pairs1.length ? pairs1[i] : null;
        const p2 = j < pairs2.length ? pairs2[j] : null;

        if (p1 && p2) {
          const keyComp = compare(p1[0], p2[0]);
          if (keyComp === 0) {
            const valComp = compare(p1[1], p2[1]);
            if (valComp !== 0) {
              diffs.push({
                key: p1[0],
                localValue: p1[1],
                remoteValue: p2[1],
              });
            }
            i++;
            j++;
          } else if (keyComp < 0) {
            diffs.push({
              key: p1[0],
              localValue: p1[1],
              remoteValue: undefined,
            });
            i++;
          } else {
            diffs.push({
              key: p2[0],
              localValue: undefined,
              remoteValue: p2[1],
            });
            j++;
          }
        } else if (p1) {
          diffs.push({
            key: p1[0],
            localValue: p1[1],
            remoteValue: undefined,
          });
          i++;
        } else if (p2) {
          diffs.push({
            key: p2[0],
            localValue: undefined,
            remoteValue: p2[1],
          });
          j++;
        }
      }
      return diffs;
    }

    const node1 = thisNode as InternalNode;
    const node2 = otherNode as InternalNode;
    const diffs: Diff[] = [];
    let i = 0; // Pointer for node1 children
    let j = 0; // Pointer for node2 children

    while (i < node1.children.length || j < node2.children.length) {
      const key1 = i < node1.keys.length ? node1.keys[i] : null;
      const key2 = j < node2.keys.length ? node2.keys[j] : null;

      if (key1 && key2 && compare(key1, key2) === 0) {
        // Common key, diff children before it
        const child1 = await this.store.getNode(node1.children[i]);
        const child2 = await this.store.getNode(node2.children[j]);
        if (!child1 || !child2) throw new Error("Missing child");
        diffs.push(...(await this._diff(child1, child2)));
        i++;
        j++;
      } else if (key1 && (!key2 || compare(key1, key2) < 0)) {
        // node1 has a segment node2 doesn't. This child is a deletion.
        const child1 = await this.store.getNode(node1.children[i]);
        if (!child1) throw new Error("Missing child");
        diffs.push(
          ...(await this.getAllPairs(child1)).map(([k, v]) => ({
            key: k,
            localValue: v,
            remoteValue: undefined,
          }))
        );
        i++;
      } else if (key2 && (!key1 || compare(key2, key1) < 0)) {
        // node2 has a segment node1 doesn't. This child is an addition.
        const child2 = await this.store.getNode(node2.children[j]);
        if (!child2) throw new Error("Missing child");
        diffs.push(
          ...(await this.getAllPairs(child2)).map(([k, v]) => ({
            key: k,
            localValue: undefined,
            remoteValue: v,
          }))
        );
        j++;
      } else {
        // This is the last segment, after all keys.
        const child1 = await this.store.getNode(node1.children[i]);
        const child2 = await this.store.getNode(node2.children[j]);
        if (!child1 || !child2) throw new Error("Missing child");
        diffs.push(...(await this._diff(child1, child2)));
        i++;
        j++;
      }
    }

    return diffs;
  }

  // Helper to get all pairs from a subtree, needed for leaf/internal diff
  private async getAllPairs(
    node: LeafNode | InternalNode
  ): Promise<[Uint8Array, Uint8Array][]> {
    if (isLeafNode(node)) {
      return node.pairs;
    }
    let allPairs: [Uint8Array, Uint8Array][] = [];
    for (const childAddress of node.children) {
      const childNode = await this.store.getNode(childAddress);
      if (!childNode) throw new Error("Missing node in getAllPairs");
      const childPairs = await this.getAllPairs(childNode);
      allPairs = allPairs.concat(childPairs);
    }
    return allPairs;
  }

  private static async _mergeDiffs(
    localDiffs: Diff[],
    remoteDiffs: Diff[],
    resolver: ConflictResolver
  ): Promise<Diff[]> {
    const merged: Diff[] = [];
    let i = 0,
      j = 0;

    while (i < localDiffs.length || j < remoteDiffs.length) {
      const d1 = i < localDiffs.length ? localDiffs[i] : null;
      const d2 = j < remoteDiffs.length ? remoteDiffs[j] : null;

      if (d1 && d2) {
        const keyComp = compare(d1.key, d2.key);
        if (keyComp === 0) {
          // Conflict: same key was changed in both branches
          const resolvedValue = await resolver(
            d1.key,
            d1.localValue, // base value
            d1.remoteValue, // local's new value
            d2.remoteValue // remote's new value
          );
          merged.push({
            key: d1.key,
            localValue: d1.localValue,
            remoteValue: resolvedValue,
          });
          i++;
          j++;
        } else if (keyComp < 0) {
          merged.push(d1);
          i++;
        } else {
          merged.push(d2);
          j++;
        }
      } else if (d1) {
        merged.push(d1);
        i++;
      } else if (d2) {
        merged.push(d2);
        j++;
      }
    }
    return merged;
  }
}
