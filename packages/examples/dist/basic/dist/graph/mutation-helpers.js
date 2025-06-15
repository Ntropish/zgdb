import { produce } from 'immer';
import { ulid } from 'ulid';
// --- Async Helpers ---
export const createNodeData = {
    user: (data) => {
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
    familiar: (data) => {
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
    post: (data) => {
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
    tag: (data) => {
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
    user: (base, recipe) => {
        return produce(base, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
    },
    familiar: (base, recipe) => {
        return produce(base, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
    },
    post: (base, recipe) => {
        return produce(base, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
    },
    tag: (base, recipe) => {
        return produce(base, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
    },
};
// --- Sync Helpers ---
export const createNodeDataSync = {
    user: (data) => {
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
    familiar: (data) => {
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
    post: (data) => {
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
    tag: (data) => {
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
    user: (base, recipe) => {
        return produce(base, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
    },
    familiar: (base, recipe) => {
        return produce(base, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
    },
    post: (base, recipe) => {
        return produce(base, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
    },
    tag: (base, recipe) => {
        return produce(base, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
    },
};
