import { Configuration, defaultConfiguration } from "./configuration.js";
import { HashFn, getHashFn } from "./hashing.js";
import { Node, serializeNode, deserializeNode, Address } from "./node.js";
import { merge } from "lodash-es";

// A mock BlockManager that simulates content-addressing with a Map.
// In a real implementation, this would be a more sophisticated storage layer.
export class BlockManager {
  private blocks = new Map<string, Uint8Array>();
  public readonly config: Configuration;
  private readonly hashFn: HashFn;

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

  async getNode(address: Address): Promise<Node | undefined> {
    const block = await this.get(address);
    if (!block) return undefined;
    return deserializeNode(block);
  }

  getNodeSync(address: Address): Node | undefined {
    const block = this.getSync(address);
    if (!block) return undefined;
    return deserializeNode(block);
  }

  async putNode(node: Node): Promise<Address> {
    const block = serializeNode(node);
    return this.put(block);
  }

  putNodeSync(node: Node): Address {
    const block = serializeNode(node);
    return this.putSync(block);
  }
}
