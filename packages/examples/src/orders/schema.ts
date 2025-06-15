import { GraphSchema } from "@zgdb/runtime";
import { z } from "zod";

const schema = {
  customer: {
    fields: z.object({
      name: z.string(),
      email: z.string().email(),
    }),
    relations: {
      orders: ["many", "order"],
    },
  },
  product: {
    fields: z.object({
      name: z.string(),
      price: z.number(),
      stock: z.number().int().min(0),
    }),
    relations: {}, // Products don't directly link to orders
  },
  order: {
    fields: z.object({
      total: z.number(),
      status: z.enum(["pending", "shipped", "cancelled"]),
    }),
    relations: {
      customer: ["one", "customer"],
      lineItems: ["many", "lineItem"], // An order has many line items
    },
  },
  // This is an "edge with data" connecting an Order to a Product
  lineItem: {
    fields: z.object({
      quantity: z.number().int().positive(),
      purchasePrice: z.number(), // Price at the time of purchase
    }),
    relations: {
      order: ["one", "order"],
      product: ["one", "product"],
    },
  },
};

export default schema;
