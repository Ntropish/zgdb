import { createClient } from "./dist/graph/index.js";
import { MapStoreAdapter } from "@zgdb/runtime";
// STAGE 1: Reserve stock and lock the cart
async function reserveStockAndBeginCheckout(db, cartId) {
    return db.transact(async (tx) => {
        const cart = await tx.getNode("cart", cartId);
        if (!cart || cart.fields.status !== "active")
            throw new Error("Cart is not active.");
        const cartItems = JSON.parse(cart.fields.itemsJson);
        if (cartItems.length === 0)
            throw new Error("Cannot checkout an empty cart.");
        for (const item of cartItems) {
            const product = await tx.getNode("product", item.productId);
            if (!product)
                throw new Error(`Product ${item.productId} not found.`);
            if (product.fields.stock - product.fields.reserved < item.quantity) {
                throw new Error(`Not enough stock for ${product.fields.name}.`);
            }
            await tx.updateNode("product", product.id, (d) => {
                d.fields.reserved += item.quantity;
            });
        }
        // Lock the cart to prevent changes during checkout
        return await tx.updateNode("cart", cartId, (d) => {
            d.fields.status = "processing";
        });
    });
}
// STAGE 2: Simulate processing payment
async function processPayment(db, cartId) {
    return db.transact(async (tx) => {
        const cart = await tx.getNode("cart", cartId);
        if (!cart)
            throw new Error("Cart not found.");
        let subTotal = 0;
        for (const item of JSON.parse(cart.fields.itemsJson)) {
            const product = await tx.getNode("product", item.productId);
            subTotal += (product?.fields.price || 0) * item.quantity;
        }
        const discount = cart.relationIds.discount
            ? await tx.getNode("discount", cart.relationIds.discount)
            : null;
        const finalTotal = subTotal * (1 - (discount?.fields.percentage || 0) / 100);
        // Simulate API call to payment gateway
        const paymentSuccess = Math.random() > 0.1; // 90% success rate
        if (!paymentSuccess) {
            await tx.updateNode("cart", cartId, (d) => {
                d.fields.status = "failed";
            });
            return { success: false };
        }
        return { success: true, gatewayId: `ch_${Date.now()}`, finalTotal };
    });
}
// STAGE 3: Finalize the order after successful payment
async function finalizeOrder(db, cartId, paymentGatewayId, finalTotal) {
    return db.transact(async (tx) => {
        const cart = await tx.getNode("cart", cartId);
        const customer = await tx.getNode("customer", cart.relationIds.customer);
        const shippingAddress = (await tx.getNode("address", customer.relationIds.addresses[0]));
        const cartItems = JSON.parse(cart.fields.itemsJson);
        // Create line items, shipments, and notifications
        const lineItems = [];
        const shipments = {};
        for (const item of cartItems) {
            const product = await tx.getNode("product", item.productId);
            const lineItem = await tx.createNode("lineItem", {
                fields: {
                    quantity: item.quantity,
                    purchasePrice: product.fields.price,
                    status: "fulfilled",
                },
                relationIds: { product: product.id, order: "" },
            });
            lineItems.push(lineItem);
            // Group line items by warehouse for shipment
            const whId = product.relationIds.warehouse;
            if (!shipments[whId]) {
                shipments[whId] = {
                    warehouseId: whId,
                    address: `${shippingAddress.fields.street}, ${shippingAddress.fields.city}`,
                    lineItems: [],
                };
            }
            shipments[whId].lineItems.push(lineItem);
            // Convert reservation to sale
            await tx.updateNode("product", product.id, (d) => {
                d.fields.stock -= item.quantity;
                d.fields.reserved -= item.quantity;
            });
        }
        // Create a shipment record for each warehouse involved
        const shipmentIds = (await Promise.all(Object.values(shipments).map((s) => tx.createNode("shipment", {
            fields: { address: s.address, status: "preparing" },
            relationIds: { order: "", warehouse: s.warehouseId },
        })))).map((s) => s.id);
        // Create payment and notification records
        const payment = await tx.createNode("payment", {
            fields: {
                amount: finalTotal,
                status: "succeeded",
                gatewayId: paymentGatewayId,
            },
            relationIds: { order: "" },
        });
        const notifications = [
            await tx.createNode("notification", {
                fields: { type: "order_confirmation", status: "pending" },
                relationIds: { order: "" },
            }),
        ];
        if (Object.keys(shipments).length > 0) {
            notifications.push(await tx.createNode("notification", {
                fields: { type: "warehouse_fulfillment", status: "pending" },
                relationIds: { order: "" },
            }));
        }
        // CREATE THE MASTER ORDER RECORD
        const order = await tx.createNode("order", {
            fields: { total: finalTotal, status: "pending_fulfillment" },
            relationIds: {
                customer: customer.id,
                lineItems: lineItems.map((li) => li.id),
                payment: payment.id,
                shipment: shipmentIds[0],
                notifications: notifications.map((n) => n.id),
            },
        });
        // Link everything back to the order
        const subDocs = [
            ...lineItems.map((li) => ({ type: "lineItem", id: li.id })),
            ...shipmentIds.map((id) => ({ type: "shipment", id })),
            ...notifications.map((n) => ({ type: "notification", id: n.id })),
            { type: "payment", id: payment.id },
        ];
        for (const doc of subDocs)
            await tx.updateNode(doc.type, doc.id, (d) => {
                d.relationIds.order = order.id;
            });
        // Update customer and mark cart as completed
        await tx.updateNode("customer", customer.id, (d) => {
            d.fields.loyaltyPoints += Math.floor(finalTotal);
            d.relationIds.orders.push(order.id);
        });
        await tx.updateNode("cart", cart.id, (d) => {
            d.fields.itemsJson = "[]";
            d.fields.status = "completed";
        });
        return order;
    });
}
async function main() {
    const db = createClient(new MapStoreAdapter());
    // Setup: A warehouse, a customer with an address, a cart, and some products.
    const { customer, warehouse, cart, product1, product2 } = await db.transact(async (tx) => {
        const warehouse = await tx.createNode("warehouse", {
            fields: { name: "Main Warehouse" },
            relationIds: { products: [] },
        });
        const product1 = await tx.createNode("product", {
            fields: { name: "Laptop", price: 1200, stock: 5, reserved: 0 },
            relationIds: { warehouse: warehouse.id },
        });
        const product2 = await tx.createNode("product", {
            fields: { name: "Mouse", price: 75, stock: 50, reserved: 0 },
            relationIds: { warehouse: warehouse.id },
        });
        const address = await tx.createNode("address", {
            fields: {
                type: "shipping",
                street: "123 Main St",
                city: "Anytown",
                zip: "12345",
            },
            relationIds: { customer: "" },
        });
        const cart = await tx.createNode("cart", {
            fields: { itemsJson: "[]", status: "active" },
            relationIds: { customer: "", discount: "" },
        });
        const customer = await tx.createNode("customer", {
            fields: {
                name: "Jane Doe",
                email: "jane.doe@example.com",
                loyaltyPoints: 100,
            },
            relationIds: { orders: [], cart: cart.id, addresses: [address.id] },
        });
        await tx.updateNode("cart", cart.id, (d) => {
            d.relationIds.customer = customer.id;
        });
        await tx.updateNode("address", address.id, (d) => {
            d.relationIds.customer = customer.id;
        });
        await tx.updateNode("warehouse", warehouse.id, (d) => {
            d.relationIds.products.push(product1.id, product2.id);
        });
        return { customer, warehouse, cart, product1, product2 };
    });
    // Action 1: Customer adds items to cart
    await db.transact(async (tx) => {
        const cartItems = JSON.stringify([
            { productId: product1.id, quantity: 1 },
            { productId: product2.id, quantity: 2 },
        ]);
        await tx.updateNode("cart", cart.id, (d) => {
            d.fields.itemsJson = cartItems;
        });
    });
    // --- The Main Checkout Saga ---
    try {
        console.log("Beginning checkout...");
        await reserveStockAndBeginCheckout(db, cart.id);
        console.log("✅ Stock reserved, cart is now processing.");
        const { success, gatewayId, finalTotal } = await processPayment(db, cart.id);
        if (!success)
            throw new Error("Payment failed. Please try again.");
        console.log(`✅ Payment successful (Gateway ID: ${gatewayId}).`);
        const finalOrder = await finalizeOrder(db, cart.id, gatewayId, finalTotal);
        console.log(`✅ Order ${finalOrder.id} finalized successfully!`);
        const finalCustomer = await db.transact((tx) => tx.getNode("customer", customer.id));
        console.log(`\nFinal loyalty points for ${finalCustomer.fields.name}: ${finalCustomer.fields.loyaltyPoints}`);
    }
    catch (e) {
        console.error("\n❌ Checkout Saga Failed:", e.message);
        // In a real app, you would add logic here to un-reserve the stock.
    }
}
main();
