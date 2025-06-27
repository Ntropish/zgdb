import { BlockManager } from "./block-store.js";
import { Configuration, defaultConfiguration } from "./configuration.js";
import { NodeManager } from "./node-manager.js";
import {
  isLeafNode,
  LeafNode,
  InternalNode,
  Address,
  Node as ProllyNode,
  serializeNode,
} from "./node.js";
import { Diff, ConflictResolver } from "./types.js";
import { compare } from "uint8arrays/compare";

export class ProllyTree {
  public readonly config: Configuration;
  private readonly nodeManager: NodeManager;

  constructor(
    public readonly rootHash: Address,
    blockManager: BlockManager,
    config?: Configuration
  ) {
    this.config = config ?? defaultConfiguration;
    this.nodeManager = new NodeManager(blockManager, this.config);
  }

  static async merge(
    local: ProllyTree,
    remote: ProllyTree,
    base: ProllyTree,
    resolver: ConflictResolver
  ): Promise<ProllyTree> {
    // This will be re-implemented
    throw new Error("Merge not implemented yet");
  }

  async get(key: Uint8Array): Promise<Uint8Array | undefined> {
    let node: ProllyNode = await this.nodeManager.getNode(this.rootHash);
    if (!node) {
      return undefined;
    }

    while (!isLeafNode(node)) {
      // Find the correct child to descend into
      const childIndex = node.keys.findIndex((k) => compare(key, k) < 0);

      if (childIndex === -1) {
        // key is greater than all keys, so descend into the rightmost child
        const childAddress = node.children[node.children.length - 1];
        node = await this.nodeManager.getNode(childAddress);
      } else {
        const childAddress = node.children[childIndex];
        node = await this.nodeManager.getNode(childAddress);
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
    const path = await this._findPath(key);
    const leafContainer = path.pop()!;
    const leafNode = leafContainer.node as LeafNode;

    const existingPairIndex = leafNode.pairs.findIndex(
      ([k]) => compare(key, k) === 0
    );

    let newPairs = [...leafNode.pairs];
    if (existingPairIndex !== -1) {
      if (compare(newPairs[existingPairIndex][1], value) === 0) {
        return this;
      }
      newPairs[existingPairIndex] = [key, value];
    } else {
      newPairs.push([key, value]);
      newPairs.sort(([a], [b]) => compare(a, b));
    }

    let changeToPropagate: {
      newAddress: Address;
      split?: { key: Uint8Array; address: Address };
    };
    let previousChangeOriginalAddress = leafContainer.address;

    const updatedLeaf: LeafNode = { ...leafNode, pairs: newPairs };

    let needsSplit = false;
    if (this.config.valueChunking.chunkingStrategy === "fastcdc-v2020") {
      needsSplit =
        serializeNode(updatedLeaf).length >
        this.config.valueChunking.maxChunkSize;
    }

    if (needsSplit) {
      const midpoint = Math.ceil(updatedLeaf.pairs.length / 2);
      const leftPairs = updatedLeaf.pairs.slice(0, midpoint);
      const rightPairs = updatedLeaf.pairs.slice(midpoint);
      const splitKey = rightPairs[0][0];

      const leftNode = this.nodeManager.createLeafNode(leftPairs);
      const rightNode = this.nodeManager.createLeafNode(rightPairs);

      const [leftAddress, rightAddress] = await Promise.all([
        this.nodeManager.putNode(leftNode),
        this.nodeManager.putNode(rightNode),
      ]);

      changeToPropagate = {
        newAddress: leftAddress,
        split: { key: splitKey, address: rightAddress },
      };
    } else {
      changeToPropagate = {
        newAddress: await this.nodeManager.putNode(updatedLeaf),
      };
    }

    while (path.length > 0) {
      const parentContainer = path.pop()!;
      const parentNode = parentContainer.node as InternalNode;

      const childIndex = parentNode.children.findIndex(
        (addr) => compare(addr, previousChangeOriginalAddress) === 0
      );

      if (childIndex === -1) {
        throw new Error(
          "Failed to find child address in parent during update propagation"
        );
      }

      previousChangeOriginalAddress = parentContainer.address;

      let newKeys = [...parentNode.keys];
      let newChildren = [...parentNode.children];

      if (changeToPropagate.split) {
        newChildren[childIndex] = changeToPropagate.newAddress;
        newKeys.splice(childIndex, 0, changeToPropagate.split.key);
        newChildren.splice(childIndex + 1, 0, changeToPropagate.split.address);
      } else {
        newChildren[childIndex] = changeToPropagate.newAddress;
      }

      const updatedParent: InternalNode = {
        ...parentNode,
        keys: newKeys,
        children: newChildren,
      };

      let parentNeedsSplit = false;
      if (this.config.valueChunking.chunkingStrategy === "fastcdc-v2020") {
        parentNeedsSplit =
          serializeNode(updatedParent).length >
          this.config.valueChunking.maxChunkSize;
      }

      if (parentNeedsSplit) {
        const midpoint = Math.ceil(updatedParent.children.length / 2);
        const parentSplitKey = updatedParent.keys[midpoint - 1];

        const leftKeys = updatedParent.keys.slice(0, midpoint - 1);
        const leftChildren = updatedParent.children.slice(0, midpoint);
        const leftNode = this.nodeManager.createInternalNode(
          leftKeys,
          leftChildren
        );

        const rightKeys = updatedParent.keys.slice(midpoint);
        const rightChildren = updatedParent.children.slice(midpoint);
        const rightNode = this.nodeManager.createInternalNode(
          rightKeys,
          rightChildren
        );

        const [leftAddress, rightAddress] = await Promise.all([
          this.nodeManager.putNode(leftNode),
          this.nodeManager.putNode(rightNode),
        ]);

        changeToPropagate = {
          newAddress: leftAddress,
          split: { key: parentSplitKey, address: rightAddress },
        };
      } else {
        changeToPropagate = {
          newAddress: await this.nodeManager.putNode(updatedParent),
        };
      }
    }

    if (changeToPropagate.split) {
      const newRoot = this.nodeManager.createInternalNode(
        [changeToPropagate.split.key],
        [changeToPropagate.newAddress, changeToPropagate.split.address]
      );
      const newRootAddress = await this.nodeManager.putNode(newRoot);
      return new ProllyTree(
        newRootAddress,
        this.nodeManager.blockManager,
        this.config
      );
    } else {
      return new ProllyTree(
        changeToPropagate.newAddress,
        this.nodeManager.blockManager,
        this.config
      );
    }
  }

  async delete(key: Uint8Array): Promise<ProllyTree> {
    // This will be re-implemented
    throw new Error("Delete not implemented yet");
  }

  async diff(other: ProllyTree): Promise<Diff[]> {
    // This will be re-implemented
    throw new Error("Diff not implemented yet");
  }

  private async _findPath(
    key: Uint8Array
  ): Promise<{ address: Address; node: ProllyNode }[]> {
    const path: { address: Address; node: ProllyNode }[] = [];
    let currentAddress = this.rootHash;

    while (true) {
      const node = await this.nodeManager.getNode(currentAddress);
      path.push({ address: currentAddress, node: node });

      if (isLeafNode(node)) {
        return path;
      }

      const childIndex = node.keys.findIndex((k) => compare(key, k) < 0);

      if (childIndex === -1) {
        currentAddress = node.children[node.children.length - 1];
      } else {
        currentAddress = node.children[childIndex];
      }
    }
  }
}
