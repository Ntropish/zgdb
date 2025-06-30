// The high-level ZG client runtime will be implemented here.

import { BlockManager, ProllyTree } from "@zgdb/prolly-tree";
import { Table, ByteBuffer } from "flatbuffers";
import { compare } from "uint8arrays";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type ZgAuthContext<TActor = any> = {
  actor: TActor;
};

// This is the base class for all generated node types.
// It provides the link to the low-level Flatbuffers object.
export class ZgBaseNode<T extends Table & { id(): string }, TActor = any> {
  constructor(
    protected tx: ZgTransaction,
    public fbb: T,
    public authContext: ZgAuthContext<TActor> | null
  ) {}

  get id(): string {
    return this.fbb.id();
  }
}

export class EntityCollection<
  T extends Table & { id(): string },
  TNode extends ZgBaseNode<T>
> {
  constructor(
    private tx: ZgTransaction,
    private entityName: string,
    private nodeFactory: (
      tx: ZgTransaction,
      fbb: T,
      ac: ZgAuthContext<any> | null
    ) => TNode,
    private getRootAs: (byteBuffer: ByteBuffer) => T,
    private authContext: ZgAuthContext | null
  ) {}

  get(id: string): TNode | null {
    return this.tx.get(
      this.entityName,
      id,
      this.nodeFactory,
      this.getRootAs,
      this.authContext
    );
  }

  *[Symbol.iterator](): Generator<TNode> {
    const startKey = ZgDatabase.textToKey(this.entityName + ":");
    const endKey = ZgDatabase.textToKey(this.entityName + ";"); // ':' is right before ';' in ASCII

    for (const [key, value] of this.tx.scan(startKey, endKey)) {
      const byteBuffer = new ByteBuffer(value);
      const table = this.getRootAs(byteBuffer);
      yield this.nodeFactory(this.tx, table, this.authContext);
    }
  }
}

// The ZgDatabase class is the storage engine.
export class ZgDatabase {
  private tree: ProllyTree | null = null;
  private blockManager: BlockManager;
  private config: any;

  public static textToKey(text: string): Uint8Array {
    return encoder.encode(text);
  }

  constructor(options?: any) {
    this.config = options;
    this.blockManager = new BlockManager();
  }

  private async getTree(): Promise<ProllyTree> {
    if (!this.tree) {
      this.tree = await ProllyTree.create(this.blockManager);
    }
    return this.tree;
  }

  public async createTransaction(): Promise<ZgTransaction> {
    const tree = await this.getTree();
    const txTree = await ProllyTree.load(tree.root, tree.blockManager);
    return new ZgTransaction(this, txTree);
  }

  // The main commit method
  async commitTransaction(tx: ZgTransaction): Promise<void> {
    // Basic "first-writer-wins" OCC
    // In a real scenario, you'd check if the main tree's root has changed
    // since the transaction began.
    const tree = await this.getTree();
    const txRoot = tx.tree.root;
    // This is not a great way to do this. The tree should probably be managed by the database.
    this.tree = await ProllyTree.load(txRoot, this.blockManager);
  }
}

export class ZgTransaction {
  public tree: ProllyTree;
  private writeCache: Map<string, Uint8Array> = new Map();

  constructor(private db: ZgDatabase, tree: ProllyTree) {
    this.tree = tree;
  }

  get<T extends Table & { id(): string }, TNode extends ZgBaseNode<T>>(
    entityName: string,
    id: string,
    nodeFactory: (
      tx: ZgTransaction,
      fbb: T,
      ac: ZgAuthContext<any> | null
    ) => TNode,
    getRootAs: (byteBuffer: ByteBuffer) => T,
    authContext: ZgAuthContext | null
  ): TNode | null {
    const key = ZgDatabase.textToKey(`${entityName}:${id}`);
    const keyStr = decoder.decode(key);

    if (this.writeCache.has(keyStr)) {
      const data = this.writeCache.get(keyStr)!;
      const byteBuffer = new ByteBuffer(data);
      const table = getRootAs(byteBuffer);
      return nodeFactory(this, table, authContext);
    }

    const data = this.tree.getSync(key);
    if (!data) {
      return null;
    }
    const byteBuffer = new ByteBuffer(data);
    const table = getRootAs(byteBuffer);
    return nodeFactory(this, table, authContext);
  }

  put(entityName: string, id: string, data: Uint8Array): void {
    const key = ZgDatabase.textToKey(`${entityName}:${id}`);
    const keyStr = decoder.decode(key);
    this.writeCache.set(keyStr, data);
  }

  *scan(
    startKey: Uint8Array,
    endKey: Uint8Array
  ): Generator<[Uint8Array, Uint8Array]> {
    // This implementation merges the write cache with the tree scan.
    const treeScanner = this.tree.scanSync({
      start: { key: startKey, inclusive: true },
      end: { key: endKey, inclusive: false },
    });

    const cacheEntries = Array.from(this.writeCache.entries()).map(
      ([keyStr, value]) =>
        [encoder.encode(keyStr), value] as [Uint8Array, Uint8Array]
    );

    const filteredCache = cacheEntries.filter(
      ([key]) => compare(key, startKey) >= 0 && compare(key, endKey) < 0
    );

    // Simple merge logic: iterate through both sorted sources
    let treeResult = treeScanner.next();
    let cacheIndex = 0;

    while (!treeResult.done || cacheIndex < filteredCache.length) {
      const treeItem = treeResult.done ? null : treeResult.value;
      const cacheItem =
        cacheIndex < filteredCache.length ? filteredCache[cacheIndex] : null;

      if (treeItem && cacheItem) {
        const cmp = compare(treeItem[0], cacheItem[0]);
        if (cmp < 0) {
          yield treeItem;
          treeResult = treeScanner.next();
        } else if (cmp > 0) {
          yield cacheItem;
          cacheIndex++;
        } else {
          // Key exists in both, cache wins.
          yield cacheItem;
          treeResult = treeScanner.next();
          cacheIndex++;
        }
      } else if (treeItem) {
        yield treeItem;
        treeResult = treeScanner.next();
      } else if (cacheItem) {
        yield cacheItem;
        cacheIndex++;
      }
    }
  }

  async commit(): Promise<void> {
    for (const [keyStr, value] of this.writeCache.entries()) {
      const key = encoder.encode(keyStr);
      await this.tree.put(key, value);
    }
    await this.db.commitTransaction(this);
  }
}

export function createClient(options: any) {
  // TODO: This should return the generated ZgClient, not the base DB
  // For now, this is just a placeholder. The real implementation will
  // be generated into the schema.zg.ts file.
  return new ZgDatabase(options);
}
