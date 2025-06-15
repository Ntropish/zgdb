/**
 * @file packages/runtime/src/client.ts
 * @description A type-safe, store-agnostic database client with transaction support.
 */
import type { Draft } from "immer";
import { KeyEncoder } from "./key-encoder.js";

// ===========================================
//  Async Store & Client
// ===========================================

export interface StoreAdapter {
  get(key: string): Promise<Uint8Array | undefined>;
  set(key: string, value: Uint8Array): Promise<void>;
  transact<T>(
    updateFn: (transactionCtx: {
      get: (key: string) => Promise<Uint8Array | undefined>;
      set: (key: string, value: Uint8Array) => void;
    }) => Promise<T>
  ): Promise<T>;
}

export type TransactionClient<NodeDataMap extends Record<string, any>> = {
  getNode<T extends keyof NodeDataMap>(
    nodeType: T,
    nodeId: string
  ): Promise<NodeDataMap[T] | undefined>;
  createNode<T extends keyof NodeDataMap>(
    nodeType: T,
    data: {
      fields: NodeDataMap[T]["fields"];
      relationIds: NodeDataMap[T]["relationIds"];
    }
  ): Promise<NodeDataMap[T]>;
  updateNode<T extends keyof NodeDataMap>(
    nodeType: T,
    nodeId: string,
    recipe: (draft: Draft<NodeDataMap[T]>) => void
  ): Promise<NodeDataMap[T]>;
};

// ===========================================
//  Sync Store & Client
// ===========================================

export interface SyncStoreAdapter {
  get(key: string): Uint8Array | undefined;
  set(key: string, value: Uint8Array): void;
  transactSync<T>(
    updateFn: (transactionCtx: {
      get(key: string): Uint8Array | undefined;
      set(key: string, value: Uint8Array): void;
    }) => T
  ): T;
}

export type TransactionClientSync<NodeDataMap extends Record<string, any>> = {
  getNode<T extends keyof NodeDataMap>(
    nodeType: T,
    nodeId: string
  ): NodeDataMap[T] | undefined;
  createNode<T extends keyof NodeDataMap>(
    nodeType: T,
    data: {
      fields: NodeDataMap[T]["fields"];
      relationIds: NodeDataMap[T]["relationIds"];
    }
  ): NodeDataMap[T];
  updateNode<T extends keyof NodeDataMap>(
    nodeType: T,
    nodeId: string,
    recipe: (draft: Draft<NodeDataMap[T]>) => void
  ): NodeDataMap[T];
};

// ===========================================
//  Client Factories
// ===========================================

export function createAsyncClient<NodeDataMap extends Record<string, any>>(
  store: StoreAdapter,
  helpers: {
    serializeNode: any;
    deserializeNode: any;
    createNodeData: any;
    updateNodeData: any;
  }
) {
  const { serializeNode, deserializeNode, createNodeData, updateNodeData } =
    helpers;

  const createTxClient = (txStore: {
    get: (key: string) => Promise<Uint8Array | undefined>;
    set: (key: string, value: Uint8Array) => void;
  }): TransactionClient<NodeDataMap> => {
    const txCache = new Map<string, any>();

    const client: TransactionClient<NodeDataMap> = {
      async getNode<T extends keyof NodeDataMap>(nodeType: T, nodeId: string) {
        const key = KeyEncoder.nodeKey(nodeType as string, nodeId).toString();
        if (txCache.has(key)) return txCache.get(key);

        const buffer = await txStore.get(key);
        if (!buffer) return undefined;

        const node = deserializeNode[nodeType as string](buffer);
        txCache.set(key, node);
        return node;
      },
      async createNode<T extends keyof NodeDataMap>(
        nodeType: T,
        data: {
          fields: NodeDataMap[T]["fields"];
          relationIds: NodeDataMap[T]["relationIds"];
        }
      ) {
        const node = createNodeData[nodeType as string](data);
        const key = KeyEncoder.nodeKey(nodeType as string, node.id).toString();
        const buffer = serializeNode[nodeType as string](node);

        txCache.set(key, node);
        txStore.set(key, buffer);
        return node;
      },
      async updateNode<T extends keyof NodeDataMap>(
        nodeType: T,
        nodeId: string,
        recipe: (draft: Draft<NodeDataMap[T]>) => void
      ) {
        const existingNode = await client.getNode(nodeType, nodeId);
        if (!existingNode) {
          throw new Error(
            `Node ${nodeType as string}:${nodeId} not found for update.`
          );
        }
        const updatedNode = updateNodeData[nodeType as string](
          existingNode,
          recipe
        );
        const key = KeyEncoder.nodeKey(nodeType as string, nodeId).toString();
        const buffer = serializeNode[nodeType as string](updatedNode);

        txCache.set(key, updatedNode);
        txStore.set(key, buffer);
        return updatedNode;
      },
    };
    return client;
  };

  return {
    transact: async <T>(
      recipe: (tx: TransactionClient<NodeDataMap>) => Promise<T>
    ): Promise<T> => {
      return store.transact(async (txStore) => {
        const txClient = createTxClient(txStore);
        return recipe(txClient);
      });
    },
  };
}

export function createSyncClient<NodeDataMap extends Record<string, any>>(
  store: SyncStoreAdapter,
  helpers: {
    serializeNode: any;
    deserializeNode: any;
    createNodeDataSync: any;
    updateNodeDataSync: any;
  }
) {
  const {
    serializeNode,
    deserializeNode,
    createNodeDataSync,
    updateNodeDataSync,
  } = helpers;

  const createTxClientSync = (txStore: {
    get: (key: string) => Uint8Array | undefined;
    set: (key: string, value: Uint8Array) => void;
  }): TransactionClientSync<NodeDataMap> => {
    const txCache = new Map<string, any>();

    const client: TransactionClientSync<NodeDataMap> = {
      getNode<T extends keyof NodeDataMap>(nodeType: T, nodeId: string) {
        const key = KeyEncoder.nodeKey(nodeType as string, nodeId).toString();
        if (txCache.has(key)) return txCache.get(key);

        const buffer = txStore.get(key);
        if (!buffer) return undefined;

        const node = deserializeNode[nodeType as string](buffer);
        txCache.set(key, node);
        return node;
      },
      createNode<T extends keyof NodeDataMap>(
        nodeType: T,
        data: {
          fields: NodeDataMap[T]["fields"];
          relationIds: NodeDataMap[T]["relationIds"];
        }
      ) {
        const node = createNodeDataSync[nodeType as string](data);
        const key = KeyEncoder.nodeKey(nodeType as string, node.id).toString();
        const buffer = serializeNode[nodeType as string](node);

        txCache.set(key, node);
        txStore.set(key, buffer);
        return node;
      },
      updateNode<T extends keyof NodeDataMap>(
        nodeType: T,
        nodeId: string,
        recipe: (draft: Draft<NodeDataMap[T]>) => void
      ) {
        const existingNode = client.getNode(nodeType, nodeId);
        if (!existingNode) {
          throw new Error(
            `Node ${nodeType as string}:${nodeId} not found for update.`
          );
        }
        const updatedNode = updateNodeDataSync[nodeType as string](
          existingNode,
          recipe
        );
        const key = KeyEncoder.nodeKey(nodeType as string, nodeId).toString();
        const buffer = serializeNode[nodeType as string](updatedNode);

        txCache.set(key, updatedNode);
        txStore.set(key, buffer);
        return updatedNode;
      },
    };
    return client;
  };

  return {
    transactSync: <T>(
      recipe: (tx: TransactionClientSync<NodeDataMap>) => T
    ): T => {
      return store.transactSync((txStore) => {
        const txClient = createTxClientSync(txStore);
        return recipe(txClient);
      });
    },
  };
}
