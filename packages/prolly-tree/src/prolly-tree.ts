import { BlockManager } from "./block-store.js";
import { Configuration, defaultConfiguration } from "./configuration.js";
import { NodeManager } from "./node-manager.js";
import { isLeafNode, Node as ProllyNode, Address } from "./node.js";
import { Diff, ConflictResolver } from "./types.js";
import { compare } from "uint8arrays/compare";

type Change = {
  newAddress: Address;
  split?: {
    key: Uint8Array;
    address: Address;
  };
};

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

  static async create(
    blockManager: BlockManager,
    config?: Configuration
  ): Promise<ProllyTree> {
    const conf = config ?? defaultConfiguration;
    const nodeManager = new NodeManager(blockManager, conf);
    const emptyRoot = await nodeManager.createLeafNode([]);
    if (!emptyRoot.address) {
      throw new Error("Initial root must have an address");
    }
    return new ProllyTree(emptyRoot.address, blockManager, conf);
  }

  async get(key: Uint8Array): Promise<Uint8Array | undefined> {
    let node: ProllyNode | undefined = await this.nodeManager.getNode(
      this.rootHash
    );
    if (!node) {
      return undefined;
    }

    while (!isLeafNode(node)) {
      let childIndex = node.keys.findIndex((k) => compare(key, k) < 0);
      if (childIndex === -1) {
        childIndex = node.keys.length;
      }
      const address = node.children[childIndex];

      node = await this.nodeManager.getNode(address);
      if (!node) {
        throw new Error("Failed to traverse tree: node not found");
      }
    }

    const pair = node.pairs.find(([k]) => compare(key, k) === 0);
    return pair ? pair[1] : undefined;
  }

  async put(key: Uint8Array, value: Uint8Array): Promise<ProllyTree> {
    const path = await this._findPath(key);
    const leafNode = path[path.length - 1];

    if (!isLeafNode(leafNode)) {
      throw new Error("Path finding did not end in a leaf node");
    }

    console.log(`--- PUT key: ${new TextDecoder().decode(key)} ---`);

    const initialChange = await this.nodeManager._put(leafNode, key, value);

    console.log(`Initial change (from leaf):`, {
      newAddress: initialChange.newAddress.toString(),
      split: initialChange.split
        ? {
            key: new TextDecoder().decode(initialChange.split.key),
            address: initialChange.split.address.toString(),
          }
        : undefined,
    });

    if (
      this.nodeManager.compare(leafNode.address!, initialChange.newAddress) ===
      0
    ) {
      return this;
    }

    let changeForNextLevel: Change | undefined = initialChange;
    for (let i = path.length - 2; i >= 0; i--) {
      const parentNode = path[i];
      const childNode = path[i + 1];

      console.log(
        `Level Up. Parent node isLeaf: ${parentNode.isLeaf}, has ${
          isLeafNode(parentNode)
            ? parentNode.pairs.length
            : parentNode.children.length
        } children.`
      );

      if (!childNode.address) {
        throw new Error("Child node in path must have an address");
      }

      const { newAddress, split } = await this.nodeManager.updateChild(
        parentNode,
        childNode.address,
        changeForNextLevel.newAddress,
        changeForNextLevel.split
      );

      const updatedParent = (await this.nodeManager.getNode(newAddress))!;
      console.log(
        `Updated parent isLeaf: ${updatedParent.isLeaf}, has ${
          isLeafNode(updatedParent)
            ? updatedParent.pairs.length
            : updatedParent.children.length
        } children.`
      );

      if (this.nodeManager.isNodeFull(updatedParent)) {
        console.log(`--> Parent requires splitting.`);
        const splitResult = await this.nodeManager.splitNode(updatedParent);
        changeForNextLevel = {
          newAddress: splitResult.newAddress,
          split: splitResult.split,
        };
      } else {
        changeForNextLevel = { newAddress, split: undefined };
      }
    }

    let newRootAddress: Address;
    if (changeForNextLevel.split) {
      console.log("--- Root Split ---");
      const newRoot = await this.nodeManager.createNode(
        [],
        [changeForNextLevel.split.key],
        [changeForNextLevel.newAddress, changeForNextLevel.split.address],
        false
      );
      newRootAddress = newRoot.address!;
    } else {
      newRootAddress = changeForNextLevel.newAddress;
    }

    return new ProllyTree(
      newRootAddress,
      this.nodeManager.blockManager,
      this.config
    );
  }

  private async _findPath(key: Uint8Array): Promise<ProllyNode[]> {
    const path: ProllyNode[] = [];
    let currentAddress = this.rootHash;

    while (true) {
      const node = await this.nodeManager.getNode(currentAddress);
      if (!node) {
        throw new Error(`Could not find node at address ${currentAddress}`);
      }
      path.push(node);

      if (isLeafNode(node)) {
        return path;
      }

      let childIndex = node.keys.findIndex((k) => compare(key, k) < 0);
      if (childIndex === -1) {
        childIndex = node.keys.length;
      }
      currentAddress = node.children[childIndex];
    }
  }
}
