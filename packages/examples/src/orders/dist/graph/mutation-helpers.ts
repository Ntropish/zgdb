import schema from "./graph-schema.js";
import type {
  CustomerData,
  AddressData,
  WarehouseData,
  ProductData,
  CartData,
  OrderData,
  LineItemData,
  DiscountData,
  PaymentData,
  ShipmentData,
  NotificationData,
} from "./generated-serializers.js";
import { uuidv7 as uuid } from "uuidv7";
import { produce, Draft } from "immer";

// ============================================
//  Create Node Data Helpers
// ============================================

export const createNodeData = {
  customer: (data: {
    fields: CustomerData["fields"];
    relationIds: CustomerData["relationIds"];
  }): CustomerData => ({
    id: uuid(),
    type: "customer",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    fields: schema.customer.fields.parse(data.fields),
    relationIds: data.relationIds,
  }),
  address: (data: {
    fields: AddressData["fields"];
    relationIds: AddressData["relationIds"];
  }): AddressData => ({
    id: uuid(),
    type: "address",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    fields: schema.address.fields.parse(data.fields),
    relationIds: data.relationIds,
  }),
  warehouse: (data: {
    fields: WarehouseData["fields"];
    relationIds: WarehouseData["relationIds"];
  }): WarehouseData => ({
    id: uuid(),
    type: "warehouse",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    fields: schema.warehouse.fields.parse(data.fields),
    relationIds: data.relationIds,
  }),
  product: (data: {
    fields: ProductData["fields"];
    relationIds: ProductData["relationIds"];
  }): ProductData => ({
    id: uuid(),
    type: "product",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    fields: schema.product.fields.parse(data.fields),
    relationIds: data.relationIds,
  }),
  cart: (data: {
    fields: CartData["fields"];
    relationIds: CartData["relationIds"];
  }): CartData => ({
    id: uuid(),
    type: "cart",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    fields: schema.cart.fields.parse(data.fields),
    relationIds: data.relationIds,
  }),
  order: (data: {
    fields: OrderData["fields"];
    relationIds: OrderData["relationIds"];
  }): OrderData => ({
    id: uuid(),
    type: "order",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    fields: schema.order.fields.parse(data.fields),
    relationIds: data.relationIds,
  }),
  lineItem: (data: {
    fields: LineItemData["fields"];
    relationIds: LineItemData["relationIds"];
  }): LineItemData => ({
    id: uuid(),
    type: "lineItem",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    fields: schema.lineItem.fields.parse(data.fields),
    relationIds: data.relationIds,
  }),
  discount: (data: {
    fields: DiscountData["fields"];
    relationIds: DiscountData["relationIds"];
  }): DiscountData => ({
    id: uuid(),
    type: "discount",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    fields: schema.discount.fields.parse(data.fields),
    relationIds: data.relationIds,
  }),
  payment: (data: {
    fields: PaymentData["fields"];
    relationIds: PaymentData["relationIds"];
  }): PaymentData => ({
    id: uuid(),
    type: "payment",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    fields: schema.payment.fields.parse(data.fields),
    relationIds: data.relationIds,
  }),
  shipment: (data: {
    fields: ShipmentData["fields"];
    relationIds: ShipmentData["relationIds"];
  }): ShipmentData => ({
    id: uuid(),
    type: "shipment",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    fields: schema.shipment.fields.parse(data.fields),
    relationIds: data.relationIds,
  }),
  notification: (data: {
    fields: NotificationData["fields"];
    relationIds: NotificationData["relationIds"];
  }): NotificationData => ({
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
  customer: (
    node: CustomerData,
    recipe: (draft: Draft<CustomerData>) => void
  ): CustomerData => {
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
  address: (
    node: AddressData,
    recipe: (draft: Draft<AddressData>) => void
  ): AddressData => {
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
  warehouse: (
    node: WarehouseData,
    recipe: (draft: Draft<WarehouseData>) => void
  ): WarehouseData => {
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
  product: (
    node: ProductData,
    recipe: (draft: Draft<ProductData>) => void
  ): ProductData => {
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
  cart: (
    node: CartData,
    recipe: (draft: Draft<CartData>) => void
  ): CartData => {
    console.log("cart", node);
    const updatedNode = produce(node, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
    console.log("updatedNode", updatedNode);

    // After mutation, validate the final fields object to ensure consistency.
    const validatedFields = schema.cart.fields.parse(updatedNode.fields);

    return {
      ...updatedNode,
      fields: validatedFields,
    };
  },
  order: (
    node: OrderData,
    recipe: (draft: Draft<OrderData>) => void
  ): OrderData => {
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
  lineItem: (
    node: LineItemData,
    recipe: (draft: Draft<LineItemData>) => void
  ): LineItemData => {
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
  discount: (
    node: DiscountData,
    recipe: (draft: Draft<DiscountData>) => void
  ): DiscountData => {
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
  payment: (
    node: PaymentData,
    recipe: (draft: Draft<PaymentData>) => void
  ): PaymentData => {
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
  shipment: (
    node: ShipmentData,
    recipe: (draft: Draft<ShipmentData>) => void
  ): ShipmentData => {
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
  notification: (
    node: NotificationData,
    recipe: (draft: Draft<NotificationData>) => void
  ): NotificationData => {
    const updatedNode = produce(node, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });

    // After mutation, validate the final fields object to ensure consistency.
    const validatedFields = schema.notification.fields.parse(
      updatedNode.fields
    );

    return {
      ...updatedNode,
      fields: validatedFields,
    };
  },
};
