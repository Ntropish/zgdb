import { produce, Draft } from 'immer';
import { ulid } from 'ulid';
import { z } from 'zod';
import GraphSchema from './graph-schema.js';
import type { UserData, FamiliarData, PostData, TagData } from './generated-serializers.js';


// --- Async Helpers ---
export const createNodeData = {
  user: (data: { fields: UserData['fields'], relationIds: UserData['relationIds'] }): UserData => {
    const now = Date.now();
    return {
      id: ulid(),
      type: 'user',
      createdAt: now,
      updatedAt: now,
      fields: data.fields,
      relationIds: data.relationIds,
    };
  },
  familiar: (data: { fields: FamiliarData['fields'], relationIds: FamiliarData['relationIds'] }): FamiliarData => {
    const now = Date.now();
    return {
      id: ulid(),
      type: 'familiar',
      createdAt: now,
      updatedAt: now,
      fields: data.fields,
      relationIds: data.relationIds,
    };
  },
  post: (data: { fields: PostData['fields'], relationIds: PostData['relationIds'] }): PostData => {
    const now = Date.now();
    return {
      id: ulid(),
      type: 'post',
      createdAt: now,
      updatedAt: now,
      fields: data.fields,
      relationIds: data.relationIds,
    };
  },
  tag: (data: { fields: TagData['fields'], relationIds: TagData['relationIds'] }): TagData => {
    const now = Date.now();
    return {
      id: ulid(),
      type: 'tag',
      createdAt: now,
      updatedAt: now,
      fields: data.fields,
      relationIds: data.relationIds,
    };
  },
};

export const updateNodeData = {
  user: (
    base: UserData,
    recipe: (draft: Draft<UserData>) => void
  ): UserData => {
    return produce(base, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
  },
  familiar: (
    base: FamiliarData,
    recipe: (draft: Draft<FamiliarData>) => void
  ): FamiliarData => {
    return produce(base, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
  },
  post: (
    base: PostData,
    recipe: (draft: Draft<PostData>) => void
  ): PostData => {
    return produce(base, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
  },
  tag: (
    base: TagData,
    recipe: (draft: Draft<TagData>) => void
  ): TagData => {
    return produce(base, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
  },
};


// --- Sync Helpers ---
export const createNodeDataSync = {
  user: (data: { fields: UserData['fields'], relationIds: UserData['relationIds'] }): UserData => {
    const now = Date.now();
    return {
      id: ulid(),
      type: 'user',
      createdAt: now,
      updatedAt: now,
      fields: data.fields,
      relationIds: data.relationIds,
    };
  },
  familiar: (data: { fields: FamiliarData['fields'], relationIds: FamiliarData['relationIds'] }): FamiliarData => {
    const now = Date.now();
    return {
      id: ulid(),
      type: 'familiar',
      createdAt: now,
      updatedAt: now,
      fields: data.fields,
      relationIds: data.relationIds,
    };
  },
  post: (data: { fields: PostData['fields'], relationIds: PostData['relationIds'] }): PostData => {
    const now = Date.now();
    return {
      id: ulid(),
      type: 'post',
      createdAt: now,
      updatedAt: now,
      fields: data.fields,
      relationIds: data.relationIds,
    };
  },
  tag: (data: { fields: TagData['fields'], relationIds: TagData['relationIds'] }): TagData => {
    const now = Date.now();
    return {
      id: ulid(),
      type: 'tag',
      createdAt: now,
      updatedAt: now,
      fields: data.fields,
      relationIds: data.relationIds,
    };
  },
};

export const updateNodeDataSync = {
  user: (
    base: UserData,
    recipe: (draft: Draft<UserData>) => void
  ): UserData => {
    return produce(base, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
  },
  familiar: (
    base: FamiliarData,
    recipe: (draft: Draft<FamiliarData>) => void
  ): FamiliarData => {
    return produce(base, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
  },
  post: (
    base: PostData,
    recipe: (draft: Draft<PostData>) => void
  ): PostData => {
    return produce(base, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
  },
  tag: (
    base: TagData,
    recipe: (draft: Draft<TagData>) => void
  ): TagData => {
    return produce(base, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
  },
};