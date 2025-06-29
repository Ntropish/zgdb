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
    protected authContext: ZgAuthContext<TActor> | null
  ) {}
}

// The ZgDatabase class is a placeholder for the actual storage engine.
// In a real application, this would interact with a database like Prolly Trees.
export class ZgDatabase {
  private store = new Map<string, any>();

  constructor(options?: any) {
    // In the future, options could contain storage paths, etc.
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
    return nodeFactory(this, mockFbb, null);
  }

  async getRaw(entityName: string, id: string): Promise<any | null> {
    console.log(`Getting raw ${entityName} with id ${id}`);
    return this.store.get(`${entityName}:${id}`) ?? null;
  }

  async create<T extends Table, TNode extends ZgBaseNode<T>>(
    entityName: string,
    data: any,
    nodeFactory: (db: ZgDatabase, fbb: T, ac: ZgAuthContext | null) => TNode
  ): Promise<TNode> {
    console.log(`Creating ${entityName} with data`, data);
    if (!data.id) throw new Error("Mock DB requires data to have an id");
    this.store.set(`${entityName}:${data.id}`, data);
    const mockFbb = new Proxy({} as any, {
      get: (_, prop: string) => () => data[prop],
    }) as T;
    return nodeFactory(this, mockFbb, null);
  }

  async update<T extends Table, TNode extends ZgBaseNode<T>>(
    entityName: string,
    id: string,
    data: any,
    nodeFactory: (db: ZgDatabase, fbb: T, ac: ZgAuthContext | null) => TNode
  ): Promise<TNode> {
    console.log(`Updating ${entityName} with id ${id} and data`, data);
    const key = `${entityName}:${id}`;
    const existing = this.store.get(key);
    if (!existing) throw new Error(`Record not found for update: ${key}`);
    const updated = { ...existing, ...data };
    this.store.set(key, updated);
    const mockFbb = new Proxy({} as any, {
      get: (_, prop: string) => () => updated[prop],
    }) as T;
    return nodeFactory(this, mockFbb, null);
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
