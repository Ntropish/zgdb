import { BlockManager } from "./block-store.js";
import { Configuration, defaultConfiguration } from "./configuration.js";
import { NodeManager } from "./node-manager.js";
import {
  isLeafNodeProxy,
  LeafNodeProxy,
  NodeProxy,
  InternalNodeProxy,
  Address,
} from "./node-proxy.js";
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
  private constructor(
    public readonly rootNode: NodeProxy,
    private readonly blockManager: BlockManager,
    private readonly nodeManager: NodeManager
  ) {}

  public static async create(blockManager: BlockManager): Promise<ProllyTree> {
    const nodeManager = new NodeManager(blockManager, blockManager.config);
    const { node: rootNode } = await nodeManager.createLeafNode([]);
    return new ProllyTree(rootNode, blockManager, nodeManager);
  }

  public static createSync(blockManager: BlockManager): ProllyTree {
    const nodeManager = new NodeManager(blockManager, blockManager.config);
    const { node: rootNode } = nodeManager.createLeafNodeSync([]);
    return new ProllyTree(rootNode, blockManager, nodeManager);
  }

  public static async load(
    rootAddress: Address,
    blockManager: BlockManager
  ): Promise<ProllyTree> {
    const nodeManager = new NodeManager(blockManager, blockManager.config);
    const rootNode = await nodeManager.getNode(rootAddress);
    if (!rootNode) {
      throw new Error(`Could not find root node at address: ${rootAddress}`);
    }
    return new ProllyTree(rootNode, blockManager, nodeManager);
  }

  public get root(): Address {
    return this.blockManager.hashFn(this.rootNode.bytes);
  }

  private async findPathToLeaf(key: Uint8Array): Promise<NodeProxy[]> {
    const path: NodeProxy[] = [this.rootNode];
    let current = this.rootNode;

    while (!isLeafNodeProxy(current)) {
      const internalNode = current as InternalNodeProxy;
      const childIndex = internalNode.findChildIndex(key);
      const nextAddress = internalNode.getBranch(childIndex).address;

      const nextNode = await this.nodeManager.getNode(nextAddress);
      if (!nextNode)
        throw new Error(`Failed to find node at address: ${nextAddress}`);
      current = nextNode;
      path.push(current);
    }
    return path;
  }

  private findPathToLeafSync(key: Uint8Array): NodeProxy[] {
    const path: NodeProxy[] = [this.rootNode];
    let current = this.rootNode;

    while (!isLeafNodeProxy(current)) {
      const internalNode = current as InternalNodeProxy;
      const childIndex = internalNode.findChildIndex(key);
      const nextAddress = internalNode.getBranch(childIndex).address;

      const nextNode = this.nodeManager.getNodeSync(nextAddress);
      if (!nextNode)
        throw new Error(`Failed to find node at address: ${nextAddress}`);
      current = nextNode;
      path.push(current);
    }
    return path;
  }

  public async get(key: Uint8Array): Promise<Uint8Array | undefined> {
    const path = await this.findPathToLeaf(key);
    const leaf = path[path.length - 1] as LeafNodeProxy;
    const entryIndex = leaf.findEntryIndex(key);
    if (entryIndex < 0) {
      return undefined;
    }
    return leaf.getEntry(entryIndex).value;
  }

  public getSync(key: Uint8Array): Uint8Array | undefined {
    const path = this.findPathToLeafSync(key);
    const leaf = path[path.length - 1] as LeafNodeProxy;
    const entryIndex = leaf.findEntryIndex(key);
    if (entryIndex < 0) {
      return undefined;
    }
    return leaf.getEntry(entryIndex).value;
  }

  public async *scan(
    startKey: Uint8Array,
    endKey?: Uint8Array
  ): AsyncGenerator<[Uint8Array, Uint8Array]> {
    const path = await this.findPathToLeaf(startKey);
    let currentLeaf = path[path.length - 1] as LeafNodeProxy;

    let pairIndex = 0;
    if (currentLeaf.numEntries > 0) {
      pairIndex = currentLeaf.findEntryIndex(startKey);
      if (pairIndex < 0) {
        pairIndex = ~pairIndex; // bitwise NOT to get insertion point
      }
    }

    while (currentLeaf) {
      for (let i = pairIndex; i < currentLeaf.numEntries; i++) {
        const { key, value } = currentLeaf.getEntry(i);
        if (endKey && compare(key, endKey) > 0) {
          return;
        }
        yield [key, value];
      }

      pairIndex = 0;
      let foundNextLeaf = false;

      while (path.length > 1) {
        const childNode = path.pop()!;
        const parent = path[path.length - 1];
        if (parent.isLeaf) {
          // Should not happen, root is leaf and we are done
          break;
        }
        const internalParent = parent as InternalNodeProxy;

        const childAddress = this.blockManager.hashFn(childNode.bytes);
        let childIndex = -1;
        for (let i = 0; i < internalParent.numBranches; i++) {
          if (
            compare(internalParent.getBranch(i).address, childAddress) === 0
          ) {
            childIndex = i;
            break;
          }
        }

        if (childIndex !== -1 && childIndex < internalParent.numBranches - 1) {
          let nextNodeAddress = internalParent.getBranch(
            childIndex + 1
          ).address;
          let nextNode = await this.nodeManager.getNode(nextNodeAddress);
          if (!nextNode)
            throw new Error(`Could not find node at ${nextNodeAddress}`);
          path.push(nextNode);

          while (!isLeafNodeProxy(nextNode)) {
            const internal = nextNode as InternalNodeProxy;
            if (internal.numBranches === 0) break;
            nextNode = await this.nodeManager.getNode(
              internal.getBranch(0).address
            );
            if (!nextNode) throw new Error("Failed to traverse down to leaf");
            path.push(nextNode);
          }

          if (nextNode.isLeaf) {
            currentLeaf = nextNode as LeafNodeProxy;
            foundNextLeaf = true;
            break;
          }
        }
      }

      if (!foundNextLeaf) {
        break;
      }
    }
  }

  public *scanSync(
    startKey: Uint8Array,
    endKey?: Uint8Array
  ): Generator<[Uint8Array, Uint8Array]> {
    const path = this.findPathToLeafSync(startKey);
    let currentLeaf = path[path.length - 1] as LeafNodeProxy;

    let pairIndex = 0;
    if (currentLeaf.numEntries > 0) {
      pairIndex = currentLeaf.findEntryIndex(startKey);
      if (pairIndex < 0) {
        pairIndex = ~pairIndex; // bitwise NOT to get insertion point
      }
    }

    while (currentLeaf) {
      for (let i = pairIndex; i < currentLeaf.numEntries; i++) {
        const { key, value } = currentLeaf.getEntry(i);
        if (endKey && compare(key, endKey) > 0) {
          return;
        }
        yield [key, value];
      }

      pairIndex = 0;
      let foundNextLeaf = false;

      while (path.length > 1) {
        const childNode = path.pop()!;
        const parent = path[path.length - 1];
        if (parent.isLeaf) {
          // Should not happen, root is leaf and we are done
          break;
        }
        const internalParent = parent as InternalNodeProxy;

        const childAddress = this.blockManager.hashFn(childNode.bytes);
        let childIndex = -1;
        for (let i = 0; i < internalParent.numBranches; i++) {
          if (
            compare(internalParent.getBranch(i).address, childAddress) === 0
          ) {
            childIndex = i;
            break;
          }
        }

        if (childIndex !== -1 && childIndex < internalParent.numBranches - 1) {
          let nextNodeAddress = internalParent.getBranch(
            childIndex + 1
          ).address;
          let nextNode = this.nodeManager.getNodeSync(nextNodeAddress);
          if (!nextNode)
            throw new Error(`Could not find node at ${nextNodeAddress}`);
          path.push(nextNode);

          while (!isLeafNodeProxy(nextNode)) {
            const internal = nextNode as InternalNodeProxy;
            if (internal.numBranches === 0) break;
            nextNode = this.nodeManager.getNodeSync(
              internal.getBranch(0).address
            );
            if (!nextNode) throw new Error("Failed to traverse down to leaf");
            path.push(nextNode);
          }

          if (nextNode.isLeaf) {
            currentLeaf = nextNode as LeafNodeProxy;
            foundNextLeaf = true;
            break;
          }
        }
      }

      if (!foundNextLeaf) {
        break;
      }
    }
  }

  public async put(
    key: Uint8Array,
    value: Uint8Array
  ): Promise<{ tree: ProllyTree; changed: boolean }> {
    const path = await this.findPathToLeaf(key);
    const leaf = path[path.length - 1] as LeafNodeProxy;

    const entryIndex = leaf.findEntryIndex(key);
    if (entryIndex >= 0) {
      const existingValue = leaf.getEntry(entryIndex).value;
      if (compare(existingValue, value) === 0) {
        return { tree: this, changed: false };
      }
    }

    let { newAddress: currentAddress, split } = await this.nodeManager._put(
      leaf,
      key,
      value
    );

    for (let i = path.length - 2; i >= 0; i--) {
      const parent = path[i] as InternalNodeProxy;
      const oldChildAddress = this.blockManager.hashFn(path[i + 1].bytes);
      const result = await this.nodeManager.updateChild(
        parent,
        oldChildAddress,
        currentAddress,
        split
      );
      currentAddress = result.newAddress;
      split = result.split;
    }

    let newRootNode;
    if (split) {
      const branches = [
        { key: split.key, address: currentAddress },
        { address: split.address, key: new Uint8Array() }, // This is incorrect, need to define how to create root
      ];
      // This is not how we create a root node.
      // const newRoot = await this.nodeManager.createNode(
      //   [],
      //   [split.key],
      //   [currentAddress, split.address],
      //   false
      // );
      // newRootAddress = newRoot.address!;
      newRootNode = await this.nodeManager.getNode(currentAddress); // Placeholder
    } else {
      newRootNode = await this.nodeManager.getNode(currentAddress);
    }
    if (!newRootNode) {
      throw new Error("Could not find new root node");
    }

    const newTree = new ProllyTree(
      newRootNode,
      this.blockManager,
      this.nodeManager
    );
    return { tree: newTree, changed: true };
  }

  public putSync(
    key: Uint8Array,
    value: Uint8Array
  ): { tree: ProllyTree; changed: boolean } {
    const path = this.findPathToLeafSync(key);
    const leaf = path[path.length - 1] as LeafNodeProxy;

    const entryIndex = leaf.findEntryIndex(key);
    if (entryIndex >= 0) {
      const existingValue = leaf.getEntry(entryIndex).value;
      if (compare(existingValue, value) === 0) {
        return { tree: this, changed: false };
      }
    }

    let { newAddress: currentAddress, split } = this.nodeManager._putSync(
      leaf,
      key,
      value
    );

    for (let i = path.length - 2; i >= 0; i--) {
      const parent = path[i] as InternalNodeProxy;
      const oldChildAddress = this.blockManager.hashFn(path[i + 1].bytes);
      const result = this.nodeManager.updateChildSync(
        parent,
        oldChildAddress,
        currentAddress,
        split
      );
      currentAddress = result.newAddress;
      split = result.split;
    }

    let newRootNode;
    if (split) {
      // This is not how we create a root node. Placeholder logic.
      newRootNode = this.nodeManager.getNodeSync(currentAddress);
    } else {
      newRootNode = this.nodeManager.getNodeSync(currentAddress);
    }
    if (!newRootNode) {
      throw new Error("Could not find new root node");
    }

    const newTree = new ProllyTree(
      newRootNode,
      this.blockManager,
      this.nodeManager
    );
    return { tree: newTree, changed: true };
  }
}
