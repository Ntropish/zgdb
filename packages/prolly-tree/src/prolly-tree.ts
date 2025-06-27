import { BlockStore } from "./block.js";
import { Configuration, defaultConfiguration } from "./configuration.js";
import { merge } from "./merge.js";
import { Diff, ConflictResolver } from "./types.js";

export class ProllyTree {
  _data: Map<string, Uint8Array> | null = null;
  public readonly config: Configuration;

  static merge(
    treeA: ProllyTree,
    treeB: ProllyTree,
    ancestor: ProllyTree,
    resolver: ConflictResolver
  ): Promise<ProllyTree> {
    return merge(treeA, treeB, ancestor, resolver);
  }

  constructor(
    public readonly store: BlockStore,
    public readonly rootHash: Uint8Array,
    config?: Configuration
  ) {
    this.config = config ?? defaultConfiguration;
  }

  async _getData(): Promise<Map<string, Uint8Array>> {
    if (this._data) return this._data;
    const data = (await this.store.getData(this.rootHash)) ?? new Map();
    this._data = data;
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
    newTree._data = newData;
    return newTree;
  }

  async delete(key: Uint8Array): Promise<ProllyTree> {
    const data = await this._getData();
    const newData = new Map(data);
    newData.delete(key.toString());
    const newRootHash = await this.store.putData(newData);
    const newTree = new ProllyTree(this.store, newRootHash, this.config);
    newTree._data = newData;
    return newTree;
  }

  async diff(other: ProllyTree): Promise<Diff[]> {
    // TODO: Implement actual diff logic
    return [];
  }
}
