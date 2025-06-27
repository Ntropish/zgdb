import { Configuration } from "./configuration";
import { HashFn, getHashFn } from "./hashing";

// A mock BlockStore that simulates content-addressing with a Map.
// In a real implementation, this would be a more sophisticated storage layer.
export class BlockStore {
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
