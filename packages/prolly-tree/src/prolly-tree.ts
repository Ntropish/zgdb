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

export interface PathEntry {
  node: NodeProxy;
  address: Address;
}

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
    return this.blockManager.hashFnSync(this.rootNode.bytes);
  }

  public async loadRoot(): Promise<NodeProxy> {
    return this.rootNode;
  }

  public getRootNodeSync(): NodeProxy {
    return this.rootNode;
  }

  public async findPathToLeaf(key: Uint8Array): Promise<PathEntry[]> {
    const rootAddress = this.root;
    const path: PathEntry[] = [{ node: this.rootNode, address: rootAddress }];
    let current = this.rootNode;

    while (!isLeafNodeProxy(current)) {
      const internalNode = current as InternalNodeProxy;
      const index = internalNode.findChildIndex(key);

      const branchIndex = index === internalNode.length ? index - 1 : index;

      const branch = internalNode.getBranch(branchIndex);

      if (!branch?.address) {
        throw new Error(
          `Failed to find address for child index: ${branchIndex}`
        );
      }
      const nextAddress = branch.address;

      const nextNode = await this.nodeManager.getNode(nextAddress);
      if (!nextNode)
        throw new Error(`Failed to find node at address: ${nextAddress}`);
      current = nextNode;
      path.push({ node: current, address: nextAddress });
    }
    return path;
  }

  public findPathToLeafSync(key: Uint8Array): PathEntry[] {
    const rootAddress = this.root;
    const path: PathEntry[] = [{ node: this.rootNode, address: rootAddress }];
    let current = this.rootNode;

    while (!isLeafNodeProxy(current)) {
      const internalNode = current as InternalNodeProxy;
      const index = internalNode.findChildIndex(key);
      const branchIndex = index === internalNode.length ? index - 1 : index;

      const branch = internalNode.getBranch(branchIndex);
      if (!branch?.address) {
        throw new Error(
          `Failed to find address for child index: ${branchIndex}`
        );
      }
      const nextAddress = branch.address;

      const nextNode = this.nodeManager.getNodeSync(nextAddress);
      if (!nextNode)
        throw new Error(`Failed to find node at address: ${nextAddress}`);
      current = nextNode;
      path.push({ node: current, address: nextAddress });
    }
    return path;
  }

  public async get(key: Uint8Array): Promise<Uint8Array | undefined> {
    const path = await this.findPathToLeaf(key);
    const leaf = path[path.length - 1].node as LeafNodeProxy;
    const { found, index } = leaf.findKeyIndex(key);
    if (!found) {
      return undefined;
    }
    return leaf.getPair(index).value;
  }

  public getSync(key: Uint8Array): Uint8Array | undefined {
    const path = this.findPathToLeafSync(key);
    const leaf = path[path.length - 1].node as LeafNodeProxy;
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
    const leafEntry = path[path.length - 1];
    const leaf = leafEntry.node as LeafNodeProxy;

    const { newAddress, newBranches } = await this.nodeManager._put(
      leaf,
      key,
      value
    );

    if (compare(leafEntry.address, newAddress) === 0 && !newBranches) {
      // no change
      return;
    }

    let branchesToPropagate = newBranches;
    let newChildAddress = newAddress;

    // Handle the case where the leaf itself was the root
    if (path.length === 1) {
      if (branchesToPropagate) {
        const { node: newRoot } = await this.nodeManager.createInternalNode(
          branchesToPropagate
        );
        this.rootNode = newRoot;
      } else {
        const newRoot = await this.nodeManager.getNode(newChildAddress);
        if (!newRoot) throw new Error("Could not find new root node");
        this.rootNode = newRoot;
      }
      return;
    }

    // Propagate changes up the tree
    for (let i = path.length - 2; i >= 0; i--) {
      const parentEntry = path[i];
      const childEntry = path[i + 1];
      const parent = parentEntry.node as InternalNodeProxy;
      const oldChildAddress = childEntry.address;

      let branchesForUpdate: Branch[];
      if (branchesToPropagate) {
        branchesForUpdate = branchesToPropagate;
      } else {
        const newChildNode = await this.nodeManager.getNode(newChildAddress);
        if (!newChildNode)
          throw new Error("Could not load modified child node");
        const newKey = isLeafNodeProxy(newChildNode)
          ? newChildNode.getPair(newChildNode.length - 1).key
          : (newChildNode as InternalNodeProxy).getBranch(
              newChildNode.length - 1
            ).key;
        branchesForUpdate = [{ key: newKey, address: newChildAddress }];
      }

      const result = await this.nodeManager.updateChild(
        parent,
        oldChildAddress,
        branchesForUpdate
      );

      newChildAddress = result.newAddress;
      branchesToPropagate = result.newBranches;

      // If the parent didn't split, we can stop propagating, but we need to update the root
      // to reflect the change in this parent. We can't just break, because the root will be stale.
      if (!branchesToPropagate) {
        // Find the root and update its reference to the changed node.
        // This is inefficient. A better way is to rebuild from the path.
        // For now, we update the root directly if it's the current parent.
        if (i === 0) {
          const newRoot = await this.nodeManager.getNode(newChildAddress);
          if (!newRoot) throw new Error("Could not find new root node");
          this.rootNode = newRoot;
        }
        // How to update the tree if i > 0? The reference in path[i-1] is now stale.
        // The current logic is flawed because the path proxies become stale.
        // The loop must continue to the root, even if there are no more splits.
      }
    }

    // After the loop, the final state of the root is at newChildAddress,
    // unless the root itself split.
    if (branchesToPropagate) {
      const { node: finalRoot } = await this.nodeManager.createInternalNode(
        branchesToPropagate
      );
      this.rootNode = finalRoot;
    } else {
      const newRoot = await this.nodeManager.getNode(newChildAddress);
      if (!newRoot) throw new Error("Could not find new root node");
      this.rootNode = newRoot;
    }
  }

  public createCursor(): Cursor {
    return new Cursor(this, this.nodeManager);
  }

  async print(): Promise<string> {
    const rootData = await this.printNode(this.rootNode, this.root);
    return JSON.stringify(rootData, null, 2);
  }

  private async printNode(node: NodeProxy, address: Uint8Array): Promise<any> {
    if (node.isLeaf()) {
      const leaf = node as LeafNodeProxy;
      return {
        address: Buffer.from(address).toString("hex"),
        type: "leaf",
        level: leaf.level,
        entries: Array.from({ length: leaf.length }, (_, i) => {
          const pair = leaf.getPair(i);
          return {
            key: new TextDecoder().decode(pair.key),
            value: new TextDecoder().decode(pair.value),
          };
        }),
      };
    }

    const internal = node as InternalNodeProxy;
    const children = [];
    for (let i = 0; i < internal.length; i++) {
      const branch = internal.getBranch(i);
      if (branch.address) {
        const childNode = await this.nodeManager.getNode(branch.address);
        if (childNode) {
          children.push(await this.printNode(childNode, branch.address));
        }
      }
    }

    return {
      address: Buffer.from(address).toString("hex"),
      type: "internal",
      level: internal.level,
      keys: Array.from({ length: internal.length }, (_, i) =>
        new TextDecoder().decode(internal.getBranch(i).key)
      ),
      children,
    };
  }
}
