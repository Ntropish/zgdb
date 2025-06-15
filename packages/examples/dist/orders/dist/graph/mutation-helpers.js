import schema from "./graph-schema.js";
import { uuidv7 as uuid } from "uuidv7";
import { produce } from "immer";
// ============================================
//  Create Node Data Helpers
// ============================================
export const createNodeData = {
    customer: (data) => ({
        id: uuid(),
        type: "customer",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        fields: schema.customer.fields.parse(data.fields),
        relationIds: data.relationIds,
    }),
    address: (data) => ({
        id: uuid(),
        type: "address",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        fields: schema.address.fields.parse(data.fields),
        relationIds: data.relationIds,
    }),
    warehouse: (data) => ({
        id: uuid(),
        type: "warehouse",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        fields: schema.warehouse.fields.parse(data.fields),
        relationIds: data.relationIds,
    }),
    product: (data) => ({
        id: uuid(),
        type: "product",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        fields: schema.product.fields.parse(data.fields),
        relationIds: data.relationIds,
    }),
    cart: (data) => ({
        id: uuid(),
        type: "cart",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        fields: schema.cart.fields.parse(data.fields),
        relationIds: data.relationIds,
    }),
    order: (data) => ({
        id: uuid(),
        type: "order",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        fields: schema.order.fields.parse(data.fields),
        relationIds: data.relationIds,
    }),
    lineItem: (data) => ({
        id: uuid(),
        type: "lineItem",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        fields: schema.lineItem.fields.parse(data.fields),
        relationIds: data.relationIds,
    }),
    discount: (data) => ({
        id: uuid(),
        type: "discount",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        fields: schema.discount.fields.parse(data.fields),
        relationIds: data.relationIds,
    }),
    payment: (data) => ({
        id: uuid(),
        type: "payment",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        fields: schema.payment.fields.parse(data.fields),
        relationIds: data.relationIds,
    }),
    shipment: (data) => ({
        id: uuid(),
        type: "shipment",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        fields: schema.shipment.fields.parse(data.fields),
        relationIds: data.relationIds,
    }),
    notification: (data) => ({
        id: uuid(),
        type: "notification",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        fields: schema.notification.fields.parse(data.fields),
        relationIds: data.relationIds,
    }),
};
// ============================================
//  Update Node Data Helpers (with Immer)
// ============================================
export const updateNodeData = {
    customer: (node, recipe) => {
        const updatedNode = produce(node, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
        // After mutation, validate the final fields object to ensure consistency.
        const validatedFields = schema.customer.fields.parse(updatedNode.fields);
        return {
            ...updatedNode,
            fields: validatedFields,
        };
    },
    address: (node, recipe) => {
        const updatedNode = produce(node, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
        // After mutation, validate the final fields object to ensure consistency.
        const validatedFields = schema.address.fields.parse(updatedNode.fields);
        return {
            ...updatedNode,
            fields: validatedFields,
        };
    },
    warehouse: (node, recipe) => {
        const updatedNode = produce(node, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
        // After mutation, validate the final fields object to ensure consistency.
        const validatedFields = schema.warehouse.fields.parse(updatedNode.fields);
        return {
            ...updatedNode,
            fields: validatedFields,
        };
    },
    product: (node, recipe) => {
        const updatedNode = produce(node, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
        // After mutation, validate the final fields object to ensure consistency.
        const validatedFields = schema.product.fields.parse(updatedNode.fields);
        return {
            ...updatedNode,
            fields: validatedFields,
        };
    },
    cart: (node, recipe) => {
        const updatedNode = produce(node, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
        // After mutation, validate the final fields object to ensure consistency.
        const validatedFields = schema.cart.fields.parse(updatedNode.fields);
        return {
            ...updatedNode,
            fields: validatedFields,
        };
    },
    order: (node, recipe) => {
        const updatedNode = produce(node, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
        // After mutation, validate the final fields object to ensure consistency.
        const validatedFields = schema.order.fields.parse(updatedNode.fields);
        return {
            ...updatedNode,
            fields: validatedFields,
        };
    },
    lineItem: (node, recipe) => {
        const updatedNode = produce(node, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
        // After mutation, validate the final fields object to ensure consistency.
        const validatedFields = schema.lineItem.fields.parse(updatedNode.fields);
        return {
            ...updatedNode,
            fields: validatedFields,
        };
    },
    discount: (node, recipe) => {
        const updatedNode = produce(node, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
        // After mutation, validate the final fields object to ensure consistency.
        const validatedFields = schema.discount.fields.parse(updatedNode.fields);
        return {
            ...updatedNode,
            fields: validatedFields,
        };
    },
    payment: (node, recipe) => {
        const updatedNode = produce(node, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
        // After mutation, validate the final fields object to ensure consistency.
        const validatedFields = schema.payment.fields.parse(updatedNode.fields);
        return {
            ...updatedNode,
            fields: validatedFields,
        };
    },
    shipment: (node, recipe) => {
        const updatedNode = produce(node, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
        // After mutation, validate the final fields object to ensure consistency.
        const validatedFields = schema.shipment.fields.parse(updatedNode.fields);
        return {
            ...updatedNode,
            fields: validatedFields,
        };
    },
    notification: (node, recipe) => {
        const updatedNode = produce(node, (draft) => {
            recipe(draft);
            draft.updatedAt = Date.now();
        });
        // After mutation, validate the final fields object to ensure consistency.
        const validatedFields = schema.notification.fields.parse(updatedNode.fields);
        return {
            ...updatedNode,
            fields: validatedFields,
        };
    },
};
