import { produce } from 'immer';
import { ulid } from 'ulid';
// --- Async Helpers ---
export const createNodeData = {
    customer: (data) => {
        const now = Date.now();
        return {
            id: ulid(),
            type: 'customer',
            createdAt: now,
            updatedAt: now,
            fields: data.fields,
            relationIds: data.relationIds,
        };
    },
    address: (data) => {
        const now = Date.now();
        return {
            id: ulid(),
            type: 'address',
            createdAt: now,
            updatedAt: now,
            fields: data.fields,
            relationIds: data.relationIds,
        };
    },
    warehouse: (data) => {
        const now = Date.now();
        return {
            id: ulid(),
            type: 'warehouse',
            createdAt: now,
            updatedAt: now,
            fields: data.fields,
            relationIds: data.relationIds,
        };
    },
    product: (data) => {
        const now = Date.now();
        return {
            id: ulid(),
            type: 'product',
            createdAt: now,
            updatedAt: now,
            fields: data.fields,
            relationIds: data.relationIds,
        };
    },
    cart: (data) => {
        const now = Date.now();
        return {
            id: ulid(),
            type: 'cart',
            createdAt: now,
            updatedAt: now,
            fields: data.fields,
            relationIds: data.relationIds,
        };
    },
    order: (data) => {
        const now = Date.now();
        return {
            id: ulid(),
            type: 'order',
            createdAt: now,
            updatedAt: now,
            fields: data.fields,
            relationIds: data.relationIds,
        };
    },
    lineItem: (data) => {
        const now = Date.now();
        return {
            id: ulid(),
            type: 'lineItem',
            createdAt: now,
            updatedAt: now,
            fields: data.fields,
            relationIds: data.relationIds,
        };
    },
    discount: (data) => {
        const now = Date.now();
        return {
            id: ulid(),
            type: 'discount',
            createdAt: now,
            updatedAt: now,
            fields: data.fields,
            relationIds: data.relationIds,
        };
    },
    payment: (data) => {
        const now = Date.now();
        return {
            id: ulid(),
            type: 'payment',
            createdAt: now,
            updatedAt: now,
            fields: data.fields,
            relationIds: data.relationIds,
        };
    },
    shipment: (data) => {
        const now = Date.now();
        return {
            id: ulid(),
            type: 'shipment',
            createdAt: now,
            updatedAt: now,
            fields: data.fields,
            relationIds: data.relationIds,
        };
    },
    notification: (data) => {
        const now = Date.now();
        return {
            id: ulid(),
            type: 'notification',
            createdAt: now,
            updatedAt: now,
            fields: data.fields,
            relationIds: data.relationIds,
        };
    },
};
export const updateNodeData = {
    customer: (base, recipe) => {
        return produce(base, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
    },
    address: (base, recipe) => {
        return produce(base, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
    },
    warehouse: (base, recipe) => {
        return produce(base, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
    },
    product: (base, recipe) => {
        return produce(base, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
    },
    cart: (base, recipe) => {
        return produce(base, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
    },
    order: (base, recipe) => {
        return produce(base, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
    },
    lineItem: (base, recipe) => {
        return produce(base, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
    },
    discount: (base, recipe) => {
        return produce(base, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
    },
    payment: (base, recipe) => {
        return produce(base, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
    },
    shipment: (base, recipe) => {
        return produce(base, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
    },
    notification: (base, recipe) => {
        return produce(base, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
    },
};
// --- Sync Helpers ---
export const createNodeDataSync = {
    customer: (data) => {
        const now = Date.now();
        return {
            id: ulid(),
            type: 'customer',
            createdAt: now,
            updatedAt: now,
            fields: data.fields,
            relationIds: data.relationIds,
        };
    },
    address: (data) => {
        const now = Date.now();
        return {
            id: ulid(),
            type: 'address',
            createdAt: now,
            updatedAt: now,
            fields: data.fields,
            relationIds: data.relationIds,
        };
    },
    warehouse: (data) => {
        const now = Date.now();
        return {
            id: ulid(),
            type: 'warehouse',
            createdAt: now,
            updatedAt: now,
            fields: data.fields,
            relationIds: data.relationIds,
        };
    },
    product: (data) => {
        const now = Date.now();
        return {
            id: ulid(),
            type: 'product',
            createdAt: now,
            updatedAt: now,
            fields: data.fields,
            relationIds: data.relationIds,
        };
    },
    cart: (data) => {
        const now = Date.now();
        return {
            id: ulid(),
            type: 'cart',
            createdAt: now,
            updatedAt: now,
            fields: data.fields,
            relationIds: data.relationIds,
        };
    },
    order: (data) => {
        const now = Date.now();
        return {
            id: ulid(),
            type: 'order',
            createdAt: now,
            updatedAt: now,
            fields: data.fields,
            relationIds: data.relationIds,
        };
    },
    lineItem: (data) => {
        const now = Date.now();
        return {
            id: ulid(),
            type: 'lineItem',
            createdAt: now,
            updatedAt: now,
            fields: data.fields,
            relationIds: data.relationIds,
        };
    },
    discount: (data) => {
        const now = Date.now();
        return {
            id: ulid(),
            type: 'discount',
            createdAt: now,
            updatedAt: now,
            fields: data.fields,
            relationIds: data.relationIds,
        };
    },
    payment: (data) => {
        const now = Date.now();
        return {
            id: ulid(),
            type: 'payment',
            createdAt: now,
            updatedAt: now,
            fields: data.fields,
            relationIds: data.relationIds,
        };
    },
    shipment: (data) => {
        const now = Date.now();
        return {
            id: ulid(),
            type: 'shipment',
            createdAt: now,
            updatedAt: now,
            fields: data.fields,
            relationIds: data.relationIds,
        };
    },
    notification: (data) => {
        const now = Date.now();
        return {
            id: ulid(),
            type: 'notification',
            createdAt: now,
            updatedAt: now,
            fields: data.fields,
            relationIds: data.relationIds,
        };
    },
};
export const updateNodeDataSync = {
    customer: (base, recipe) => {
        return produce(base, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
    },
    address: (base, recipe) => {
        return produce(base, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
    },
    warehouse: (base, recipe) => {
        return produce(base, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
    },
    product: (base, recipe) => {
        return produce(base, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
    },
    cart: (base, recipe) => {
        return produce(base, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
    },
    order: (base, recipe) => {
        return produce(base, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
    },
    lineItem: (base, recipe) => {
        return produce(base, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
    },
    discount: (base, recipe) => {
        return produce(base, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
    },
    payment: (base, recipe) => {
        return produce(base, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
    },
    shipment: (base, recipe) => {
        return produce(base, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
    },
    notification: (base, recipe) => {
        return produce(base, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
    },
};
