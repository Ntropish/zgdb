import { produce, Draft } from 'immer';
import { ulid } from 'ulid';
import { z } from 'zod';
import GraphSchema from './graph-schema.js';
import type { CustomerData, AddressData, WarehouseData, ProductData, CartData, OrderData, LineItemData, DiscountData, PaymentData, ShipmentData, NotificationData } from './generated-serializers.js';


// --- Async Helpers ---
export const createNodeData = {
  customer: (data: { fields: CustomerData['fields'], relationIds: CustomerData['relationIds'] }): CustomerData => {
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
  address: (data: { fields: AddressData['fields'], relationIds: AddressData['relationIds'] }): AddressData => {
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
  warehouse: (data: { fields: WarehouseData['fields'], relationIds: WarehouseData['relationIds'] }): WarehouseData => {
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
  product: (data: { fields: ProductData['fields'], relationIds: ProductData['relationIds'] }): ProductData => {
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
  cart: (data: { fields: CartData['fields'], relationIds: CartData['relationIds'] }): CartData => {
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
  order: (data: { fields: OrderData['fields'], relationIds: OrderData['relationIds'] }): OrderData => {
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
  lineItem: (data: { fields: LineItemData['fields'], relationIds: LineItemData['relationIds'] }): LineItemData => {
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
  discount: (data: { fields: DiscountData['fields'], relationIds: DiscountData['relationIds'] }): DiscountData => {
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
  payment: (data: { fields: PaymentData['fields'], relationIds: PaymentData['relationIds'] }): PaymentData => {
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
  shipment: (data: { fields: ShipmentData['fields'], relationIds: ShipmentData['relationIds'] }): ShipmentData => {
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
  notification: (data: { fields: NotificationData['fields'], relationIds: NotificationData['relationIds'] }): NotificationData => {
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
  customer: (
    base: CustomerData,
    recipe: (draft: Draft<CustomerData>) => void
  ): CustomerData => {
    return produce(base, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
  },
  address: (
    base: AddressData,
    recipe: (draft: Draft<AddressData>) => void
  ): AddressData => {
    return produce(base, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
  },
  warehouse: (
    base: WarehouseData,
    recipe: (draft: Draft<WarehouseData>) => void
  ): WarehouseData => {
    return produce(base, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
  },
  product: (
    base: ProductData,
    recipe: (draft: Draft<ProductData>) => void
  ): ProductData => {
    return produce(base, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
  },
  cart: (
    base: CartData,
    recipe: (draft: Draft<CartData>) => void
  ): CartData => {
    return produce(base, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
  },
  order: (
    base: OrderData,
    recipe: (draft: Draft<OrderData>) => void
  ): OrderData => {
    return produce(base, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
  },
  lineItem: (
    base: LineItemData,
    recipe: (draft: Draft<LineItemData>) => void
  ): LineItemData => {
    return produce(base, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
  },
  discount: (
    base: DiscountData,
    recipe: (draft: Draft<DiscountData>) => void
  ): DiscountData => {
    return produce(base, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
  },
  payment: (
    base: PaymentData,
    recipe: (draft: Draft<PaymentData>) => void
  ): PaymentData => {
    return produce(base, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
  },
  shipment: (
    base: ShipmentData,
    recipe: (draft: Draft<ShipmentData>) => void
  ): ShipmentData => {
    return produce(base, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
  },
  notification: (
    base: NotificationData,
    recipe: (draft: Draft<NotificationData>) => void
  ): NotificationData => {
    return produce(base, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
  },
};


// --- Sync Helpers ---
export const createNodeDataSync = {
  customer: (data: { fields: CustomerData['fields'], relationIds: CustomerData['relationIds'] }): CustomerData => {
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
  address: (data: { fields: AddressData['fields'], relationIds: AddressData['relationIds'] }): AddressData => {
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
  warehouse: (data: { fields: WarehouseData['fields'], relationIds: WarehouseData['relationIds'] }): WarehouseData => {
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
  product: (data: { fields: ProductData['fields'], relationIds: ProductData['relationIds'] }): ProductData => {
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
  cart: (data: { fields: CartData['fields'], relationIds: CartData['relationIds'] }): CartData => {
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
  order: (data: { fields: OrderData['fields'], relationIds: OrderData['relationIds'] }): OrderData => {
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
  lineItem: (data: { fields: LineItemData['fields'], relationIds: LineItemData['relationIds'] }): LineItemData => {
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
  discount: (data: { fields: DiscountData['fields'], relationIds: DiscountData['relationIds'] }): DiscountData => {
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
  payment: (data: { fields: PaymentData['fields'], relationIds: PaymentData['relationIds'] }): PaymentData => {
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
  shipment: (data: { fields: ShipmentData['fields'], relationIds: ShipmentData['relationIds'] }): ShipmentData => {
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
  notification: (data: { fields: NotificationData['fields'], relationIds: NotificationData['relationIds'] }): NotificationData => {
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
  customer: (
    base: CustomerData,
    recipe: (draft: Draft<CustomerData>) => void
  ): CustomerData => {
    return produce(base, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
  },
  address: (
    base: AddressData,
    recipe: (draft: Draft<AddressData>) => void
  ): AddressData => {
    return produce(base, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
  },
  warehouse: (
    base: WarehouseData,
    recipe: (draft: Draft<WarehouseData>) => void
  ): WarehouseData => {
    return produce(base, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
  },
  product: (
    base: ProductData,
    recipe: (draft: Draft<ProductData>) => void
  ): ProductData => {
    return produce(base, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
  },
  cart: (
    base: CartData,
    recipe: (draft: Draft<CartData>) => void
  ): CartData => {
    return produce(base, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
  },
  order: (
    base: OrderData,
    recipe: (draft: Draft<OrderData>) => void
  ): OrderData => {
    return produce(base, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
  },
  lineItem: (
    base: LineItemData,
    recipe: (draft: Draft<LineItemData>) => void
  ): LineItemData => {
    return produce(base, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
  },
  discount: (
    base: DiscountData,
    recipe: (draft: Draft<DiscountData>) => void
  ): DiscountData => {
    return produce(base, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
  },
  payment: (
    base: PaymentData,
    recipe: (draft: Draft<PaymentData>) => void
  ): PaymentData => {
    return produce(base, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
  },
  shipment: (
    base: ShipmentData,
    recipe: (draft: Draft<ShipmentData>) => void
  ): ShipmentData => {
    return produce(base, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
  },
  notification: (
    base: NotificationData,
    recipe: (draft: Draft<NotificationData>) => void
  ): NotificationData => {
    return produce(base, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
  },
};