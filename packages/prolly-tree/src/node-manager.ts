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
  isLeafNodeProxy,
} from "./node-proxy.js";

export class NodeManager {
  constructor(
    public readonly blockManager: BlockManager,
    public readonly config: Configuration
  ) {}

  async getNode(
    address: Address
  ): Promise<LeafNodeProxy | InternalNodeProxy | undefined> {
    const bytes = await this.blockManager.get(address);
    if (!bytes) {
      return undefined;
    }
    return createNodeProxy(bytes, this);
  }

  getNodeSync(address: Address): LeafNodeProxy | InternalNodeProxy | undefined {
    const bytes = this.blockManager.getSync(address);
    if (!bytes) {
      return undefined;
    }
    return createNodeProxy(bytes, this);
  }

  isNodeFull(node: NodeProxy): boolean {
    const fanout = this.config.treeDefinition.targetFanout;
    if (node.isLeaf()) {
      return node.keysLength >= fanout;
    }
    // It's an InternalNodeProxy
    const internalNode = node as InternalNodeProxy;
    return internalNode.addressesLength >= fanout;
  }

  async createLeafNode(
    pairs: KeyValuePair[]
  ): Promise<{ address: Address; node: LeafNodeProxy }> {
    pairs.sort((a, b) => this.config.comparator(a.key, b.key));

    const level = 0; // Leaf nodes are at level 0
    const bytes = createLeafNodeBuffer(pairs, level);
    const address = await this.blockManager.put(bytes);
    const node = new LeafNodeProxy(bytes, this);
    return { address, node };
  }

  async createInternalNode(
    branches: BranchPair[]
  ): Promise<{ address: Address; node: InternalNodeProxy }> {
    let totalSubtreeEntries = 0;
    let level = -1;

    for (const branch of branches) {
      const child = await this.getNode(branch.address);
      if (child) {
        totalSubtreeEntries += child.entryCount;
        if (level === -1) {
          level = child.level + 1;
        }
      }
    }
    if (level === -1) {
      level = 1; // Default to 1 if no children
    }

    const bytes = createInternalNodeBuffer(
      branches,
      totalSubtreeEntries,
      level
    );
    const address = await this.blockManager.put(bytes);
    const node = new InternalNodeProxy(bytes, this);
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
    const originalAddress = await this.blockManager.hashFn(parent.bytes);

    // Deconstruct the parent into simple arrays of keys and addresses.
    const keys: (Uint8Array | null)[] = [];
    for (let i = 0; i < parent.keysLength; i++) {
      keys.push(parent.getKey(i));
    }
    const addresses: Address[] = [];
    for (let i = 0; i < parent.addressesLength; i++) {
      addresses.push(parent.getAddress(i)!);
    }

    // Find the index of the child address to update.
    const childIndex = addresses.findIndex(
      (addr) => this.config.comparator(addr, oldChildAddress) === 0
    );
    if (childIndex === -1) {
      throw new Error("Could not find child address in parent");
    }

    // Reconstruct the new keys and addresses arrays based on the update.
    if (split) {
      // A split occurred. The old pointer is replaced by two new ones, and a new separator key is inserted.
      addresses.splice(childIndex, 1, newChildAddress, split.address);
      keys.splice(childIndex, 0, split.key);
    } else {
      // No split, just a simple update of the child's address.
      addresses[childIndex] = newChildAddress;
    }

    // Re-serialize the new parent node from the updated keys and addresses.
    const newBranches: BranchPair[] = addresses.map((address, i) => ({
      // there is one more address than key
      key: (i < keys.length ? keys[i] : new Uint8Array())!,
      address,
    }));

    let totalSubtreeEntries = 0;
    for (const branch of newBranches) {
      const child = await this.getNode(branch.address);
      if (child) {
        totalSubtreeEntries += child.entryCount;
      }
    }

    const newBytes = createInternalNodeBuffer(
      newBranches,
      totalSubtreeEntries,
      parent.level
    );
    const newAddress = await this.blockManager.hashFn(newBytes);

    if (this.config.comparator(originalAddress, newAddress) === 0) {
      return { newAddress: originalAddress };
    }

    await this.blockManager.put(newBytes);
    const newNode = new InternalNodeProxy(newBytes, this);

    // Check if the new parent also needs to be split and propagate if necessary.
    if (this.isNodeFull(newNode)) {
      return this.splitNode(newNode);
    }

    return { newAddress };
  }

  async splitNode(node: NodeProxy): Promise<{
    newAddress: Address;
    split: { key: Uint8Array; address: Address };
  }> {
    if (isLeafNodeProxy(node)) {
      const pairs: KeyValuePair[] = [];
      for (let i = 0; i < node.keysLength; i++) {
        pairs.push(node.getPair(i));
      }
      const mid = Math.ceil(pairs.length / 2);
      const leftPairs = pairs.slice(0, mid);
      const rightPairs = pairs.slice(mid);

      const splitKey = rightPairs[0].key;

      const { address: leftAddress } = await this.createLeafNode(leftPairs);
      const { address: rightAddress } = await this.createLeafNode(rightPairs);

      return {
        newAddress: leftAddress,
        split: { key: splitKey, address: rightAddress },
      };
    } else {
      const internalNode = node as InternalNodeProxy;
      const allBranches: BranchPair[] = [];
      for (let i = 0; i < internalNode.addressesLength; i++) {
        const address = internalNode.getAddress(i)!;
        const key =
          i < internalNode.keysLength
            ? internalNode.getKey(i)!
            : new Uint8Array();
        allBranches.push({ key, address });
      }

      const mid = Math.ceil(allBranches.length / 2);
      const leftBranches = allBranches.slice(0, mid);
      const rightBranches = allBranches.slice(mid);

      const splitKey = leftBranches[leftBranches.length - 1].key;
      leftBranches[leftBranches.length - 1].key = new Uint8Array();

      const { address: leftAddress } = await this.createInternalNode(
        leftBranches
      );
      const { address: rightAddress } = await this.createInternalNode(
        rightBranches
      );

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
    const pairs: KeyValuePair[] = [];
    for (let i = 0; i < node.keysLength; i++) {
      pairs.push(node.getPair(i));
    }
    const { found, index } = node.findKeyIndex(key);

    const originalAddress = await this.blockManager.hashFn(node.bytes);

    if (found) {
      if (this.config.comparator(pairs[index].value, value) === 0) {
        return { newAddress: originalAddress };
      }
      pairs[index] = { key, value };
    } else {
      pairs.splice(index, 0, { key, value });
    }

    const newBytes = createLeafNodeBuffer(pairs, node.level);
    const newAddress = await this.blockManager.hashFn(newBytes);

    if (this.config.comparator(originalAddress, newAddress) === 0) {
      return { newAddress: originalAddress };
    }

    await this.blockManager.put(newBytes);
    const newNode = new LeafNodeProxy(newBytes, this);

    if (this.isNodeFull(newNode)) {
      return this.splitNode(newNode);
    }

    return { newAddress };
  }
}
