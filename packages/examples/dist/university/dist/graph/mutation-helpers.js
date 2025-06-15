import { produce } from '@zgdb/runtime';
import { ulid } from '@zgdb/runtime';
// --- Async Helpers ---
export const createNodeData = {
    department: (data) => {
        const now = Date.now();
        return {
            id: ulid(),
            type: 'department',
            createdAt: now,
            updatedAt: now,
            fields: data.fields,
            relationIds: data.relationIds,
        };
    },
    professor: (data) => {
        const now = Date.now();
        return {
            id: ulid(),
            type: 'professor',
            createdAt: now,
            updatedAt: now,
            fields: data.fields,
            relationIds: data.relationIds,
        };
    },
    student: (data) => {
        const now = Date.now();
        return {
            id: ulid(),
            type: 'student',
            createdAt: now,
            updatedAt: now,
            fields: data.fields,
            relationIds: data.relationIds,
        };
    },
    course: (data) => {
        const now = Date.now();
        return {
            id: ulid(),
            type: 'course',
            createdAt: now,
            updatedAt: now,
            fields: data.fields,
            relationIds: data.relationIds,
        };
    },
    enrollment: (data) => {
        const now = Date.now();
        return {
            id: ulid(),
            type: 'enrollment',
            createdAt: now,
            updatedAt: now,
            fields: data.fields,
            relationIds: data.relationIds,
        };
    },
};
export const updateNodeData = {
    department: (base, recipe) => {
        return produce(base, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
    },
    professor: (base, recipe) => {
        return produce(base, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
    },
    student: (base, recipe) => {
        return produce(base, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
    },
    course: (base, recipe) => {
        return produce(base, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
    },
    enrollment: (base, recipe) => {
        return produce(base, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
    },
};
// --- Sync Helpers ---
export const createNodeDataSync = {
    department: (data) => {
        const now = Date.now();
        return {
            id: ulid(),
            type: 'department',
            createdAt: now,
            updatedAt: now,
            fields: data.fields,
            relationIds: data.relationIds,
        };
    },
    professor: (data) => {
        const now = Date.now();
        return {
            id: ulid(),
            type: 'professor',
            createdAt: now,
            updatedAt: now,
            fields: data.fields,
            relationIds: data.relationIds,
        };
    },
    student: (data) => {
        const now = Date.now();
        return {
            id: ulid(),
            type: 'student',
            createdAt: now,
            updatedAt: now,
            fields: data.fields,
            relationIds: data.relationIds,
        };
    },
    course: (data) => {
        const now = Date.now();
        return {
            id: ulid(),
            type: 'course',
            createdAt: now,
            updatedAt: now,
            fields: data.fields,
            relationIds: data.relationIds,
        };
    },
    enrollment: (data) => {
        const now = Date.now();
        return {
            id: ulid(),
            type: 'enrollment',
            createdAt: now,
            updatedAt: now,
            fields: data.fields,
            relationIds: data.relationIds,
        };
    },
};
export const updateNodeDataSync = {
    department: (base, recipe) => {
        return produce(base, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
    },
    professor: (base, recipe) => {
        return produce(base, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
    },
    student: (base, recipe) => {
        return produce(base, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
    },
    course: (base, recipe) => {
        return produce(base, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
    },
    enrollment: (base, recipe) => {
        return produce(base, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
    },
};
