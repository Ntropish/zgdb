// The high-level ZG client runtime will be implemented here.

import { BlockManager, ProllyTree } from "@zgdb/prolly-tree";
import { Table, ByteBuffer } from "flatbuffers";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type ZgAuthContext<TActor = any> = {
  actor: TActor;
};

// This is the base class for all generated node types.
// It provides the link to the low-level Flatbuffers object.
export class ZgBaseNode<T extends Table & { id(): string }, TActor = any> {
  constructor(
    protected db: ZgDatabase,
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
    private db: ZgDatabase,
    private entityName: string,
    private nodeFactory: (
      db: ZgDatabase,
      fbb: T,
      ac: ZgAuthContext<any> | null
    ) => TNode,
    private getRootAs: (byteBuffer: ByteBuffer) => T,
    private authContext: ZgAuthContext | null
  ) {}

  get(id: string): TNode | null {
    return this.db.get(
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

    for (const [key, value] of this.db.scan(startKey, endKey)) {
      const byteBuffer = new ByteBuffer(value);
      const table = this.getRootAs(byteBuffer);
      yield this.nodeFactory(this.db, table, this.authContext);
    }
  }
}

// The ZgDatabase class is the storage engine.
export class ZgDatabase {
  private tree: ProllyTree;
  private config: any;

  public static textToKey(text: string): Uint8Array {
    return encoder.encode(text);
  }

  constructor(options?: any) {
    this.config = options;
    const blockManager = new BlockManager();
    this.tree = ProllyTree.createSync(blockManager);
  }

  private _getNodeName(node: ZgBaseNode<any, any>): string {
    // A bit of a hack to get the entity name from the node instance
    // e.g., "PostNode" -> "Post"
    const constructorName = node.constructor.name;
    return constructorName.endsWith("Node")
      ? constructorName.slice(0, -4)
      : constructorName;
  }

  get<T extends Table & { id(): string }, TNode extends ZgBaseNode<T>>(
    entityName: string,
    id: string,
    nodeFactory: (
      db: ZgDatabase,
      fbb: T,
      ac: ZgAuthContext<any> | null
    ) => TNode,
    getRootAs: (byteBuffer: ByteBuffer) => T,
    authContext: ZgAuthContext | null
  ): TNode | null {
    const key = ZgDatabase.textToKey(`${entityName}:${id}`);
    const data = this.tree.getSync(key);
    if (!data) {
      return null;
    }
    const byteBuffer = new ByteBuffer(data);
    const table = getRootAs(byteBuffer);
    return nodeFactory(this, table, authContext);
  }

  create<T extends Table & { id(): string }, TNode extends ZgBaseNode<T>>(
    entityName: string,
    id: string,
    data: Uint8Array,
    nodeFactory: (
      db: ZgDatabase,
      fbb: T,
      ac: ZgAuthContext<any> | null
    ) => TNode,
    getRootAs: (byteBuffer: ByteBuffer) => T,
    authContext: ZgAuthContext | null
  ): TNode {
    const key = ZgDatabase.textToKey(`${entityName}:${id}`);
    const { tree: newTree } = this.tree.putSync(key, data);
    this.tree = newTree;

    const byteBuffer = new ByteBuffer(data);
    const table = getRootAs(byteBuffer);
    return nodeFactory(this, table, authContext);
  }

  update(entityName: string, id: string, data: Uint8Array): void {
    const key = ZgDatabase.textToKey(`${entityName}:${id}`);
    const { tree: newTree } = this.tree.putSync(key, data);
    this.tree = newTree;
  }

  scan(
    startKey: Uint8Array,
    endKey: Uint8Array
  ): Generator<[Uint8Array, Uint8Array]> {
    return this.tree.scanSync(startKey, endKey);
  }
}

export function createClient(options: any) {
  // TODO: This should return the generated ZgClient, not the base DB
  // For now, this is just a placeholder. The real implementation will
  // be generated into the schema.zg.ts file.
  console.log("Client created with options:", options);
  return new ZgDatabase(options);
}
