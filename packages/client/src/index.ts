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
export class ZgBaseNode<T extends Table, TActor = any> {
  constructor(
    protected db: ZgDatabase,
    public fbb: T,
    public authContext: ZgAuthContext<TActor> | null
  ) {}
}

// The ZgDatabase class is the storage engine.
export class ZgDatabase {
  private tree: ProllyTree;
  private config: any;

  private static textToKey(text: string): Uint8Array {
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

  private _createNodeProxy<TNode extends ZgBaseNode<any, any>>(
    node: TNode
  ): TNode {
    const entityName = this._getNodeName(node);
    const entityResolvers = this.config.entityResolvers?.[entityName] ?? {};
    const globalResolvers = this.config.globalResolvers ?? {};
    const allResolverNames = new Set([
      ...Object.keys(entityResolvers),
      ...Object.keys(globalResolvers),
    ]);

    return new Proxy(node, {
      get: (target, prop, receiver) => {
        // If the property is on the node itself, return it
        if (Reflect.has(target, prop)) {
          return Reflect.get(target, prop, receiver);
        }

        // If it's a known resolver, resolve it
        if (typeof prop === "string" && allResolverNames.has(prop)) {
          const resolver = entityResolvers[prop] ?? globalResolvers[prop];
          return resolver({
            actor: node.authContext?.actor,
            db: this,
            node: target,
          });
        }

        return undefined;
      },
    });
  }

  get<T extends Table, TNode extends ZgBaseNode<T>>(
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
    const node = nodeFactory(this, table, authContext);
    return this._createNodeProxy(node);
  }

  create<T extends Table, TNode extends ZgBaseNode<T>>(
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
    const node = nodeFactory(this, table, authContext);
    return this._createNodeProxy(node);
  }

  update<T extends Table, TNode extends ZgBaseNode<T>>(
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
    const node = nodeFactory(this, table, authContext);
    return this._createNodeProxy(node);
  }
}

export function createClient(options: any) {
  // TODO: This should return the generated ZgClient, not the base DB
  // For now, this is just a placeholder. The real implementation will
  // be generated into the schema.zg.ts file.
  console.log("Client created with options:", options);
  return new ZgDatabase(options);
}
