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

import { blake3 } from "@noble/hashes/blake3";
import { sha256 } from "@noble/hashes/sha256";
import { sha512 } from "@noble/hashes/sha512";
import {
  Configuration,
  HashingAlgorithm,
  defaultConfiguration,
} from "./configuration";

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

type HashFn = (data: Uint8Array) => Uint8Array;

function getHashFn(algorithm: HashingAlgorithm): HashFn {
  switch (algorithm) {
    case "blake3":
      return blake3;
    case "sha2-256":
      return sha256;
    case "sha3-256":
      return sha512; // NB: noble/hashes does not have sha3-256, using 512 as a stand-in
  }
}

// A mock BlockStore that simulates content-addressing with a Map.
// In a real implementation, this would be a more sophisticated storage layer.
class BlockStore {
  private blocks = new Map<string, Uint8Array>();
  private hashFn: HashFn;

  constructor(config: Configuration) {
    this.hashFn = getHashFn(config.hashingAlgorithm);
  }

  async get(hash: Uint8Array): Promise<Uint8Array | undefined> {
    return this.blocks.get(hash.toString());
  }

  async put(block: Uint8Array): Promise<Uint8Array> {
    const hash = this.hashFn(block);
    this.blocks.set(hash.toString(), block);
    return hash;
  }

  // Helper to serialize and store the tree's data map
  async putData(data: Map<string, Uint8Array>): Promise<Uint8Array> {
    const serialized = JSON.stringify(
      Array.from(data.entries()).map(([key, value]) => [key, Array.from(value)])
    );
    return this.put(new TextEncoder().encode(serialized));
  }

  // Helper to retrieve and deserialize the tree's data map
  async getData(
    hash: Uint8Array
  ): Promise<Map<string, Uint8Array> | undefined> {
    const serialized = await this.get(hash);
    if (!serialized) return undefined;
    const decoded = new TextDecoder().decode(serialized);
    const parsed = JSON.parse(decoded);
    return new Map(
      parsed.map(([key, value]: [string, number[]]) => [
        key,
        new Uint8Array(value),
      ])
    );
  }
}

export class ProllyTree {
  private data: Map<string, Uint8Array> | null = null;
  public readonly config: Configuration;

  constructor(
    public readonly store: BlockStore,
    public readonly rootHash: Uint8Array,
    config?: Configuration
  ) {
    this.config = config ?? defaultConfiguration;
  }

  private async _getData(): Promise<Map<string, Uint8Array>> {
    if (this.data) return this.data;
    const data = (await this.store.getData(this.rootHash)) ?? new Map();
    this.data = data;
    return data;
  }

  async get(key: Uint8Array): Promise<Uint8Array | undefined> {
    const data = await this._getData();
    return data.get(key.toString());
  }

  async put(key: Uint8Array, value: Uint8Array): Promise<ProllyTree> {
    const data = await this._getData();
    const newData = new Map(data);
    newData.set(key.toString(), value);
    const newRootHash = await this.store.putData(newData);
    const newTree = new ProllyTree(this.store, newRootHash, this.config);
    newTree.data = newData;
    return newTree;
  }

  async delete(key: Uint8Array): Promise<ProllyTree> {
    const data = await this._getData();
    const newData = new Map(data);
    newData.delete(key.toString());
    const newRootHash = await this.store.putData(newData);
    const newTree = new ProllyTree(this.store, newRootHash, this.config);
    newTree.data = newData;
    return newTree;
  }

  async diff(other: ProllyTree): Promise<Diff[]> {
    // TODO: Implement actual diff logic
    return [];
  }

  static async merge(
    treeA: ProllyTree,
    treeB: ProllyTree,
    ancestor: ProllyTree,
    resolver: ConflictResolver
  ): Promise<ProllyTree> {
    const dataA = await treeA._getData();
    const dataB = await treeB._getData();
    const dataAncestor = await ancestor._getData();
    const mergedData = new Map(dataAncestor);

    const allKeys = new Set([
      ...Array.from(dataA.keys()),
      ...Array.from(dataB.keys()),
    ]);
    const enc = new TextEncoder();
    const dec = new TextDecoder();

    for (const key of allKeys) {
      const valA = dataA.get(key);
      const valB = dataB.get(key);
      const valAncestor = dataAncestor.get(key);

      const aExists = valA !== undefined;
      const bExists = valB !== undefined;
      const ancestorExists = valAncestor !== undefined;

      const aChanged = valA?.toString() !== valAncestor?.toString();
      const bChanged = valB?.toString() !== valAncestor?.toString();

      if (aChanged && bChanged) {
        // Conflict
        const resolvedValue = await resolver(
          enc.encode(key),
          valAncestor,
          valA as Uint8Array, // If aChanged, valA must exist
          valB as Uint8Array // If bChanged, valB must exist
        );
        mergedData.set(key, resolvedValue);
      } else if (aChanged) {
        if (aExists) {
          mergedData.set(key, valA);
        } else {
          mergedData.delete(key);
        }
      } else if (bChanged) {
        if (bExists) {
          mergedData.set(key, valB);
        } else {
          mergedData.delete(key);
        }
      }
    }

    const newRootHash = await treeA.store.putData(mergedData);
    const newTree = new ProllyTree(treeA.store, newRootHash, treeA.config);
    newTree.data = mergedData;
    return newTree;
  }
}

export class Store {
  private blockStore: BlockStore;
  private config: Configuration;

  constructor(config: Configuration = defaultConfiguration) {
    this.config = config;
    this.blockStore = new BlockStore(this.config);
  }

  async getTree(rootHash?: Uint8Array): Promise<ProllyTree> {
    // If no root hash is provided, it starts with an empty tree state.
    const initialRoot = rootHash ?? (await this.blockStore.putData(new Map()));
    return new ProllyTree(this.blockStore, initialRoot, this.config);
  }
}
