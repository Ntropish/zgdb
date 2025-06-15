import schema from './graph-schema.js';
import { uuidv7 as uuid } from 'uuidv7';
import { produce } from 'immer';
// ============================================
//  Create Node Data Helpers
// ============================================
export const createNodeData = {
    customer: (data) => ({
        id: uuid(),
        type: 'customer',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        fields: schema.customer.fields.parse(data.fields),
        relationIds: data.relationIds,
    }),
    product: (data) => ({
        id: uuid(),
        type: 'product',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        fields: schema.product.fields.parse(data.fields),
        relationIds: data.relationIds,
    }),
    order: (data) => ({
        id: uuid(),
        type: 'order',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        fields: schema.order.fields.parse(data.fields),
        relationIds: data.relationIds,
    }),
    lineItem: (data) => ({
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
    customer: (node, recipe) => {
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
    product: (node, recipe) => {
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
    order: (node, recipe) => {
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
    lineItem: (node, recipe) => {
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
