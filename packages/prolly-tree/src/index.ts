// The Prolly Tree implementation will be built here.

/**
 * TODO: Implement the Prolly Tree data structure.
 *
 * This will include:
 * - A content-addressed block store.
 * - Node and leaf structures.
 * - Functions for get, put, delete.
 * - The core diff and merge algorithms.
 */

export type Diff = {
  key: Uint8Array;
  localValue?: Uint8Array;
  remoteValue?: Uint8Array;
};

export type ConflictResolver = (
  key: Uint8Array,
  base: Uint8Array | undefined,
  local: Uint8Array,
  remote: Uint8Array
) => Promise<Uint8Array>;

// In a real implementation, this would be a sophisticated content-addressed block store.
// For testing, a simple Map is sufficient.
class BlockStore {
  private blocks = new Map<string, Uint8Array>();
  private rootHash: Uint8Array = new Uint8Array([0]);

  async get(hash: Uint8Array): Promise<Uint8Array | undefined> {
    return this.blocks.get(hash.toString());
  }

  async put(block: Uint8Array): Promise<Uint8Array> {
    const hash = new Uint8Array(block.length); // Super naive "hash" for testing
    this.blocks.set(hash.toString(), block);
    return hash;
  }
}

export class Tree {
  constructor(
    public readonly store: BlockStore,
    public readonly rootHash: Uint8Array
  ) {}

  async get(key: Uint8Array): Promise<Uint8Array | undefined> {
    // TODO: Implement actual Prolly Tree traversal and get
    return new Uint8Array();
  }

  async put(key: Uint8Array, value: Uint8Array): Promise<Tree> {
    // TODO: Implement actual Prolly Tree put, which returns a new root hash
    const newRootHash = new Uint8Array([1, ...this.rootHash]);
    return new Tree(this.store, newRootHash);
  }

  async delete(key: Uint8Array): Promise<Tree> {
    // TODO: Implement actual Prolly Tree delete
    const newRootHash = new Uint8Array([2, ...this.rootHash]);
    return new Tree(this.store, newRootHash);
  }

  async diff(other: Tree): Promise<Diff[]> {
    // TODO: Implement actual diff logic
    return [];
  }

  static async merge(
    treeA: Tree,
    treeB: Tree,
    ancestor: Tree,
    resolver: ConflictResolver
  ): Promise<Tree> {
    // TODO: Implement actual merge logic
    console.log(treeA, treeB, ancestor, resolver);
    return treeA;
  }
}

export class Store {
  private blockStore: BlockStore;

  constructor() {
    this.blockStore = new BlockStore();
  }

  async getTree(rootHash?: Uint8Array): Promise<Tree> {
    // If no root hash is provided, it starts with an empty tree state.
    const initialRoot = rootHash ?? new Uint8Array([0]);
    return new Tree(this.blockStore, initialRoot);
  }
}
