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
  private constructor(
    public readonly rootNode: NodeProxy,
    private readonly blockManager: BlockManager,
    public readonly nodeManager: NodeManager
  ) {}

  public static async create(blockManager: BlockManager): Promise<ProllyTree> {
    const nodeManager = new NodeManager(blockManager, blockManager.config);
    const { node: rootNode } = await nodeManager.createLeafNode([]);
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

  public async findPathToLeaf(key: Uint8Array): Promise<NodeProxy[]> {
    const path: NodeProxy[] = [this.rootNode];
    let current = this.rootNode;

    while (!isLeafNodeProxy(current)) {
      const internalNode = current as InternalNodeProxy;
      const childIndex = internalNode.findChildIndex(key);
      const nextAddress = internalNode.getAddress(childIndex);

      if (!nextAddress)
        throw new Error(
          `Failed to find address for child index: ${childIndex}`
        );

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
      const childIndex = internalNode.findChildIndex(key);
      const nextAddress = internalNode.getAddress(childIndex);

      if (!nextAddress)
        throw new Error(
          `Failed to find address for child index: ${childIndex}`
        );

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

  public async put(
    key: Uint8Array,
    value: Uint8Array
  ): Promise<{ tree: ProllyTree; changed: boolean }> {
    const path = await this.findPathToLeaf(key);
    const leaf = path[path.length - 1] as LeafNodeProxy;

    const originalLeafAddress = await this.blockManager.hashFn(leaf.bytes);

    let { newAddress: currentAddress, split } = await this.nodeManager._put(
      leaf,
      key,
      value
    );

    if (compare(originalLeafAddress, currentAddress) === 0 && !split) {
      return { tree: this, changed: false };
    }

    // Propagate splits up the tree
    for (let i = path.length - 2; i >= 0; i--) {
      const parent = path[i] as InternalNodeProxy;
      const oldChildAddress = await this.blockManager.hashFn(path[i + 1].bytes);
      const parentAddress = await this.blockManager.hashFn(parent.bytes);

      const result = await this.nodeManager.updateChild(
        parent,
        oldChildAddress,
        currentAddress,
        split
      );

      currentAddress = result.newAddress;
      split = result.split;

      // If the parent's address didn't change and there was no split, we can stop.
      if (compare(parentAddress, currentAddress) === 0 && !split) {
        break;
      }
    }

    let newRootNode;
    // If a split propagates all the way to the root, create a new root
    if (split) {
      const { node } = await this.nodeManager.createInternalNode([
        { key: split.key, address: currentAddress },
        { key: new Uint8Array(), address: split.address },
      ]);
      newRootNode = node;
    } else {
      newRootNode = await this.nodeManager.getNode(currentAddress);
      if (!newRootNode) {
        throw new Error("Could not find new root node");
      }
    }

    const newTree = new ProllyTree(
      newRootNode,
      this.blockManager,
      this.nodeManager
    );
    return { tree: newTree, changed: true };
  }

  public createCursor(): Cursor {
    return new Cursor(this);
  }

  async print(): Promise<string> {
    return this.printNode(this.rootNode, 0);
  }

  private async printNode(node: NodeProxy, level: number): Promise<string> {
    let output = "";
    const indent = "  ".repeat(level);
    const nodeAddress = toString(await this.blockManager.hashFn(node.bytes));

    if (isLeafNodeProxy(node)) {
      output += `${indent}Leaf (L${node.level}) @ ${nodeAddress} (${node.keysLength} keys)\\n`;
      for (let i = 0; i < node.keysLength; i++) {
        const pair = node.getPair(i);
        output += `${indent}  - Key: "${toString(
          pair.key
        )}", Value: "${toString(pair.value)}"\\n`;
      }
    } else {
      const internalNode = node as InternalNodeProxy;
      output += `${indent}Internal (L${internalNode.level}) @ ${nodeAddress} (${internalNode.keysLength} keys, ${internalNode.addressesLength} children)\\n`;
      for (let i = 0; i < internalNode.keysLength; i++) {
        const key = internalNode.getKey(i);
        const childAddress = internalNode.getAddress(i);
        output += `${indent}  - Key: "${toString(key!)}" -> Pointer: ${toString(
          childAddress!
        )}\\n`;
        const childNode = await this.nodeManager.getNode(childAddress!);
        if (childNode) {
          output += await this.printNode(childNode, level + 1);
        }
      }
      // Print the last child
      const lastChildAddress = internalNode.getAddress(internalNode.keysLength);
      if (lastChildAddress) {
        output += `${indent}  - Pointer: ${toString(lastChildAddress)}\\n`;
        const childNode = await this.nodeManager.getNode(lastChildAddress);
        if (childNode) {
          output += await this.printNode(childNode, level + 1);
        }
      }
    }
    return output;
  }
}
