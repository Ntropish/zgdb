import schema from './graph-schema.js';
import { uuidv7 as uuid } from 'uuidv7';
import { produce } from 'immer';
// ============================================
//  Create Node Data Helpers
// ============================================
export const createNodeData = {
    department: (data) => ({
        id: uuid(),
        type: 'department',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        fields: schema.department.fields.parse(data.fields),
        relationIds: data.relationIds,
    }),
    professor: (data) => ({
        id: uuid(),
        type: 'professor',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        fields: schema.professor.fields.parse(data.fields),
        relationIds: data.relationIds,
    }),
    student: (data) => ({
        id: uuid(),
        type: 'student',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        fields: schema.student.fields.parse(data.fields),
        relationIds: data.relationIds,
    }),
    course: (data) => ({
        id: uuid(),
        type: 'course',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        fields: schema.course.fields.parse(data.fields),
        relationIds: data.relationIds,
    }),
    enrollment: (data) => ({
        id: uuid(),
        type: 'enrollment',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        fields: schema.enrollment.fields.parse(data.fields),
        relationIds: data.relationIds,
    })
};
// ============================================
//  Update Node Data Helpers (with Immer)
// ============================================
export const updateNodeData = {
    department: (node, recipe) => {
        const updatedNode = produce(node, draft => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
        // After mutation, validate the final fields object to ensure consistency.
        const validatedFields = schema.department.fields.parse(updatedNode.fields);
        return {
            ...updatedNode,
            fields: validatedFields,
        };
    },
    professor: (node, recipe) => {
        const updatedNode = produce(node, draft => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
        // After mutation, validate the final fields object to ensure consistency.
        const validatedFields = schema.professor.fields.parse(updatedNode.fields);
        return {
            ...updatedNode,
            fields: validatedFields,
        };
    },
    student: (node, recipe) => {
        const updatedNode = produce(node, draft => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
        // After mutation, validate the final fields object to ensure consistency.
        const validatedFields = schema.student.fields.parse(updatedNode.fields);
        return {
            ...updatedNode,
            fields: validatedFields,
        };
    },
    course: (node, recipe) => {
        const updatedNode = produce(node, draft => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
        // After mutation, validate the final fields object to ensure consistency.
        const validatedFields = schema.course.fields.parse(updatedNode.fields);
        return {
            ...updatedNode,
            fields: validatedFields,
        };
    },
    enrollment: (node, recipe) => {
        const updatedNode = produce(node, draft => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
        // After mutation, validate the final fields object to ensure consistency.
        const validatedFields = schema.enrollment.fields.parse(updatedNode.fields);
        return {
            ...updatedNode,
            fields: validatedFields,
        };
    }
};
