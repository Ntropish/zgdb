import schema from './graph-schema.js';
import type { UserData, FamiliarData, PostData, TagData } from './generated-serializers.js';
import { uuidv7 as uuid } from 'uuidv7';
import { produce, Draft } from 'immer';

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
//  Update Node Data Helpers (with Immer)
// ============================================

export const updateNodeData = {
  user: (
    node: UserData,
    recipe: (draft: Draft<UserData>) => void
  ): UserData => {
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
  familiar: (
    node: FamiliarData,
    recipe: (draft: Draft<FamiliarData>) => void
  ): FamiliarData => {
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
  post: (
    node: PostData,
    recipe: (draft: Draft<PostData>) => void
  ): PostData => {
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
  tag: (
    node: TagData,
    recipe: (draft: Draft<TagData>) => void
  ): TagData => {
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
