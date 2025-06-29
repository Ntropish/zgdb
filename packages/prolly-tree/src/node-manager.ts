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
    // Deconstruct the parent into simple arrays of keys and addresses.
    const keys: Uint8Array[] = [];
    for (let i = 0; i < parent.keysLength; i++) {
      keys.push(parent.getKey(i)!);
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
      key: i < keys.length ? keys[i] : new Uint8Array(),
      address,
    }));

    const { address: newAddress, node: newNode } =
      await this.createInternalNode(newBranches);

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
    if (node.isLeaf()) {
      const pairs = node.getAllPairs();
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
        // The key for the *rightmost* pointer is not stored, it's implicit.
        // So we have N addresses but N-1 keys.
        const key =
          i < internalNode.keysLength
            ? internalNode.getKey(i)!
            : new Uint8Array();
        allBranches.push({ key, address });
      }

      const mid = Math.ceil(allBranches.length / 2);
      const leftBranches = allBranches.slice(0, mid);
      const rightBranches = allBranches.slice(mid);

      // The split key is the first key of the new right-hand node.
      // We need to fetch this from the actual child node.
      const firstRightChildNode = await this.getNode(rightBranches[0].address);
      const splitKey = (await firstRightChildNode?.getFirstKey())!;

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
    const pairs = node.getAllPairs();
    const { found, index } = node.findKeyIndex(key);

    if (found) {
      // Key exists. If value is the same, do nothing.
      if (this.config.comparator(pairs[index].value, value) === 0) {
        const address = await this.blockManager.hashFn(node.bytes);
        return { newAddress: address };
      }
      // Value is different, update it.
      pairs[index] = { key, value };
    } else {
      // Key does not exist, insert it.
      pairs.splice(index, 0, { key, value });
    }

    const { address: newAddress, node: newNode } = await this.createLeafNode(
      pairs
    );

    if (this.isNodeFull(newNode)) {
      return this.splitNode(newNode);
    }

    return { newAddress };
  }
}
