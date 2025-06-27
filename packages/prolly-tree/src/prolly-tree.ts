import { BlockManager } from "./block-store.js";
import { Configuration, defaultConfiguration } from "./configuration.js";
import { NodeManager } from "./node-manager.js";
import { isLeafNode, LeafNode, InternalNode, Address } from "./node.js";
import { Diff, ConflictResolver } from "./types.js";
import { compare } from "uint8arrays/compare";

export class ProllyTree {
  public readonly config: Configuration;
  private readonly nodeManager: NodeManager;

  constructor(
    public readonly rootHash: Address,
    blockManager: BlockManager,
    config?: Configuration
  ) {
    this.config = config ?? defaultConfiguration;
    this.nodeManager = new NodeManager(blockManager, this.config);
  }

  static async merge(
    local: ProllyTree,
    remote: ProllyTree,
    base: ProllyTree,
    resolver: ConflictResolver
  ): Promise<ProllyTree> {
    // This will be re-implemented
    throw new Error("Merge not implemented yet");
  }

  async get(key: Uint8Array): Promise<Uint8Array | undefined> {
    let node = await this.nodeManager.getNode(this.rootHash);
    if (!node) {
      return undefined;
    }

    while (!isLeafNode(node)) {
      // Find the correct child to descend into
      const childIndex = node.keys.findIndex((k) => compare(key, k) < 0);

      if (childIndex === -1) {
        // key is greater than all keys, so descend into the rightmost child
        const childAddress = node.children[node.children.length - 1];
        node = await this.nodeManager.getNode(childAddress);
      } else {
        const childAddress = node.children[childIndex];
        node = await this.nodeManager.getNode(childAddress);
      }

      if (!node) {
        // This indicates a broken link in the tree
        throw new Error("Failed to traverse tree: node not found");
      }
    }

    // We've found the leaf node, now find the key
    const pair = node.pairs.find(([k, v]) => compare(key, k) === 0);
    return pair ? pair[1] : undefined;
  }

  async put(key: Uint8Array, value: Uint8Array): Promise<ProllyTree> {
    // This will be re-implemented
    throw new Error("Put not implemented yet");
  }

  async delete(key: Uint8Array): Promise<ProllyTree> {
    // This will be re-implemented
    throw new Error("Delete not implemented yet");
  }

  async diff(other: ProllyTree): Promise<Diff[]> {
    // This will be re-implemented
    throw new Error("Diff not implemented yet");
  }
}
