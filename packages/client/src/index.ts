// The high-level ZG client runtime will be implemented here.

import { Table } from "flatbuffers";

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

// The ZgDatabase class is a placeholder for the actual storage engine.
// In a real application, this would interact with a database like Prolly Trees.
export class ZgDatabase {
  private store = new Map<string, any>();
  private config: any;

  constructor(options?: any) {
    // In the future, options could contain storage paths, etc.
    this.config = options;
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

  async get<T extends Table, TNode extends ZgBaseNode<T>>(
    entityName: string,
    id: string,
    nodeFactory: (db: ZgDatabase, fbb: T, ac: ZgAuthContext | null) => TNode
  ): Promise<TNode | null> {
    console.log(`Getting ${entityName} with id ${id}`);
    const data = this.store.get(`${entityName}:${id}`);
    if (!data) {
      return null;
    }
    const mockFbb = new Proxy({} as any, {
      get: (_, prop: string) => () => data[prop],
    }) as T;
    const node = nodeFactory(this, mockFbb, null);
    return this._createNodeProxy(node);
  }

  async getRaw(entityName: string, id: string): Promise<any | null> {
    console.log(`Getting raw ${entityName} with id ${id}`);
    return this.store.get(`${entityName}:${id}`) ?? null;
  }

  create<T extends Table, TNode extends ZgBaseNode<T>>(
    entityName: string,
    data: any,
    nodeFactory: (db: ZgDatabase, fbb: T, ac: ZgAuthContext | null) => TNode
  ): TNode {
    console.log(`Creating ${entityName} with data`, data);
    if (!data.id) throw new Error("Mock DB requires data to have an id");
    this.store.set(`${entityName}:${data.id}`, data);

    // Fire-and-forget persistence
    (async () => {
      // In a real implementation, this would serialize `data` to a Flatbuffer
      // and write it to the Prolly Tree store.
      // For the mock, we can just log it.
      console.log(`(Background) Persisting ${entityName}:${data.id}`);
    })();

    const mockFbb = new Proxy({} as any, {
      get: (_, prop: string) => () => data[prop],
    }) as T;
    const node = nodeFactory(this, mockFbb, null);
    return this._createNodeProxy(node);
  }

  update<T extends Table, TNode extends ZgBaseNode<T>>(
    entityName: string,
    id: string,
    data: any,
    nodeFactory: (db: ZgDatabase, fbb: T, ac: ZgAuthContext | null) => TNode
  ): TNode {
    console.log(`Updating ${entityName} with id ${id} and data`, data);
    const key = `${entityName}:${id}`;
    const existing = this.store.get(key);
    if (!existing) throw new Error(`Record not found for update: ${key}`);
    const updated = { ...existing, ...data };
    this.store.set(key, updated);

    // Fire-and-forget persistence
    (async () => {
      console.log(`(Background) Persisting update for ${entityName}:${id}`);
    })();

    const mockFbb = new Proxy({} as any, {
      get: (_, prop: string) => () => updated[prop],
    }) as T;
    const node = nodeFactory(this, mockFbb, null);
    return this._createNodeProxy(node);
  }

  async delete(entityName: string, id: string): Promise<void> {
    console.log(`Deleting ${entityName} with id ${id}`);
    this.store.delete(`${entityName}:${id}`);
  }
}

export function createClient(options: any) {
  // TODO: This should return the generated ZgClient, not the base DB
  // For now, this is just a placeholder. The real implementation will
  // be generated into the schema.zg.ts file.
  console.log("Client created with options:", options);
  return new ZgDatabase(options);
}
