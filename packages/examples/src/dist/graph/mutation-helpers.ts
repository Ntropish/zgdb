import schema from './graph-schema.js';
import type { UserData, FamiliarData, PostData, TagData } from './generated-serializers.js';
import { uuidv7 as uuid } from 'uuidv7';

// ============================================
//  Create Node Data Helpers
// ============================================

export const createNodeData = {
  user: (data: { fields: UserData['fields'], relationIds: UserData['relationIds'] }): UserData => ({
    id: uuid(),
    type: 'user',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    fields: schema.user.fields.parse(data.fields),
    relationIds: data.relationIds,
  }),
  familiar: (data: { fields: FamiliarData['fields'], relationIds: FamiliarData['relationIds'] }): FamiliarData => ({
    id: uuid(),
    type: 'familiar',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    fields: schema.familiar.fields.parse(data.fields),
    relationIds: data.relationIds,
  }),
  post: (data: { fields: PostData['fields'], relationIds: PostData['relationIds'] }): PostData => ({
    id: uuid(),
    type: 'post',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    fields: schema.post.fields.parse(data.fields),
    relationIds: data.relationIds,
  }),
  tag: (data: { fields: TagData['fields'], relationIds: TagData['relationIds'] }): TagData => ({
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
  user: (
    node: UserData,
    updates: Partial<{ fields: Partial<UserData['fields']>, relationIds: Partial<UserData['relationIds']> }>
  ): UserData => {
    const newFields = { ...node.fields, ...updates.fields };
    const newRelations = { ...node.relationIds, ...updates.relationIds };
    
    return {
      ...node,
      fields: schema.user.fields.parse(newFields),
      relationIds: newRelations,
      updatedAt: Date.now(),
    }
  },
  familiar: (
    node: FamiliarData,
    updates: Partial<{ fields: Partial<FamiliarData['fields']>, relationIds: Partial<FamiliarData['relationIds']> }>
  ): FamiliarData => {
    const newFields = { ...node.fields, ...updates.fields };
    const newRelations = { ...node.relationIds, ...updates.relationIds };
    
    return {
      ...node,
      fields: schema.familiar.fields.parse(newFields),
      relationIds: newRelations,
      updatedAt: Date.now(),
    }
  },
  post: (
    node: PostData,
    updates: Partial<{ fields: Partial<PostData['fields']>, relationIds: Partial<PostData['relationIds']> }>
  ): PostData => {
    const newFields = { ...node.fields, ...updates.fields };
    const newRelations = { ...node.relationIds, ...updates.relationIds };
    
    return {
      ...node,
      fields: schema.post.fields.parse(newFields),
      relationIds: newRelations,
      updatedAt: Date.now(),
    }
  },
  tag: (
    node: TagData,
    updates: Partial<{ fields: Partial<TagData['fields']>, relationIds: Partial<TagData['relationIds']> }>
  ): TagData => {
    const newFields = { ...node.fields, ...updates.fields };
    const newRelations = { ...node.relationIds, ...updates.relationIds };
    
    return {
      ...node,
      fields: schema.tag.fields.parse(newFields),
      relationIds: newRelations,
      updatedAt: Date.now(),
    }
  }
};
