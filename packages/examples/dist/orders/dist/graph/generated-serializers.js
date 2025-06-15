import { Builder, ByteBuffer } from 'flatbuffers';
import { Customer } from './graph-db/customer.js';
import { Address } from './graph-db/address.js';
import { Warehouse } from './graph-db/warehouse.js';
import { Product } from './graph-db/product.js';
import { Cart } from './graph-db/cart.js';
import { Order } from './graph-db/order.js';
import { LineItem } from './graph-db/line-item.js';
import { Discount } from './graph-db/discount.js';
import { Payment } from './graph-db/payment.js';
import { Shipment } from './graph-db/shipment.js';
import { Notification } from './graph-db/notification.js';
// ============================================
//  Supported Node Types
// ============================================
export const supportedNodeTypes = ['customer', 'address', 'warehouse', 'product', 'cart', 'order', 'lineItem', 'discount', 'payment', 'shipment', 'notification'];
// ============================================
//  Serialize Logic
// ============================================
export const serializeNode = {
    customer: (node) => {
        const builder = new Builder(1024);
        const idOffset = builder.createString(node.id);
        const nameOffset = builder.createString(node.fields.name || '');
        const emailOffset = builder.createString(node.fields.email || '');
        const ordersIdOffsets = (node.relationIds.orders || []).map(id => builder.createString(id));
        const ordersIdsVectorOffset = Customer.createOrdersIdsVector(builder, ordersIdOffsets);
        const cartIdOffsets = (node.relationIds.cart ? [node.relationIds.cart] : []).map(id => builder.createString(id));
        const cartIdsVectorOffset = Customer.createCartIdsVector(builder, cartIdOffsets);
        const addressesIdOffsets = (node.relationIds.addresses || []).map(id => builder.createString(id));
        const addressesIdsVectorOffset = Customer.createAddressesIdsVector(builder, addressesIdOffsets);
        Customer.startCustomer(builder);
        Customer.addId(builder, idOffset);
        Customer.addCreatedAt(builder, BigInt(node.createdAt));
        Customer.addUpdatedAt(builder, BigInt(node.updatedAt));
        Customer.addName(builder, nameOffset);
        Customer.addEmail(builder, emailOffset);
        Customer.addLoyaltyPoints(builder, node.fields.loyaltyPoints);
        Customer.addOrdersIds(builder, ordersIdsVectorOffset);
        Customer.addCartIds(builder, cartIdsVectorOffset);
        Customer.addAddressesIds(builder, addressesIdsVectorOffset);
        const customerOffset = Customer.endCustomer(builder);
        builder.finish(customerOffset);
        return builder.asUint8Array();
    },
    address: (node) => {
        const builder = new Builder(1024);
        const idOffset = builder.createString(node.id);
        const typeOffset = builder.createString(node.fields.type || '');
        const streetOffset = builder.createString(node.fields.street || '');
        const cityOffset = builder.createString(node.fields.city || '');
        const zipOffset = builder.createString(node.fields.zip || '');
        const customerIdOffsets = (node.relationIds.customer ? [node.relationIds.customer] : []).map(id => builder.createString(id));
        const customerIdsVectorOffset = Address.createCustomerIdsVector(builder, customerIdOffsets);
        Address.startAddress(builder);
        Address.addId(builder, idOffset);
        Address.addCreatedAt(builder, BigInt(node.createdAt));
        Address.addUpdatedAt(builder, BigInt(node.updatedAt));
        Address.addType(builder, typeOffset);
        Address.addStreet(builder, streetOffset);
        Address.addCity(builder, cityOffset);
        Address.addZip(builder, zipOffset);
        Address.addCustomerIds(builder, customerIdsVectorOffset);
        const addressOffset = Address.endAddress(builder);
        builder.finish(addressOffset);
        return builder.asUint8Array();
    },
    warehouse: (node) => {
        const builder = new Builder(1024);
        const idOffset = builder.createString(node.id);
        const nameOffset = builder.createString(node.fields.name || '');
        const productsIdOffsets = (node.relationIds.products || []).map(id => builder.createString(id));
        const productsIdsVectorOffset = Warehouse.createProductsIdsVector(builder, productsIdOffsets);
        Warehouse.startWarehouse(builder);
        Warehouse.addId(builder, idOffset);
        Warehouse.addCreatedAt(builder, BigInt(node.createdAt));
        Warehouse.addUpdatedAt(builder, BigInt(node.updatedAt));
        Warehouse.addName(builder, nameOffset);
        Warehouse.addProductsIds(builder, productsIdsVectorOffset);
        const warehouseOffset = Warehouse.endWarehouse(builder);
        builder.finish(warehouseOffset);
        return builder.asUint8Array();
    },
    product: (node) => {
        const builder = new Builder(1024);
        const idOffset = builder.createString(node.id);
        const nameOffset = builder.createString(node.fields.name || '');
        const warehouseIdOffsets = (node.relationIds.warehouse ? [node.relationIds.warehouse] : []).map(id => builder.createString(id));
        const warehouseIdsVectorOffset = Product.createWarehouseIdsVector(builder, warehouseIdOffsets);
        Product.startProduct(builder);
        Product.addId(builder, idOffset);
        Product.addCreatedAt(builder, BigInt(node.createdAt));
        Product.addUpdatedAt(builder, BigInt(node.updatedAt));
        Product.addName(builder, nameOffset);
        Product.addPrice(builder, node.fields.price);
        Product.addStock(builder, node.fields.stock);
        Product.addReserved(builder, node.fields.reserved);
        Product.addWarehouseIds(builder, warehouseIdsVectorOffset);
        const productOffset = Product.endProduct(builder);
        builder.finish(productOffset);
        return builder.asUint8Array();
    },
    cart: (node) => {
        const builder = new Builder(1024);
        const idOffset = builder.createString(node.id);
        const itemsJsonOffset = builder.createString(node.fields.itemsJson || '');
        const statusOffset = builder.createString(node.fields.status || '');
        const customerIdOffsets = (node.relationIds.customer ? [node.relationIds.customer] : []).map(id => builder.createString(id));
        const customerIdsVectorOffset = Cart.createCustomerIdsVector(builder, customerIdOffsets);
        const discountIdOffsets = (node.relationIds.discount ? [node.relationIds.discount] : []).map(id => builder.createString(id));
        const discountIdsVectorOffset = Cart.createDiscountIdsVector(builder, discountIdOffsets);
        Cart.startCart(builder);
        Cart.addId(builder, idOffset);
        Cart.addCreatedAt(builder, BigInt(node.createdAt));
        Cart.addUpdatedAt(builder, BigInt(node.updatedAt));
        Cart.addItemsJson(builder, itemsJsonOffset);
        Cart.addStatus(builder, statusOffset);
        Cart.addCustomerIds(builder, customerIdsVectorOffset);
        Cart.addDiscountIds(builder, discountIdsVectorOffset);
        const cartOffset = Cart.endCart(builder);
        builder.finish(cartOffset);
        return builder.asUint8Array();
    },
    order: (node) => {
        const builder = new Builder(1024);
        const idOffset = builder.createString(node.id);
        const statusOffset = builder.createString(node.fields.status || '');
        const customerIdOffsets = (node.relationIds.customer ? [node.relationIds.customer] : []).map(id => builder.createString(id));
        const customerIdsVectorOffset = Order.createCustomerIdsVector(builder, customerIdOffsets);
        const lineItemsIdOffsets = (node.relationIds.lineItems || []).map(id => builder.createString(id));
        const lineItemsIdsVectorOffset = Order.createLineItemsIdsVector(builder, lineItemsIdOffsets);
        const paymentIdOffsets = (node.relationIds.payment ? [node.relationIds.payment] : []).map(id => builder.createString(id));
        const paymentIdsVectorOffset = Order.createPaymentIdsVector(builder, paymentIdOffsets);
        const shipmentIdOffsets = (node.relationIds.shipment ? [node.relationIds.shipment] : []).map(id => builder.createString(id));
        const shipmentIdsVectorOffset = Order.createShipmentIdsVector(builder, shipmentIdOffsets);
        const notificationsIdOffsets = (node.relationIds.notifications || []).map(id => builder.createString(id));
        const notificationsIdsVectorOffset = Order.createNotificationsIdsVector(builder, notificationsIdOffsets);
        Order.startOrder(builder);
        Order.addId(builder, idOffset);
        Order.addCreatedAt(builder, BigInt(node.createdAt));
        Order.addUpdatedAt(builder, BigInt(node.updatedAt));
        Order.addTotal(builder, node.fields.total);
        Order.addStatus(builder, statusOffset);
        Order.addCustomerIds(builder, customerIdsVectorOffset);
        Order.addLineItemsIds(builder, lineItemsIdsVectorOffset);
        Order.addPaymentIds(builder, paymentIdsVectorOffset);
        Order.addShipmentIds(builder, shipmentIdsVectorOffset);
        Order.addNotificationsIds(builder, notificationsIdsVectorOffset);
        const orderOffset = Order.endOrder(builder);
        builder.finish(orderOffset);
        return builder.asUint8Array();
    },
    lineItem: (node) => {
        const builder = new Builder(1024);
        const idOffset = builder.createString(node.id);
        const statusOffset = builder.createString(node.fields.status || '');
        const productIdOffsets = (node.relationIds.product ? [node.relationIds.product] : []).map(id => builder.createString(id));
        const productIdsVectorOffset = LineItem.createProductIdsVector(builder, productIdOffsets);
        const orderIdOffsets = (node.relationIds.order ? [node.relationIds.order] : []).map(id => builder.createString(id));
        const orderIdsVectorOffset = LineItem.createOrderIdsVector(builder, orderIdOffsets);
        LineItem.startLineItem(builder);
        LineItem.addId(builder, idOffset);
        LineItem.addCreatedAt(builder, BigInt(node.createdAt));
        LineItem.addUpdatedAt(builder, BigInt(node.updatedAt));
        LineItem.addQuantity(builder, node.fields.quantity);
        LineItem.addPurchasePrice(builder, node.fields.purchasePrice);
        LineItem.addStatus(builder, statusOffset);
        LineItem.addProductIds(builder, productIdsVectorOffset);
        LineItem.addOrderIds(builder, orderIdsVectorOffset);
        const lineItemOffset = LineItem.endLineItem(builder);
        builder.finish(lineItemOffset);
        return builder.asUint8Array();
    },
    discount: (node) => {
        const builder = new Builder(1024);
        const idOffset = builder.createString(node.id);
        const codeOffset = builder.createString(node.fields.code || '');
        Discount.startDiscount(builder);
        Discount.addId(builder, idOffset);
        Discount.addCreatedAt(builder, BigInt(node.createdAt));
        Discount.addUpdatedAt(builder, BigInt(node.updatedAt));
        Discount.addCode(builder, codeOffset);
        Discount.addPercentage(builder, node.fields.percentage);
        const discountOffset = Discount.endDiscount(builder);
        builder.finish(discountOffset);
        return builder.asUint8Array();
    },
    payment: (node) => {
        const builder = new Builder(1024);
        const idOffset = builder.createString(node.id);
        const statusOffset = builder.createString(node.fields.status || '');
        const gatewayIdOffset = builder.createString(node.fields.gatewayId || '');
        const orderIdOffsets = (node.relationIds.order ? [node.relationIds.order] : []).map(id => builder.createString(id));
        const orderIdsVectorOffset = Payment.createOrderIdsVector(builder, orderIdOffsets);
        Payment.startPayment(builder);
        Payment.addId(builder, idOffset);
        Payment.addCreatedAt(builder, BigInt(node.createdAt));
        Payment.addUpdatedAt(builder, BigInt(node.updatedAt));
        Payment.addAmount(builder, node.fields.amount);
        Payment.addStatus(builder, statusOffset);
        Payment.addGatewayId(builder, gatewayIdOffset);
        Payment.addOrderIds(builder, orderIdsVectorOffset);
        const paymentOffset = Payment.endPayment(builder);
        builder.finish(paymentOffset);
        return builder.asUint8Array();
    },
    shipment: (node) => {
        const builder = new Builder(1024);
        const idOffset = builder.createString(node.id);
        const addressOffset = builder.createString(node.fields.address || '');
        const statusOffset = builder.createString(node.fields.status || '');
        const orderIdOffsets = (node.relationIds.order ? [node.relationIds.order] : []).map(id => builder.createString(id));
        const orderIdsVectorOffset = Shipment.createOrderIdsVector(builder, orderIdOffsets);
        const warehouseIdOffsets = (node.relationIds.warehouse ? [node.relationIds.warehouse] : []).map(id => builder.createString(id));
        const warehouseIdsVectorOffset = Shipment.createWarehouseIdsVector(builder, warehouseIdOffsets);
        Shipment.startShipment(builder);
        Shipment.addId(builder, idOffset);
        Shipment.addCreatedAt(builder, BigInt(node.createdAt));
        Shipment.addUpdatedAt(builder, BigInt(node.updatedAt));
        Shipment.addAddress(builder, addressOffset);
        Shipment.addStatus(builder, statusOffset);
        Shipment.addOrderIds(builder, orderIdsVectorOffset);
        Shipment.addWarehouseIds(builder, warehouseIdsVectorOffset);
        const shipmentOffset = Shipment.endShipment(builder);
        builder.finish(shipmentOffset);
        return builder.asUint8Array();
    },
    notification: (node) => {
        const builder = new Builder(1024);
        const idOffset = builder.createString(node.id);
        const typeOffset = builder.createString(node.fields.type || '');
        const statusOffset = builder.createString(node.fields.status || '');
        const orderIdOffsets = (node.relationIds.order ? [node.relationIds.order] : []).map(id => builder.createString(id));
        const orderIdsVectorOffset = Notification.createOrderIdsVector(builder, orderIdOffsets);
        Notification.startNotification(builder);
        Notification.addId(builder, idOffset);
        Notification.addCreatedAt(builder, BigInt(node.createdAt));
        Notification.addUpdatedAt(builder, BigInt(node.updatedAt));
        Notification.addType(builder, typeOffset);
        Notification.addStatus(builder, statusOffset);
        Notification.addOrderIds(builder, orderIdsVectorOffset);
        const notificationOffset = Notification.endNotification(builder);
        builder.finish(notificationOffset);
        return builder.asUint8Array();
    },
};
// ============================================
//  Deserialize Logic
// ============================================
export const deserializeNode = {
    customer: (buffer) => {
        const byteBuffer = new ByteBuffer(buffer);
        const node = Customer.getRootAsCustomer(byteBuffer);
        const fields = {};
        fields.name = node.name();
        fields.email = node.email();
        fields.loyaltyPoints = node.loyaltyPoints();
        const relationIds = {};
        const ordersIds = Array.from({ length: node.ordersIdsLength() }, (_, i) => node.ordersIds(i));
        relationIds.orders = ordersIds;
        const cartIds = Array.from({ length: node.cartIdsLength() }, (_, i) => node.cartIds(i));
        relationIds.cart = cartIds[0] || '';
        const addressesIds = Array.from({ length: node.addressesIdsLength() }, (_, i) => node.addressesIds(i));
        relationIds.addresses = addressesIds;
        return {
            id: node.id(),
            type: 'customer',
            createdAt: Number(node.createdAt()),
            updatedAt: Number(node.updatedAt()),
            fields: fields,
            relationIds: relationIds,
        };
    },
    address: (buffer) => {
        const byteBuffer = new ByteBuffer(buffer);
        const node = Address.getRootAsAddress(byteBuffer);
        const fields = {};
        fields.type = node.type();
        fields.street = node.street();
        fields.city = node.city();
        fields.zip = node.zip();
        const relationIds = {};
        const customerIds = Array.from({ length: node.customerIdsLength() }, (_, i) => node.customerIds(i));
        relationIds.customer = customerIds[0] || '';
        return {
            id: node.id(),
            type: 'address',
            createdAt: Number(node.createdAt()),
            updatedAt: Number(node.updatedAt()),
            fields: fields,
            relationIds: relationIds,
        };
    },
    warehouse: (buffer) => {
        const byteBuffer = new ByteBuffer(buffer);
        const node = Warehouse.getRootAsWarehouse(byteBuffer);
        const fields = {};
        fields.name = node.name();
        const relationIds = {};
        const productsIds = Array.from({ length: node.productsIdsLength() }, (_, i) => node.productsIds(i));
        relationIds.products = productsIds;
        return {
            id: node.id(),
            type: 'warehouse',
            createdAt: Number(node.createdAt()),
            updatedAt: Number(node.updatedAt()),
            fields: fields,
            relationIds: relationIds,
        };
    },
    product: (buffer) => {
        const byteBuffer = new ByteBuffer(buffer);
        const node = Product.getRootAsProduct(byteBuffer);
        const fields = {};
        fields.name = node.name();
        fields.price = node.price();
        fields.stock = node.stock();
        fields.reserved = node.reserved();
        const relationIds = {};
        const warehouseIds = Array.from({ length: node.warehouseIdsLength() }, (_, i) => node.warehouseIds(i));
        relationIds.warehouse = warehouseIds[0] || '';
        return {
            id: node.id(),
            type: 'product',
            createdAt: Number(node.createdAt()),
            updatedAt: Number(node.updatedAt()),
            fields: fields,
            relationIds: relationIds,
        };
    },
    cart: (buffer) => {
        const byteBuffer = new ByteBuffer(buffer);
        const node = Cart.getRootAsCart(byteBuffer);
        const fields = {};
        fields.itemsJson = node.itemsJson();
        fields.status = node.status();
        const relationIds = {};
        const customerIds = Array.from({ length: node.customerIdsLength() }, (_, i) => node.customerIds(i));
        relationIds.customer = customerIds[0] || '';
        const discountIds = Array.from({ length: node.discountIdsLength() }, (_, i) => node.discountIds(i));
        relationIds.discount = discountIds[0] || '';
        return {
            id: node.id(),
            type: 'cart',
            createdAt: Number(node.createdAt()),
            updatedAt: Number(node.updatedAt()),
            fields: fields,
            relationIds: relationIds,
        };
    },
    order: (buffer) => {
        const byteBuffer = new ByteBuffer(buffer);
        const node = Order.getRootAsOrder(byteBuffer);
        const fields = {};
        fields.total = node.total();
        fields.status = node.status();
        const relationIds = {};
        const customerIds = Array.from({ length: node.customerIdsLength() }, (_, i) => node.customerIds(i));
        relationIds.customer = customerIds[0] || '';
        const lineItemsIds = Array.from({ length: node.lineItemsIdsLength() }, (_, i) => node.lineItemsIds(i));
        relationIds.lineItems = lineItemsIds;
        const paymentIds = Array.from({ length: node.paymentIdsLength() }, (_, i) => node.paymentIds(i));
        relationIds.payment = paymentIds[0] || '';
        const shipmentIds = Array.from({ length: node.shipmentIdsLength() }, (_, i) => node.shipmentIds(i));
        relationIds.shipment = shipmentIds[0] || '';
        const notificationsIds = Array.from({ length: node.notificationsIdsLength() }, (_, i) => node.notificationsIds(i));
        relationIds.notifications = notificationsIds;
        return {
            id: node.id(),
            type: 'order',
            createdAt: Number(node.createdAt()),
            updatedAt: Number(node.updatedAt()),
            fields: fields,
            relationIds: relationIds,
        };
    },
    lineItem: (buffer) => {
        const byteBuffer = new ByteBuffer(buffer);
        const node = LineItem.getRootAsLineItem(byteBuffer);
        const fields = {};
        fields.quantity = node.quantity();
        fields.purchasePrice = node.purchasePrice();
        fields.status = node.status();
        const relationIds = {};
        const productIds = Array.from({ length: node.productIdsLength() }, (_, i) => node.productIds(i));
        relationIds.product = productIds[0] || '';
        const orderIds = Array.from({ length: node.orderIdsLength() }, (_, i) => node.orderIds(i));
        relationIds.order = orderIds[0] || '';
        return {
            id: node.id(),
            type: 'lineItem',
            createdAt: Number(node.createdAt()),
            updatedAt: Number(node.updatedAt()),
            fields: fields,
            relationIds: relationIds,
        };
    },
    discount: (buffer) => {
        const byteBuffer = new ByteBuffer(buffer);
        const node = Discount.getRootAsDiscount(byteBuffer);
        const fields = {};
        fields.code = node.code();
        fields.percentage = node.percentage();
        const relationIds = {};
        return {
            id: node.id(),
            type: 'discount',
            createdAt: Number(node.createdAt()),
            updatedAt: Number(node.updatedAt()),
            fields: fields,
            relationIds: relationIds,
        };
    },
    payment: (buffer) => {
        const byteBuffer = new ByteBuffer(buffer);
        const node = Payment.getRootAsPayment(byteBuffer);
        const fields = {};
        fields.amount = node.amount();
        fields.status = node.status();
        fields.gatewayId = node.gatewayId();
        const relationIds = {};
        const orderIds = Array.from({ length: node.orderIdsLength() }, (_, i) => node.orderIds(i));
        relationIds.order = orderIds[0] || '';
        return {
            id: node.id(),
            type: 'payment',
            createdAt: Number(node.createdAt()),
            updatedAt: Number(node.updatedAt()),
            fields: fields,
            relationIds: relationIds,
        };
    },
    shipment: (buffer) => {
        const byteBuffer = new ByteBuffer(buffer);
        const node = Shipment.getRootAsShipment(byteBuffer);
        const fields = {};
        fields.address = node.address();
        fields.status = node.status();
        const relationIds = {};
        const orderIds = Array.from({ length: node.orderIdsLength() }, (_, i) => node.orderIds(i));
        relationIds.order = orderIds[0] || '';
        const warehouseIds = Array.from({ length: node.warehouseIdsLength() }, (_, i) => node.warehouseIds(i));
        relationIds.warehouse = warehouseIds[0] || '';
        return {
            id: node.id(),
            type: 'shipment',
            createdAt: Number(node.createdAt()),
            updatedAt: Number(node.updatedAt()),
            fields: fields,
            relationIds: relationIds,
        };
    },
    notification: (buffer) => {
        const byteBuffer = new ByteBuffer(buffer);
        const node = Notification.getRootAsNotification(byteBuffer);
        const fields = {};
        fields.type = node.type();
        fields.status = node.status();
        const relationIds = {};
        const orderIds = Array.from({ length: node.orderIdsLength() }, (_, i) => node.orderIds(i));
        relationIds.order = orderIds[0] || '';
        return {
            id: node.id(),
            type: 'notification',
            createdAt: Number(node.createdAt()),
            updatedAt: Number(node.updatedAt()),
            fields: fields,
            relationIds: relationIds,
        };
    },
};
