import { BlockManager } from "./block-store.js";
import { Configuration } from "./configuration.js";
import { Address, Node, KeyValuePair } from "./node.js";
import { compare } from "uint8arrays/compare";

export class NodeManager {
  constructor(
    public readonly blockManager: BlockManager,
    public readonly config: Configuration
  ) {}

  compare(a: Address, b: Address): number {
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        return a[i] - b[i];
      }
    }
    return 0;
  }

  async getNode(address: Address): Promise<Node | undefined> {
    const node = await this.blockManager.getNode(address);
    if (!node) {
      return undefined;
    }
    node.address = address;
    return node;
  }

  isNodeFull(node: Node): boolean {
    if (node.isLeaf) {
      return node.pairs.length >= this.config.treeDefinition.targetFanout;
    }
    return node.keys.length >= this.config.treeDefinition.targetFanout;
  }

  async createNode(
    pairs: KeyValuePair[],
    keys: Uint8Array[],
    children: Address[],
    isLeaf: boolean
  ): Promise<Node> {
    const node: Node = isLeaf
      ? { isLeaf: true, pairs }
      : { isLeaf: false, keys, children };

    const address = await this.blockManager.putNode(node);

    // This is a bit of a hack, but we need the address in the node for some logic
    // but the address is derived from the node content.
    // A better solution would be to not require the address in the node itself.
    const finalNode = { ...node, address };
    return finalNode;
  }

  async createLeafNode(pairs: KeyValuePair[]): Promise<Node> {
    pairs.sort(([a], [b]) => compare(a, b));
    return this.createNode(pairs, [], [], true);
  }

  async updateChild(
    parent: Node,
    oldChildAddress: Address,
    newChildAddress: Address,
    split?: { key: Uint8Array; address: Address }
  ): Promise<{
    newAddress: Address;
    split?: { key: Uint8Array; address: Address };
  }> {
    if (parent.isLeaf) {
      throw new Error("updateChild should not be called on a leaf node");
    }

    const childIndex = parent.children.findIndex(
      (childAddress: Address) =>
        this.compare(childAddress, oldChildAddress) === 0
    );

    if (childIndex === -1) {
      throw new Error("Could not find child address in parent");
    }

    const newChildren = [...parent.children];
    newChildren[childIndex] = newChildAddress;

    let newKeys = [...parent.keys];

    if (split) {
      // The new key is the separator between the updated child and the new split-off child.
      newKeys.splice(childIndex, 0, split.key);
      newChildren.splice(childIndex + 1, 0, split.address);
    }

    const newNode = { ...parent, keys: newKeys, children: newChildren };
    const newAddress = await this.blockManager.putNode(newNode);

    if (this.isNodeFull(newNode)) {
      return this.splitNode(newNode);
    }

    return { newAddress };
  }

  async splitNode(node: Node): Promise<{
    newAddress: Address;
    split: { key: Uint8Array; address: Address };
  }> {
    if (node.isLeaf) {
      const mid = Math.ceil(node.pairs.length / 2);
      const leftPairs = node.pairs.slice(0, mid);
      const rightPairs = node.pairs.slice(mid);
      const splitKey = rightPairs[0][0];

      const leftNode = await this.createLeafNode(leftPairs);
      const rightNode = await this.createLeafNode(rightPairs);

      if (!leftNode.address || !rightNode.address) {
        throw new Error("Newly created nodes must have an address");
      }

      return {
        newAddress: leftNode.address, // address of the new left node
        split: { key: splitKey, address: rightNode.address },
      };
    } else {
      const mid = Math.ceil(node.children.length / 2);
      const splitKey = node.keys[mid - 1];

      const leftKeys = node.keys.slice(0, mid - 1);
      const rightKeys = node.keys.slice(mid);

      const leftChildren = node.children.slice(0, mid);
      const rightChildren = node.children.slice(mid);

      const leftNode = await this.createNode([], leftKeys, leftChildren, false);
      const rightNode = await this.createNode(
        [],
        rightKeys,
        rightChildren,
        false
      );

      if (!leftNode.address || !rightNode.address) {
        throw new Error("Newly created nodes must have an address");
      }

      return {
        newAddress: leftNode.address, // address of the new left node
        split: { key: splitKey, address: rightNode.address },
      };
    }
  }

  async _put(
    node: Node,
    key: Uint8Array,
    value: Uint8Array
  ): Promise<{
    newAddress: Address;
    split?: { key: Uint8Array; address: Address };
  }> {
    if (!node.isLeaf) {
      throw new Error("_put can only be called on leaf nodes");
    }

    const existingPairIndex = node.pairs.findIndex(
      ([k]: KeyValuePair) => compare(k, key) === 0
    );

    let newPairs: KeyValuePair[];

    if (existingPairIndex !== -1) {
      if (compare(node.pairs[existingPairIndex][1], value) === 0) {
        if (!node.address) {
          throw new Error("Node address is missing");
        }
        return { newAddress: node.address };
      }
      newPairs = [...node.pairs];
      newPairs[existingPairIndex] = [key, value];
    } else {
      newPairs = [...node.pairs, [key, value]];
    }

    newPairs.sort(([a], [b]) => compare(a, b));
    const newNode = { ...node, pairs: newPairs };

    if (this.isNodeFull(newNode)) {
      return this.splitNode(newNode);
    }

    const newAddress = await this.blockManager.putNode(newNode);
    return { newAddress };
  }
}
