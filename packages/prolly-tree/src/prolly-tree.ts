import { BlockManager } from "./block-store.js";
import { Configuration, defaultConfiguration } from "./configuration.js";
import { NodeManager } from "./node-manager.js";
import {
  isLeafNode,
  Node as ProllyNode,
  Address,
  LeafNode,
  InternalNode,
} from "./node.js";
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
    public readonly rootNode: ProllyNode,
    private readonly blockManager: BlockManager,
    private readonly nodeManager: NodeManager
  ) {}

  public static async create(blockManager: BlockManager): Promise<ProllyTree> {
    const nodeManager = new NodeManager(blockManager, blockManager.config);
    const rootNode = await nodeManager.createLeafNode([]);
    if (!rootNode.address) {
      throw new Error("Newly created root node must have an address");
    }
    return new ProllyTree(rootNode, blockManager, nodeManager);
  }

  public static createSync(blockManager: BlockManager): ProllyTree {
    const nodeManager = new NodeManager(blockManager, blockManager.config);
    const rootNode = nodeManager.createLeafNodeSync([]);
    if (!rootNode.address) {
      throw new Error("Newly created root node must have an address");
    }
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
    if (!this.rootNode.address) {
      throw new Error("Root node is missing address");
    }
    return this.rootNode.address;
  }

  private async findPathToLeaf(key: Uint8Array): Promise<ProllyNode[]> {
    const path: ProllyNode[] = [this.rootNode];
    let current = this.rootNode;

    while (!current.isLeaf) {
      const internalNode = current as InternalNode;
      const childIndex = internalNode.keys.findIndex(
        (k) => compare(key, k) < 0
      );

      const nextAddress =
        childIndex === -1
          ? internalNode.children[internalNode.children.length - 1]
          : internalNode.children[childIndex];

      const nextNode = await this.nodeManager.getNode(nextAddress);
      if (!nextNode)
        throw new Error(`Failed to find node at address: ${nextAddress}`);
      current = nextNode;
      path.push(current);
    }
    return path;
  }

  private findPathToLeafSync(key: Uint8Array): ProllyNode[] {
    const path: ProllyNode[] = [this.rootNode];
    let current = this.rootNode;

    while (!current.isLeaf) {
      const internalNode = current as InternalNode;
      const childIndex = internalNode.keys.findIndex(
        (k) => compare(key, k) < 0
      );

      const nextAddress =
        childIndex === -1
          ? internalNode.children[internalNode.children.length - 1]
          : internalNode.children[childIndex];

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
    const leaf = path[path.length - 1] as LeafNode;
    const pair = leaf.pairs.find(([k]) => compare(k, key) === 0);
    return pair ? pair[1] : undefined;
  }

  public getSync(key: Uint8Array): Uint8Array | undefined {
    const path = this.findPathToLeafSync(key);
    const leaf = path[path.length - 1] as LeafNode;
    const pair = leaf.pairs.find(([k]) => compare(k, key) === 0);
    return pair ? pair[1] : undefined;
  }

  public async *scan(
    startKey: Uint8Array,
    endKey?: Uint8Array
  ): AsyncGenerator<[Uint8Array, Uint8Array]> {
    const path = await this.findPathToLeaf(startKey);
    let currentLeaf = path[path.length - 1] as LeafNode;

    let pairIndex = 0;
    if (currentLeaf.pairs.length > 0) {
      pairIndex = currentLeaf.pairs.findIndex(
        ([k]) => compare(k, startKey) >= 0
      );
      if (pairIndex === -1) {
        pairIndex = currentLeaf.pairs.length;
      }
    }

    while (currentLeaf) {
      for (let i = pairIndex; i < currentLeaf.pairs.length; i++) {
        const [key, value] = currentLeaf.pairs[i];
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
        const internalParent = parent as InternalNode;

        const childAddress = childNode.address!;
        const childIndex = internalParent.children.findIndex(
          (addr) => compare(addr, childAddress) === 0
        );

        if (childIndex < internalParent.children.length - 1) {
          let nextNodeAddress = internalParent.children[childIndex + 1];
          let nextNode = await this.nodeManager.getNode(nextNodeAddress);
          if (!nextNode)
            throw new Error(`Could not find node at ${nextNodeAddress}`);
          path.push(nextNode);

          while (!nextNode.isLeaf) {
            const internal = nextNode as InternalNode;
            if (internal.children.length === 0) break;
            nextNode = await this.nodeManager.getNode(internal.children[0]);
            if (!nextNode) throw new Error("Failed to traverse down to leaf");
            path.push(nextNode);
          }

          if (nextNode.isLeaf) {
            currentLeaf = nextNode as LeafNode;
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
    let currentLeaf = path[path.length - 1] as LeafNode;

    let pairIndex = 0;
    if (currentLeaf.pairs.length > 0) {
      pairIndex = currentLeaf.pairs.findIndex(
        ([k]) => compare(k, startKey) >= 0
      );
      if (pairIndex === -1) {
        pairIndex = currentLeaf.pairs.length;
      }
    }

    while (currentLeaf) {
      for (let i = pairIndex; i < currentLeaf.pairs.length; i++) {
        const [key, value] = currentLeaf.pairs[i];
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
        const internalParent = parent as InternalNode;

        const childAddress = childNode.address!;
        const childIndex = internalParent.children.findIndex(
          (addr) => compare(addr, childAddress) === 0
        );

        if (childIndex < internalParent.children.length - 1) {
          let nextNodeAddress = internalParent.children[childIndex + 1];
          let nextNode = this.nodeManager.getNodeSync(nextNodeAddress);
          if (!nextNode)
            throw new Error(`Could not find node at ${nextNodeAddress}`);
          path.push(nextNode);

          while (!nextNode.isLeaf) {
            const internal = nextNode as InternalNode;
            if (internal.children.length === 0) break;
            nextNode = this.nodeManager.getNodeSync(internal.children[0]);
            if (!nextNode) throw new Error("Failed to traverse down to leaf");
            path.push(nextNode);
          }

          if (nextNode.isLeaf) {
            currentLeaf = nextNode as LeafNode;
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
    const leaf = path[path.length - 1] as LeafNode;

    const existingPair = leaf.pairs.find(([k]) => compare(k, key) === 0);
    if (existingPair && compare(existingPair[1], value) === 0) {
      return { tree: this, changed: false };
    }

    let { newAddress: currentAddress, split } = await this.nodeManager._put(
      leaf,
      key,
      value
    );

    for (let i = path.length - 2; i >= 0; i--) {
      const parent = path[i];
      const oldChildAddress = path[i + 1].address!;
      const result = await this.nodeManager.updateChild(
        parent,
        oldChildAddress,
        currentAddress,
        split
      );
      currentAddress = result.newAddress;
      split = result.split;
    }

    let newRootAddress = currentAddress;
    if (split) {
      const newRoot = await this.nodeManager.createNode(
        [],
        [split.key],
        [currentAddress, split.address],
        false
      );
      newRootAddress = newRoot.address!;
    }

    const newTree = await ProllyTree.load(newRootAddress, this.blockManager);
    return { tree: newTree, changed: true };
  }

  public putSync(
    key: Uint8Array,
    value: Uint8Array
  ): { tree: ProllyTree; changed: boolean } {
    const path = this.findPathToLeafSync(key);
    const leaf = path[path.length - 1] as LeafNode;

    const existingPair = leaf.pairs.find(([k]) => compare(k, key) === 0);
    if (existingPair && compare(existingPair[1], value) === 0) {
      return { tree: this, changed: false };
    }

    let { newAddress: currentAddress, split } = this.nodeManager._putSync(
      leaf,
      key,
      value
    );

    for (let i = path.length - 2; i >= 0; i--) {
      const parent = path[i];
      const oldChildAddress = path[i + 1].address!;
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
      newRootNode = this.nodeManager.createNodeSync(
        [],
        [split.key],
        [currentAddress, split.address],
        false
      );
    } else {
      newRootNode = this.nodeManager.getNodeSync(currentAddress);
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
}
