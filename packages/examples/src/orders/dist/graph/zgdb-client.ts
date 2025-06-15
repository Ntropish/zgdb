import { KeyEncoder } from "@zgdb/runtime";
import {
  serializeNode,
  deserializeNode,
  supportedNodeTypes,
} from "./generated-serializers.js";
import { createNodeData, updateNodeData } from "./mutation-helpers.js";
import type {
  CustomerData,
  AddressData,
  WarehouseData,
  ProductData,
  CartData,
  OrderData,
  LineItemData,
  DiscountData,
  PaymentData,
  ShipmentData,
  NotificationData,
} from "./generated-serializers.js";
import type { Draft } from "immer";

// ============================================
//  Store Adapter Interface
// ============================================
export interface StoreAdapter {
  get(key: string): Promise<Uint8Array | undefined>;
  set(key: string, value: Uint8Array): Promise<void>;
  transact<T>(
    updateFn: (transactionCtx: {
      get(key: string): Promise<Uint8Array | undefined>;
      set(key: string, value: Uint8Array): void;
    }) => Promise<T>
  ): Promise<T>;
}

export type NodeDataTypeMap = {
  customer: CustomerData;
  address: AddressData;
  warehouse: WarehouseData;
  product: ProductData;
  cart: CartData;
  order: OrderData;
  lineItem: LineItemData;
  discount: DiscountData;
  payment: PaymentData;
  shipment: ShipmentData;
  notification: NotificationData;
};

type ClientNodeType = keyof NodeDataTypeMap;

export type TransactionClient = {
  getNode<T extends ClientNodeType>(
    nodeType: T,
    nodeId: string
  ): Promise<NodeDataTypeMap[T] | undefined>;
  createNode<T extends ClientNodeType>(
    nodeType: T,
    data: {
      fields: NodeDataTypeMap[T]["fields"];
      relationIds: NodeDataTypeMap[T]["relationIds"];
    }
  ): Promise<NodeDataTypeMap[T]>;
  updateNode<T extends ClientNodeType>(
    nodeType: T,
    nodeId: string,
    recipe: (draft: Draft<NodeDataTypeMap[T]>) => void
  ): Promise<NodeDataTypeMap[T]>;
};

// ============================================
//  Client Factory
// ============================================
export function createClient(store: StoreAdapter) {
  const createTxClient = (txStore: {
    get: (key: string) => Promise<Uint8Array | undefined>;
    set: (key: string, value: Uint8Array) => void;
  }): TransactionClient => {
    const txCache = new Map<string, any>();

    // This object now correctly implements the generic methods from TransactionClient
    return {
      async getNode<T extends ClientNodeType>(nodeType: T, nodeId: string) {
        console.log(`[[GET NODE]] ${nodeType}:${nodeId}`);
        const key = KeyEncoder.nodeKey(nodeType, nodeId).toString();
        if (txCache.has(key)) return txCache.get(key);

        const buffer = await txStore.get(key);
        if (!buffer) return undefined;

        const node = (deserializeNode as any)[nodeType](buffer);

        console.log(`[[GET NODE:result]] ${nodeType}:${nodeId}`, node);
        txCache.set(key, node);
        return node;
      },
      async createNode<T extends ClientNodeType>(
        nodeType: T,
        data: {
          fields: NodeDataTypeMap[T]["fields"];
          relationIds: NodeDataTypeMap[T]["relationIds"];
        }
      ) {
        console.log(`[[CREATE NODE]] ${nodeType}`, data);
        const node = (createNodeData as any)[nodeType](data);
        const key = KeyEncoder.nodeKey(nodeType, node.id).toString();
        const buffer = (serializeNode as any)[nodeType](node);

        txCache.set(key, node);
        txStore.set(key, buffer);
        return node;
      },
      async updateNode<T extends ClientNodeType>(
        nodeType: T,
        nodeId: string,
        recipe: (draft: Draft<NodeDataTypeMap[T]>) => void
      ) {
        console.log(`[[UPDATE NODE]] ${nodeType}:${nodeId}`);
        const existingNode = await this.getNode(nodeType, nodeId);
        console.log(
          `[[UPDATE NODE:existingNode]] ${nodeType}:${nodeId}`,
          existingNode
        );
        if (!existingNode) {
          throw new Error(`Node ${nodeType}:${nodeId} not found for update.`);
        }
        const updatedNode = (updateNodeData as any)[nodeType](
          existingNode,
          recipe
        );
        console.log(
          `[[UPDATE NODE:updatedNode]] ${nodeType}:${nodeId}`,
          updatedNode
        );
        const key = KeyEncoder.nodeKey(nodeType, nodeId).toString();
        const buffer = (serializeNode as any)[nodeType](updatedNode);

        txCache.set(key, updatedNode);
        txStore.set(key, buffer);
        return updatedNode;
      },
    };
  };

  return {
    async transact<T>(
      recipe: (tx: TransactionClient) => Promise<T>
    ): Promise<T> {
      return store.transact(async (txStore) => {
        const txClient = createTxClient(txStore);
        return recipe(txClient);
      });
    },
  };
}
