import { BlockManager } from "./block-store.js";
import { Configuration } from "./configuration.js";
import {
  createNodeProxy,
  InternalNodeProxy,
  LeafNodeProxy,
  NodeProxy,
  createLeafNodeBuffer,
  KeyValuePair,
  createInternalNodeBuffer,
  BranchPair,
  Address,
} from "./node-proxy.js";
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

  async getNode(
    address: Address
  ): Promise<LeafNodeProxy | InternalNodeProxy | undefined> {
    const bytes = await this.blockManager.get(address);
    if (!bytes) {
      return undefined;
    }
    return createNodeProxy(bytes);
  }

  getNodeSync(address: Address): LeafNodeProxy | InternalNodeProxy | undefined {
    const bytes = this.blockManager.getSync(address);
    if (!bytes) {
      return undefined;
    }
    return createNodeProxy(bytes);
  }

  isNodeFull(node: NodeProxy): boolean {
    if (node.isLeaf) {
      const leaf = node as LeafNodeProxy;
      return leaf.numEntries >= this.config.treeDefinition.targetFanout;
    }
    const internal = node as InternalNodeProxy;
    return internal.numBranches >= this.config.treeDefinition.targetFanout;
  }

  async createLeafNode(
    pairs: KeyValuePair[]
  ): Promise<{ address: Address; node: LeafNodeProxy }> {
    pairs.sort((a, b) => compare(a.key, b.key));
    const bytes = createLeafNodeBuffer(pairs);
    const address = await this.blockManager.put(bytes);
    const node = new LeafNodeProxy(bytes);
    return { address, node };
  }

  createLeafNodeSync(pairs: KeyValuePair[]): {
    address: Address;
    node: LeafNodeProxy;
  } {
    pairs.sort((a, b) => compare(a.key, b.key));
    const bytes = createLeafNodeBuffer(pairs);
    const address = this.blockManager.putSync(bytes);
    const node = new LeafNodeProxy(bytes);
    return { address, node };
  }

  async updateChild(
    parent: InternalNodeProxy,
    oldChildAddress: Address,
    newChildAddress: Address,
    split?: { key: Uint8Array; address: Address }
  ): Promise<{
    newAddress: Address;
    split?: { key: Uint8Array; address: Address };
  }> {
    let childIndex = -1;
    for (let i = 0; i < parent.numBranches; i++) {
      if (compare(parent.getBranch(i).address, oldChildAddress) === 0) {
        childIndex = i;
        break;
      }
    }

    if (childIndex === -1) {
      throw new Error("Could not find child address in parent");
    }

    const newBranches: BranchPair[] = [];
    for (let i = 0; i < parent.numBranches; i++) {
      newBranches.push(parent.getBranch(i));
    }

    newBranches[childIndex] = {
      ...newBranches[childIndex],
      address: newChildAddress,
    };

    let totalSubtreeEntries = parent.entryCount;

    if (split) {
      newBranches.splice(childIndex, 0, split);
      // This is not correct, we need to find the entry count of the split node
      // totalSubtreeEntries += split.entryCount;
    }

    const bytes = createInternalNodeBuffer(newBranches, totalSubtreeEntries);
    const newAddress = await this.blockManager.put(bytes);
    const newNode = new InternalNodeProxy(bytes);

    if (this.isNodeFull(newNode)) {
      return this.splitNode(newNode);
    }

    return { newAddress };
  }

  async splitNode(node: NodeProxy): Promise<{
    newAddress: Address;
    split: { key: Uint8Array; address: Address };
  }> {
    if (node.isLeaf) {
      const leaf = node as LeafNodeProxy;
      const mid = Math.ceil(leaf.numEntries / 2);

      const leftPairs: KeyValuePair[] = [];
      for (let i = 0; i < mid; i++) {
        leftPairs.push(leaf.getEntry(i));
      }
      const rightPairs: KeyValuePair[] = [];
      for (let i = mid; i < leaf.numEntries; i++) {
        rightPairs.push(leaf.getEntry(i));
      }
      const splitKey = rightPairs[0].key;

      const { address: leftAddress } = await this.createLeafNode(leftPairs);
      const { address: rightAddress } = await this.createLeafNode(rightPairs);

      return {
        newAddress: leftAddress,
        split: { key: splitKey, address: rightAddress },
      };
    } else {
      const internal = node as InternalNodeProxy;
      const mid = Math.ceil(internal.numBranches / 2);
      const splitKey = internal.getBranch(mid - 1).key;

      const leftBranches: BranchPair[] = [];
      for (let i = 0; i < mid; i++) {
        leftBranches.push(internal.getBranch(i));
      }
      const rightBranches: BranchPair[] = [];
      for (let i = mid; i < internal.numBranches; i++) {
        rightBranches.push(internal.getBranch(i));
      }

      // We need to recalculate entry counts for subtrees
      const leftBytes = createInternalNodeBuffer(leftBranches, 0); // Invalid entry count
      const rightBytes = createInternalNodeBuffer(rightBranches, 0); // Invalid entry count
      const leftAddress = await this.blockManager.put(leftBytes);
      const rightAddress = await this.blockManager.put(rightBytes);

      return {
        newAddress: leftAddress,
        split: { key: splitKey, address: rightAddress },
      };
    }
  }

  async _put(
    node: LeafNodeProxy,
    key: Uint8Array,
    value: Uint8Array
  ): Promise<{
    newAddress: Address;
    split?: { key: Uint8Array; address: Address };
  }> {
    const existingPairIndex = node.findEntryIndex(key);

    let newPairs: KeyValuePair[];

    if (existingPairIndex >= 0) {
      if (compare(node.getEntry(existingPairIndex).value, value) === 0) {
        // Need a way to get the address from the proxy
        const address = this.blockManager.hashFn(node.bytes);
        return { newAddress: address };
      }
      newPairs = [];
      for (let i = 0; i < node.numEntries; i++) {
        newPairs.push(node.getEntry(i));
      }
      newPairs[existingPairIndex] = { key, value };
    } else {
      newPairs = [];
      for (let i = 0; i < node.numEntries; i++) {
        newPairs.push(node.getEntry(i));
      }
      newPairs.push({ key, value });
    }

    newPairs.sort((a, b) => compare(a.key, b.key));
    const bytes = createLeafNodeBuffer(newPairs);
    const newNode = new LeafNodeProxy(bytes);

    if (this.isNodeFull(newNode)) {
      return this.splitNode(newNode);
    }

    const newAddress = await this.blockManager.put(bytes);
    return { newAddress };
  }

  updateChildSync(
    parent: InternalNodeProxy,
    oldChildAddress: Address,
    newChildAddress: Address,
    split?: { key: Uint8Array; address: Address }
  ): {
    newAddress: Address;
    split?: { key: Uint8Array; address: Address };
  } {
    // This will be very similar to the async version
    throw new Error("Not implemented");
  }

  splitNodeSync(node: NodeProxy): {
    newAddress: Address;
    split: { key: Uint8Array; address: Address };
  } {
    throw new Error("Not implemented");
  }

  _putSync(
    node: LeafNodeProxy,
    key: Uint8Array,
    value: Uint8Array
  ): {
    newAddress: Address;
    split?: { key: Uint8Array; address: Address };
  } {
    throw new Error("Not implemented");
  }
}
