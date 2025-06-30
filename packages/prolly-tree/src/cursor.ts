import { ProllyTree, PathEntry } from "./prolly-tree.js";
import {
  NodeProxy,
  LeafNodeProxy,
  InternalNodeProxy,
  isLeafNodeProxy,
  KeyValuePair,
} from "./node-proxy.js";
import { NodeManager } from "./node-manager.js";
import { compare } from "uint8arrays/compare";

export class Cursor {
  private readonly tree: ProllyTree;
  private readonly nodeManager: NodeManager;

  private path: PathEntry[] = [];
  private index: number = -1;
  private _current: KeyValuePair | null = null;

  constructor(tree: ProllyTree, nodeManager: NodeManager) {
    this.tree = tree;
    this.nodeManager = nodeManager;
  }

  get current(): KeyValuePair | null {
    return this._current;
  }

  // #region Async Methods

  async first(): Promise<KeyValuePair | null> {
    this.path = [];
    let currentNode: NodeProxy = (await this.tree.loadRoot())!;
    let currentAddress = this.tree.root;
    this.path.push({ node: currentNode, address: currentAddress });

    while (!currentNode.isLeaf()) {
      const internalNode = currentNode as InternalNodeProxy;
      if (internalNode.length === 0) {
        this._current = null;
        return null;
      }
      const firstChildAddress = internalNode.getBranch(0).address;
      if (!firstChildAddress) {
        this._current = null;
        return null;
      }
      currentNode = (await this.nodeManager.getNode(firstChildAddress))!;
      this.path.push({ node: currentNode, address: firstChildAddress });
    }
    this.index = 0;
    return this._updateCurrent();
  }

  async seek(key: Uint8Array): Promise<KeyValuePair | null> {
    this.path = await this.tree.findPathToLeaf(key);
    const leafEntry = this.path[this.path.length - 1];
    if (!leafEntry) {
      this._current = null;
      return null;
    }
    const leaf = leafEntry.node as LeafNodeProxy;
    if (leaf.length === 0) {
      this._current = null;
      return null;
    }
    const { index } = leaf.findKeyIndex(key);
    this.index = index;

    return this._updateCurrent();
  }

  async next(): Promise<KeyValuePair | null> {
    this.index++;
    return this._updateCurrent();
  }

  private async _updateCurrent(): Promise<KeyValuePair | null> {
    if (this.path.length === 0) return null;
    let leafEntry = this.path[this.path.length - 1];
    let leaf = leafEntry.node as LeafNodeProxy;

    if (this.index >= leaf.length) {
      const nextLeaf = await this._findNextLeaf();
      if (!nextLeaf) {
        this._current = null;
        return null;
      }
      leaf = nextLeaf;
      this.index = 0;
    }
    if (leaf.length === 0) {
      this._current = null;
      return null;
    }
    this._current = leaf.getPair(this.index);
    return this._current;
  }

  private async _findNextLeaf(): Promise<LeafNodeProxy | null> {
    while (this.path.length > 1) {
      const childEntry = this.path.pop()!;
      const parentEntry = this.path[this.path.length - 1];
      const parent = parentEntry.node;
      if (parent.isLeaf()) break;

      const internalParent = parent as InternalNodeProxy;
      const childAddress = childEntry.address;

      let childIndex = -1;
      for (let i = 0; i < internalParent.length; i++) {
        const branch = internalParent.getBranch(i);
        if (branch.address && compare(branch.address, childAddress) === 0) {
          childIndex = i;
          break;
        }
      }

      if (childIndex !== -1 && childIndex < internalParent.length - 1) {
        let nextNodeAddress = internalParent.getBranch(childIndex + 1).address;
        if (!nextNodeAddress) return null;

        let nextNode = await this.nodeManager.getNode(nextNodeAddress);
        if (!nextNode) return null;

        this.path.push({ node: nextNode, address: nextNodeAddress });

        while (!nextNode.isLeaf()) {
          const internal = nextNode as InternalNodeProxy;
          if (internal.length === 0) return null;
          nextNodeAddress = internal.getBranch(0).address;
          if (!nextNodeAddress) return null;
          nextNode = await this.nodeManager.getNode(nextNodeAddress);
          if (!nextNode) return null;
          this.path.push({ node: nextNode, address: nextNodeAddress });
        }
        return nextNode as LeafNodeProxy;
      }
    }
    return null;
  }

  // #endregion

  // #region Sync Methods

  firstSync(): KeyValuePair | null {
    this.path = [];
    let currentNode: NodeProxy = this.tree.getRootNodeSync();
    let currentAddress = this.tree.root;
    this.path.push({ node: currentNode, address: currentAddress });

    while (!currentNode.isLeaf()) {
      const internalNode = currentNode as InternalNodeProxy;
      if (internalNode.length === 0) {
        this._current = null;
        return null;
      }
      const firstChildAddress = internalNode.getBranch(0).address;
      if (!firstChildAddress) {
        this._current = null;
        return null;
      }
      currentNode = this.nodeManager.getNodeSync(firstChildAddress)!;
      this.path.push({ node: currentNode, address: firstChildAddress });
    }
    this.index = 0;
    return this._updateCurrentSync();
  }

  seekSync(key: Uint8Array): KeyValuePair | null {
    this.path = this.tree.findPathToLeafSync(key);
    const leafEntry = this.path[this.path.length - 1];
    if (!leafEntry) {
      this._current = null;
      return null;
    }
    const leaf = leafEntry.node as LeafNodeProxy;
    if (leaf.length === 0) {
      this._current = null;
      return null;
    }
    const { index } = leaf.findKeyIndex(key);
    this.index = index;
    return this._updateCurrentSync();
  }

  nextSync(): KeyValuePair | null {
    this.index++;
    return this._updateCurrentSync();
  }

  private _updateCurrentSync(): KeyValuePair | null {
    if (this.path.length === 0) return null;
    let leafEntry = this.path[this.path.length - 1];
    let leaf = leafEntry.node as LeafNodeProxy;

    if (this.index >= leaf.length) {
      const nextLeaf = this._findNextLeafSync();
      if (!nextLeaf) {
        this._current = null;
        return null;
      }
      leaf = nextLeaf;
      this.index = 0;
    }
    if (leaf.length === 0) {
      this._current = null;
      return null;
    }
    this._current = leaf.getPair(this.index);
    return this._current;
  }

  private _findNextLeafSync(): LeafNodeProxy | null {
    while (this.path.length > 1) {
      const childEntry = this.path.pop()!;
      const parentEntry = this.path[this.path.length - 1];
      const parent = parentEntry.node;
      if (parent.isLeaf()) break;
      const internalParent = parent as InternalNodeProxy;
      const childAddress = childEntry.address;
      let childIndex = -1;
      for (let i = 0; i < internalParent.length; i++) {
        const branch = internalParent.getBranch(i);
        if (branch.address && compare(branch.address, childAddress) === 0) {
          childIndex = i;
          break;
        }
      }
      if (childIndex !== -1 && childIndex < internalParent.length - 1) {
        let nextNodeAddress = internalParent.getBranch(childIndex + 1).address;
        if (!nextNodeAddress) return null;
        let nextNode = this.nodeManager.getNodeSync(nextNodeAddress);
        if (!nextNode) return null;
        this.path.push({ node: nextNode, address: nextNodeAddress });
        while (!nextNode.isLeaf()) {
          const internal = nextNode as InternalNodeProxy;
          if (internal.length === 0) return null;
          nextNodeAddress = internal.getBranch(0).address;
          if (!nextNodeAddress) return null;
          nextNode = this.nodeManager.getNodeSync(nextNodeAddress);
          if (!nextNode) return null;
          this.path.push({ node: nextNode, address: nextNodeAddress });
        }
        return nextNode as LeafNodeProxy;
      }
    }
    return null;
  }
  // #endregion
}
