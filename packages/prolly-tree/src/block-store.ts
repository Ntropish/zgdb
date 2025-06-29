import { Configuration, defaultConfiguration } from "./configuration.js";
import { HashFn, getHashFn } from "./hashing.js";
import { Address } from "./node-proxy.js";
import { merge } from "lodash-es";

// A mock BlockManager that simulates content-addressing with a Map.
// In a real implementation, this would be a more sophisticated storage layer.
export class BlockManager {
  private blocks = new Map<string, Uint8Array>();
  public readonly config: Configuration;
  public readonly hashFn: HashFn;

  constructor(config?: Partial<Configuration>) {
    this.config = merge({}, defaultConfiguration, config);
    this.hashFn = getHashFn(this.config.hashingAlgorithm);
  }

  async get(hash: Uint8Array): Promise<Uint8Array | undefined> {
    return this.blocks.get(hash.toString());
  }

  getSync(hash: Uint8Array): Uint8Array | undefined {
    return this.blocks.get(hash.toString());
  }

  async put(block: Uint8Array): Promise<Uint8Array> {
    const hash = this.hashFn(block);
    this.blocks.set(hash.toString(), block);
    return hash;
  }

  putSync(block: Uint8Array): Uint8Array {
    const hash = this.hashFn(block);
    this.blocks.set(hash.toString(), block);
    return hash;
  }
}
