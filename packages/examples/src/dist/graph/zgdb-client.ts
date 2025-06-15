import { KeyEncoder } from '@zgdb/runtime';
import { serializeNode, deserializeNode, supportedNodeTypes } from './generated-serializers.js';
import { createNodeData, updateNodeData } from './mutation-helpers.js';
import type { UserData, FamiliarData, PostData, TagData } from './generated-serializers.js';
import type { Draft } from 'immer';

// ============================================
//  Store Adapter Interface
// ============================================
/**
 * Defines the contract for any storage backend. Implement this interface
 * to connect the ZGDB client to your chosen database (e.g., Map, LevelDB, IndexedDB).
 */
export interface StoreAdapter {
  get(key: string): Promise<Uint8Array | undefined>;
  set(key: string, value: Uint8Array): Promise<void>;
}

type ClientNodeType = (typeof supportedNodeTypes)[number];
type NodeDataType<T extends ClientNodeType> = T extends 'user' ? UserData : T extends 'post' ? PostData : T extends 'tag' ? TagData : T extends 'familiar' ? FamiliarData : never;

// ============================================
//  Client Factory
// ============================================
export function createClient(store: StoreAdapter) {
  return {
    /**
     * Creates a new node, serializes it, and saves it to the store.
     */
    async createNode<T extends ClientNodeType>(
      nodeType: T,
      data: { fields: NodeDataType<T>['fields'], relationIds: NodeDataType<T>['relationIds'] }
    ): Promise<NodeDataType<T>> {
      const node = createNodeData[nodeType](data as any);
      const key = KeyEncoder.nodeKey(nodeType, node.id).toString();
      const buffer = serializeNode[nodeType](node as any);
      await store.set(key, buffer);
      return node as NodeDataType<T>;
    },

    /**
     * Retrieves and deserializes a node from the store.
     */
    async getNode<T extends ClientNodeType>(nodeType: T, nodeId: string): Promise<NodeDataType<T> | undefined> {
      const key = KeyEncoder.nodeKey(nodeType, nodeId).toString();
      const buffer = await store.get(key);
      if (!buffer) return undefined;
      return deserializeNode[nodeType](buffer) as NodeDataType<T>;
    },

    /**
     * Atomically retrieves, updates, and saves a node.
     */
    async updateNode<T extends ClientNodeType>(
      nodeType: T,
      nodeId: string,
      recipe: (draft: Draft<NodeDataType<T>>) => void
    ): Promise<NodeDataType<T>> {
      const key = KeyEncoder.nodeKey(nodeType, nodeId).toString();
      const existingBuffer = await store.get(key);
      if (!existingBuffer) {
        throw new Error(`Node with key ${key} not found for update.`);
      }

      const existingNode = deserializeNode[nodeType](existingBuffer) as NodeDataType<T>;
      const updatedNode = updateNodeData[nodeType](existingNode as any, recipe as any);
      const updatedBuffer = serializeNode[nodeType](updatedNode as any);

      await store.set(key, updatedBuffer);
      return updatedNode as NodeDataType<T>;
    }
  };
}