import { Configuration, defaultConfiguration } from "./configuration.js";
import { HashFn, getHashFn } from "./hashing.js";
import { Address } from "./node-proxy.js";
import { merge } from "lodash-es";
import { blake3 } from "@noble/hashes/blake3";

// A mock BlockManager that simulates content-addressing with a Map.
// In a real implementation, this would be a more sophisticated storage layer.
export class BlockManager {
  private blocks = new Map<string, Uint8Array>();
  public readonly config: Configuration;
  public readonly hashFn: HashFn;
  public readonly hashFnSync: (data: Uint8Array) => Uint8Array;

  constructor(config?: Partial<Configuration>) {
    this.config = merge({}, defaultConfiguration, config);
    this.hashFn = getHashFn(this.config.hashingAlgorithm);
    // For now, we only support blake3 synchronously.
    // A more robust implementation would check the config.
    this.hashFnSync = (data: Uint8Array) => blake3(data);
  }

  async get(hash: Uint8Array): Promise<Uint8Array | undefined> {
    return this.getSync(hash);
  }

  getSync(hash: Uint8Array): Uint8Array | undefined {
    return this.blocks.get(hash.toString());
  }

  async put(block: Uint8Array): Promise<Uint8Array> {
    const hash = await this.hashFn(block);
    this.blocks.set(hash.toString(), block);
    return hash;
  }
}
