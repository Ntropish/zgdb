import { BlockManager } from "./block-store.js";
import { Configuration, defaultConfiguration } from "./configuration.js";
import { ProllyTree } from "./prolly-tree.js";

// The Store class is a convenience wrapper around the BlockManager and ProllyTree
// that provides a simple interface for creating and managing a tree.
// In a real application, you would likely have a more sophisticated storage
// layer that manages multiple trees and other data.
export class Store {
  public readonly blockManager: BlockManager;
  public readonly config: Configuration;

  constructor(config?: Partial<Configuration>) {
    // Delegate config merging to the BlockManager, which is the source of truth.
    this.blockManager = new BlockManager(config);
    this.config = this.blockManager.config;
  }

  async getTree(rootHash?: Uint8Array): Promise<ProllyTree> {
    if (rootHash) {
      return ProllyTree.load(rootHash, this.blockManager);
    } else {
      return ProllyTree.create(this.blockManager);
    }
  }
}
