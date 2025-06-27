import { BlockStore } from "./block.js";
import { Configuration, defaultConfiguration } from "./configuration.js";
import { ProllyTree } from "./prolly-tree.js";

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
