import { BlockManager } from "./block-store.js";
import { Configuration, defaultConfiguration } from "./configuration.js";
import { LeafNode } from "./node.js";
import { ProllyTree } from "./prolly-tree.js";

export class Store {
  public blockManager: BlockManager;
  private config: Configuration;

  constructor(config: Configuration = defaultConfiguration) {
    this.config = config;
    this.blockManager = new BlockManager(this.config);
  }

  async getTree(rootHash?: Uint8Array): Promise<ProllyTree> {
    // If no root hash is provided, it starts with an empty tree state.
    const initialLeaf: LeafNode = { isLeaf: true, pairs: [] };
    const initialRoot =
      rootHash ?? (await this.blockManager.putNode(initialLeaf));
    return new ProllyTree(this.blockManager, initialRoot, this.config);
  }
}
