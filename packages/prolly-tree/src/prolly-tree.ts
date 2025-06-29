import { BlockManager } from "./block-store.js";
import { Configuration, defaultConfiguration } from "./configuration.js";
import { NodeManager } from "./node-manager.js";
import {
  isLeafNodeProxy,
  LeafNodeProxy,
  NodeProxy,
  InternalNodeProxy,
  Address,
  Branch,
} from "./node-proxy.js";
import { Diff, ConflictResolver } from "./types.js";
import { compare } from "uint8arrays/compare";
import { toString } from "uint8arrays/to-string";
import { Cursor } from "./cursor.js";

type Change = {
  newAddress: Address;
  split?: {
    key: Uint8Array;
    address: Address;
  };
};

export class ProllyTree {
  private rootNode: NodeProxy;
  private nodeManager: NodeManager;

  private constructor(
    rootNode: NodeProxy,
    private readonly blockManager: BlockManager
  ) {
    this.rootNode = rootNode;
    this.nodeManager = new NodeManager(blockManager, blockManager.config);
  }

  public static async create(blockManager: BlockManager): Promise<ProllyTree> {
    const nodeManager = new NodeManager(blockManager, blockManager.config);
    const { node: rootNode } = await nodeManager.createLeafNode([]);
    return new ProllyTree(rootNode, blockManager);
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
    return new ProllyTree(rootNode, blockManager);
  }

  public get root(): Address {
    return this.blockManager.hashFn(this.rootNode.bytes);
  }

  public async findPathToLeaf(key: Uint8Array): Promise<NodeProxy[]> {
    const path: NodeProxy[] = [this.rootNode];
    let current = this.rootNode;

    while (!isLeafNodeProxy(current)) {
      const internalNode = current as InternalNodeProxy;
      let index = internalNode.findChildIndex(key);
      if (index === internalNode.length) {
        index = internalNode.length - 1;
      }
      const branch = internalNode.getBranch(index);
      if (!branch?.address) {
        throw new Error(`Failed to find address for child index: ${index}`);
      }
      const nextAddress = branch.address;

      const nextNode = await this.nodeManager.getNode(nextAddress);
      if (!nextNode)
        throw new Error(`Failed to find node at address: ${nextAddress}`);
      current = nextNode;
      path.push(current);
    }
    return path;
  }

  public findPathToLeafSync(key: Uint8Array): NodeProxy[] {
    const path: NodeProxy[] = [this.rootNode];
    let current = this.rootNode;

    while (!isLeafNodeProxy(current)) {
      const internalNode = current as InternalNodeProxy;
      let index = internalNode.findChildIndex(key);
      if (index === internalNode.length) {
        index = internalNode.length - 1;
      }
      const branch = internalNode.getBranch(index);
      if (!branch?.address) {
        throw new Error(`Failed to find address for child index: ${index}`);
      }
      const nextAddress = branch.address;

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
    const { found, index } = leaf.findKeyIndex(key);
    if (!found) {
      return undefined;
    }
    return leaf.getPair(index).value;
  }

  public getSync(key: Uint8Array): Uint8Array | undefined {
    const path = this.findPathToLeafSync(key);
    const leaf = path[path.length - 1] as LeafNodeProxy;
    const { found, index } = leaf.findKeyIndex(key);
    if (!found) {
      return undefined;
    }
    return leaf.getPair(index).value;
  }

  public async *scan(options?: {
    start?: { key: Uint8Array; inclusive: boolean };
    end?: { key: Uint8Array; inclusive: boolean };
  }): AsyncGenerator<[Uint8Array, Uint8Array]> {
    const cursor = this.createCursor();
    const startKey = options?.start?.key;

    for (
      let pair = startKey ? await cursor.seek(startKey) : await cursor.first();
      pair !== null;
      pair = await cursor.next()
    ) {
      if (
        options?.start &&
        !options.start.inclusive &&
        compare(pair.key, options.start.key) === 0
      ) {
        continue; // Skip the first key if not inclusive
      }
      if (options?.end) {
        const cmp = compare(pair.key, options.end.key);
        if (cmp > 0 || (cmp === 0 && !options.end.inclusive)) {
          break;
        }
      }
      yield [pair.key, pair.value];
    }
  }

  public *scanSync(options?: {
    start?: { key: Uint8Array; inclusive: boolean };
    end?: { key: Uint8Array; inclusive: boolean };
  }): Generator<[Uint8Array, Uint8Array]> {
    const cursor = this.createCursor();
    const startKey = options?.start?.key;

    for (
      let pair = startKey ? cursor.seekSync(startKey) : cursor.firstSync();
      pair !== null;
      pair = cursor.nextSync()
    ) {
      if (
        options?.start &&
        !options.start.inclusive &&
        compare(pair.key, options.start.key) === 0
      ) {
        continue;
      }
      if (options?.end) {
        const cmp = compare(pair.key, options.end.key);
        if (cmp > 0 || (cmp === 0 && !options.end.inclusive)) {
          break;
        }
      }
      yield [pair.key, pair.value];
    }
  }

  public async put(key: Uint8Array, value: Uint8Array): Promise<void> {
    const path = await this.findPathToLeaf(key);
    const leaf = path[path.length - 1] as LeafNodeProxy;

    const { newAddress, newBranches } = await this.nodeManager._put(
      leaf,
      key,
      value
    );

    const originalLeafAddress = this.blockManager.hashFnSync(leaf.bytes);
    if (compare(originalLeafAddress, newAddress) === 0 && !newBranches) {
      // no change
      return;
    }

    // Handle root-level changes
    if (path.length === 1) {
      if (newBranches) {
        // Root leaf was split, create a new internal node as root
        const { node: newRoot } = await this.nodeManager.createInternalNode(
          newBranches
        );
        this.rootNode = newRoot;
      } else {
        // Root leaf was modified but not split
        const newRoot = await this.nodeManager.getNode(newAddress);
        if (!newRoot) throw new Error("Could not find new root node");
        this.rootNode = newRoot;
      }
      return;
    }

    // Propagate changes up the tree
    let branchesToPropagate = newBranches;
    let addressToPropagate = newAddress;

    for (let i = path.length - 2; i >= 0; i--) {
      const parent = path[i] as InternalNodeProxy;
      const oldChildAddress = this.blockManager.hashFnSync(path[i + 1].bytes);

      if (!branchesToPropagate) {
        // The child node was modified without splitting.
        // We need to create a single branch to represent it for propagation.
        const updatedChildNode = await this.nodeManager.getNode(
          addressToPropagate
        );
        if (!updatedChildNode)
          throw new Error("Could not find updated child node for propagation");

        const maxKey = updatedChildNode.isLeaf()
          ? (updatedChildNode as LeafNodeProxy).getPair(
              (updatedChildNode as LeafNodeProxy).length - 1
            ).key
          : (updatedChildNode as InternalNodeProxy).getBranch(
              (updatedChildNode as InternalNodeProxy).length - 1
            ).key;

        branchesToPropagate = [{ key: maxKey, address: addressToPropagate }];
      }

      const result = await this.nodeManager.updateChild(
        parent,
        oldChildAddress,
        branchesToPropagate
      );

      addressToPropagate = result.newAddress;
      branchesToPropagate = result.newBranches;
    }

    // If a split propagated all the way to the root, create a new root
    if (branchesToPropagate) {
      const { node } = await this.nodeManager.createInternalNode(
        branchesToPropagate
      );
      this.rootNode = node;
    } else {
      // Otherwise, the new root is the (potentially updated) node at the top of the path
      const newRoot = await this.nodeManager.getNode(addressToPropagate);
      if (!newRoot) {
        throw new Error(
          `Failed to find new root node at address: ${addressToPropagate}`
        );
      }
      this.rootNode = newRoot;
    }
  }

  public createCursor(): Cursor {
    return new Cursor(this, this.nodeManager, this.rootNode);
  }

  async print(): Promise<string> {
    const rootData = await this.printNode(this.rootNode);
    return JSON.stringify(rootData, null, 2);
  }

  private async printNode(node: NodeProxy): Promise<any> {
    if (isLeafNodeProxy(node)) {
      const leaf = node as LeafNodeProxy;
      return {
        type: "leaf",
        level: leaf.level,
        keys: Array.from({ length: leaf.length }, (_, i) =>
          toString(leaf.getPair(i).key, "base64")
        ),
      };
    } else {
      const internal = node as InternalNodeProxy;
      const children = [];
      for (let i = 0; i < internal.length; i++) {
        const branch = internal.getBranch(i);
        if (branch.address) {
          const childNode = await this.nodeManager.getNode(branch.address);
          if (childNode) {
            children.push(await this.printNode(childNode));
          }
        }
      }
      return {
        type: "internal",
        level: internal.level,
        keys: Array.from({ length: internal.length }, (_, i) =>
          toString(internal.getBranch(i).key, "base64")
        ),
        children,
      };
    }
  }
}
