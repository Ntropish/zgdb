import schema from './graph-schema.js';
import { uuidv7 as uuid } from 'uuidv7';
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
//  Update Node Data Helpers
// ============================================
export const updateNodeData = {
    user: (node, updates) => {
        const newFields = { ...node.fields, ...updates.fields };
        const newRelations = { ...node.relationIds, ...updates.relationIds };
        return {
            ...node,
            fields: schema.user.fields.parse(newFields),
            relationIds: newRelations,
            updatedAt: Date.now(),
        };
    },
    familiar: (node, updates) => {
        const newFields = { ...node.fields, ...updates.fields };
        const newRelations = { ...node.relationIds, ...updates.relationIds };
        return {
            ...node,
            fields: schema.familiar.fields.parse(newFields),
            relationIds: newRelations,
            updatedAt: Date.now(),
        };
    },
    post: (node, updates) => {
        const newFields = { ...node.fields, ...updates.fields };
        const newRelations = { ...node.relationIds, ...updates.relationIds };
        return {
            ...node,
            fields: schema.post.fields.parse(newFields),
            relationIds: newRelations,
            updatedAt: Date.now(),
        };
    },
    tag: (node, updates) => {
        const newFields = { ...node.fields, ...updates.fields };
        const newRelations = { ...node.relationIds, ...updates.relationIds };
        return {
            ...node,
            fields: schema.tag.fields.parse(newFields),
            relationIds: newRelations,
            updatedAt: Date.now(),
        };
    }
};
