import { Configuration } from "./configuration.js";
import { HashFn, getHashFn } from "./hashing.js";
import { Node, serializeNode, deserializeNode, Address } from "./node.js";

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

  async getNode(address: Address): Promise<Node | undefined> {
    const block = await this.get(address);
    if (!block) return undefined;
    return deserializeNode(block);
  }

  async putNode(node: Node): Promise<Address> {
    const block = serializeNode(node);
    return this.put(block);
  }
}
