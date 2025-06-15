import schema from './graph-schema.js';
import type { CustomerData, ProductData, OrderData, LineItemData } from './generated-serializers.js';
import { uuidv7 as uuid } from 'uuidv7';
import { produce, Draft } from 'immer';

// ============================================
//  Create Node Data Helpers
// ============================================

export const createNodeData = {
  customer: (data: { fields: CustomerData['fields'], relationIds: CustomerData['relationIds'] }): CustomerData => ({
    id: uuid(),
    type: 'customer',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    fields: schema.customer.fields.parse(data.fields),
    relationIds: data.relationIds,
  }),
  product: (data: { fields: ProductData['fields'], relationIds: ProductData['relationIds'] }): ProductData => ({
    id: uuid(),
    type: 'product',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    fields: schema.product.fields.parse(data.fields),
    relationIds: data.relationIds,
  }),
  order: (data: { fields: OrderData['fields'], relationIds: OrderData['relationIds'] }): OrderData => ({
    id: uuid(),
    type: 'order',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    fields: schema.order.fields.parse(data.fields),
    relationIds: data.relationIds,
  }),
  lineItem: (data: { fields: LineItemData['fields'], relationIds: LineItemData['relationIds'] }): LineItemData => ({
    id: uuid(),
    type: 'lineItem',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    fields: schema.lineItem.fields.parse(data.fields),
    relationIds: data.relationIds,
  })
};

// ============================================
//  Update Node Data Helpers (with Immer)
// ============================================

export const updateNodeData = {
  customer: (
    node: CustomerData,
    recipe: (draft: Draft<CustomerData>) => void
  ): CustomerData => {
    const updatedNode = produce(node, draft => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });

    // After mutation, validate the final fields object to ensure consistency.
    const validatedFields = schema.customer.fields.parse(updatedNode.fields);
    
    return {
      ...updatedNode,
      fields: validatedFields,
    };
  },
  product: (
    node: ProductData,
    recipe: (draft: Draft<ProductData>) => void
  ): ProductData => {
    const updatedNode = produce(node, draft => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });

    // After mutation, validate the final fields object to ensure consistency.
    const validatedFields = schema.product.fields.parse(updatedNode.fields);
    
    return {
      ...updatedNode,
      fields: validatedFields,
    };
  },
  order: (
    node: OrderData,
    recipe: (draft: Draft<OrderData>) => void
  ): OrderData => {
    const updatedNode = produce(node, draft => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });

    // After mutation, validate the final fields object to ensure consistency.
    const validatedFields = schema.order.fields.parse(updatedNode.fields);
    
    return {
      ...updatedNode,
      fields: validatedFields,
    };
  },
  lineItem: (
    node: LineItemData,
    recipe: (draft: Draft<LineItemData>) => void
  ): LineItemData => {
    const updatedNode = produce(node, draft => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });

    // After mutation, validate the final fields object to ensure consistency.
    const validatedFields = schema.lineItem.fields.parse(updatedNode.fields);
    
    return {
      ...updatedNode,
      fields: validatedFields,
    };
  }
};
