import type { CustomerData, AddressData, WarehouseData, ProductData, CartData, OrderData, LineItemData, DiscountData, PaymentData, ShipmentData, NotificationData } from './generated-serializers.js';

export type NodeDataTypeMap = {
  'customer': CustomerData;
  'address': AddressData;
  'warehouse': WarehouseData;
  'product': ProductData;
  'cart': CartData;
  'order': OrderData;
  'lineItem': LineItemData;
  'discount': DiscountData;
  'payment': PaymentData;
  'shipment': ShipmentData;
  'notification': NotificationData;
};
