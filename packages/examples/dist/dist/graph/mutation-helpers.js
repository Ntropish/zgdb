import schema from './graph-schema.js';
import { uuidv7 as uuid } from 'uuidv7';
import { produce } from 'immer';
// ============================================
//  Create Node Data Helpers
// ============================================
export const createNodeData = {
    user: (data) => ({
        id: uuid(),
        type: 'user',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        fields: schema.user.fields.parse(data.fields),
        relationIds: data.relationIds,
    }),
    familiar: (data) => ({
        id: uuid(),
        type: 'familiar',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        fields: schema.familiar.fields.parse(data.fields),
        relationIds: data.relationIds,
    }),
    post: (data) => ({
        id: uuid(),
        type: 'post',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        fields: schema.post.fields.parse(data.fields),
        relationIds: data.relationIds,
    }),
    tag: (data) => ({
        id: uuid(),
        type: 'tag',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        fields: schema.tag.fields.parse(data.fields),
        relationIds: data.relationIds,
    })
};
// ============================================
//  Update Node Data Helpers (with Immer)
// ============================================
export const updateNodeData = {
    user: (node, recipe) => {
        const updatedNode = produce(node, draft => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
        // After mutation, validate the final fields object to ensure consistency.
        const validatedFields = schema.user.fields.parse(updatedNode.fields);
        return {
            ...updatedNode,
            fields: validatedFields,
        };
    },
    familiar: (node, recipe) => {
        const updatedNode = produce(node, draft => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
        // After mutation, validate the final fields object to ensure consistency.
        const validatedFields = schema.familiar.fields.parse(updatedNode.fields);
        return {
            ...updatedNode,
            fields: validatedFields,
        };
    },
    post: (node, recipe) => {
        const updatedNode = produce(node, draft => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
        // After mutation, validate the final fields object to ensure consistency.
        const validatedFields = schema.post.fields.parse(updatedNode.fields);
        return {
            ...updatedNode,
            fields: validatedFields,
        };
    },
    tag: (node, recipe) => {
        const updatedNode = produce(node, draft => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
        // After mutation, validate the final fields object to ensure consistency.
        const validatedFields = schema.tag.fields.parse(updatedNode.fields);
        return {
            ...updatedNode,
            fields: validatedFields,
        };
    }
};
