import { z } from "zod";

const schema = {
  customer: {
    fields: z.object({
      name: z.string(),
      email: z.string().email(),
      loyaltyPoints: z.number().int().min(0),
    }),
    relations: {
      orders: ["many", "order"],
      cart: ["one", "cart"],
      addresses: ["many", "address"],
    },
  },
  address: {
    fields: z.object({
      type: z.enum(["shipping", "billing"]),
      street: z.string(),
      city: z.string(),
      zip: z.string(),
    }),
    relations: {
      customer: ["one", "customer"],
    },
  },
  warehouse: {
    fields: z.object({ name: z.string() }),
    relations: {
      products: ["many", "product"],
    },
  },
  product: {
    fields: z.object({
      name: z.string(),
      price: z.number(),
      stock: z.number().int().min(0),
      reserved: z.number().int().min(0), // For items in carts
    }),
    relations: {
      warehouse: ["one", "warehouse"],
    },
  },
  cart: {
    fields: z.object({
      itemsJson: z.string(), // A JSON string of {productId: string, quantity: number}[]
      status: z.enum(["active", "processing", "completed", "failed"]),
    }),
    relations: {
      customer: ["one", "customer"],
      discount: ["one", "discount"], // Optional applied discount
    },
  },
  order: {
    fields: z.object({
      total: z.number(),
      status: z.enum(["pending_fulfillment", "shipped", "cancelled"]),
    }),
    relations: {
      customer: ["one", "customer"],
      lineItems: ["many", "lineItem"],
      payment: ["one", "payment"],
      shipment: ["one", "shipment"],
      notifications: ["many", "notification"],
    },
  },
  lineItem: {
    // Only created at the end of a successful checkout
    fields: z.object({
      quantity: z.number().int().positive(),
      purchasePrice: z.number(),
      status: z.enum(["fulfilled", "backordered"]),
    }),
    relations: {
      product: ["one", "product"],
      order: ["one", "order"],
    },
  },
  discount: {
    fields: z.object({
      code: z.string().toUpperCase(),
      percentage: z.number(),
    }),
    relations: {},
  },
  payment: {
    fields: z.object({
      amount: z.number(),
      status: z.enum(["succeeded", "failed"]),
      gatewayId: z.string(),
    }),
    relations: { order: ["one", "order"] },
  },
  shipment: {
    fields: z.object({
      address: z.string(),
      status: z.enum(["preparing", "in-transit", "delivered"]),
    }),
    relations: { order: ["one", "order"], warehouse: ["one", "warehouse"] },
  },
  notification: {
    fields: z.object({
      type: z.enum(["order_confirmation", "warehouse_fulfillment"]),
      status: z.enum(["pending", "sent"]),
    }),
    relations: { order: ["one", "order"] },
  },
};

export default schema;
