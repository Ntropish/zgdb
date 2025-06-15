import { produce } from 'immer';
import { ulid } from 'ulid';
// --- Async Helpers ---
export const createNodeData = {
    portfolio: (data) => {
        const now = Date.now();
        return {
            id: ulid(),
            type: 'portfolio',
            createdAt: now,
            updatedAt: now,
            fields: data.fields,
            relationIds: data.relationIds,
        };
    },
    stock: (data) => {
        const now = Date.now();
        return {
            id: ulid(),
            type: 'stock',
            createdAt: now,
            updatedAt: now,
            fields: data.fields,
            relationIds: data.relationIds,
        };
    },
    holding: (data) => {
        const now = Date.now();
        return {
            id: ulid(),
            type: 'holding',
            createdAt: now,
            updatedAt: now,
            fields: data.fields,
            relationIds: data.relationIds,
        };
    },
    trade: (data) => {
        const now = Date.now();
        return {
            id: ulid(),
            type: 'trade',
            createdAt: now,
            updatedAt: now,
            fields: data.fields,
            relationIds: data.relationIds,
        };
    },
};
export const updateNodeData = {
    portfolio: (base, recipe) => {
        return produce(base, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
    },
    stock: (base, recipe) => {
        return produce(base, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
    },
    holding: (base, recipe) => {
        return produce(base, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
    },
    trade: (base, recipe) => {
        return produce(base, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
    },
};
// --- Sync Helpers ---
export const createNodeDataSync = {
    portfolio: (data) => {
        const now = Date.now();
        return {
            id: ulid(),
            type: 'portfolio',
            createdAt: now,
            updatedAt: now,
            fields: data.fields,
            relationIds: data.relationIds,
        };
    },
    stock: (data) => {
        const now = Date.now();
        return {
            id: ulid(),
            type: 'stock',
            createdAt: now,
            updatedAt: now,
            fields: data.fields,
            relationIds: data.relationIds,
        };
    },
    holding: (data) => {
        const now = Date.now();
        return {
            id: ulid(),
            type: 'holding',
            createdAt: now,
            updatedAt: now,
            fields: data.fields,
            relationIds: data.relationIds,
        };
    },
    trade: (data) => {
        const now = Date.now();
        return {
            id: ulid(),
            type: 'trade',
            createdAt: now,
            updatedAt: now,
            fields: data.fields,
            relationIds: data.relationIds,
        };
    },
};
export const updateNodeDataSync = {
    portfolio: (base, recipe) => {
        return produce(base, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
    },
    stock: (base, recipe) => {
        return produce(base, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
    },
    holding: (base, recipe) => {
        return produce(base, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
    },
    trade: (base, recipe) => {
        return produce(base, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
    },
};
