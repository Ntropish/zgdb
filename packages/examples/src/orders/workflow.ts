import { createClient } from "./dist/graph/zgdb-client.js";
import { MapStoreAdapter } from "../map-store-adapter.js";

async function main() {
  const db = createClient(new MapStoreAdapter());

  // Setup: Create a customer and some products
  const { customer, products } = await db.transact(async (tx) => {
    const customer = await tx.createNode("customer", {
      fields: { name: "John Doe", email: "john.doe@example.com" },
      relationIds: { orders: [] },
    });
    const product1 = await tx.createNode("product", {
      fields: { name: "Laptop", price: 1200, stock: 10 },
      relationIds: {},
    });
    const product2 = await tx.createNode("product", {
      fields: { name: "Mouse", price: 75, stock: 50 },
      relationIds: {},
    });
    return { customer, products: [product1, product2] };
  });

  // --- The Main Transaction ---
  // Create an order for 2 laptops and 1 mouse.
  const shoppingCart = [
    { productId: products[0]?.id, quantity: 2 },
    { productId: products[1]?.id, quantity: 1 },
  ];

  try {
    const newOrder = await db.transact(async (tx) => {
      let orderTotal = 0;
      const lineItemIds: string[] = [];

      // 1. Create a LineItem for each item in the cart
      for (const item of shoppingCart) {
        const product = await tx.getNode("product", item.productId!);
        if (!product || product.fields.stock < item.quantity) {
          throw new Error(
            `Not enough stock for product: ${product?.fields.name}`
          );
        }

        // 2. Decrement stock
        await tx.updateNode("product", product.id, (draft) => {
          draft.fields.stock -= item.quantity;
        });

        // 3. Create the line item, capturing the price at time of sale
        const lineItem = await tx.createNode("lineItem", {
          fields: {
            quantity: item.quantity,
            purchasePrice: product.fields.price,
          },
          relationIds: { order: "", product: product.id }, // Order ID is temporary
        });

        orderTotal += product.fields.price * item.quantity;
        lineItemIds.push(lineItem.id);
      }

      // 4. Create the final order
      const order = await tx.createNode("order", {
        fields: { total: orderTotal, status: "pending" },
        relationIds: { customer: customer.id, lineItems: lineItemIds },
      });

      // 5. Link the line items back to the order
      for (const id of lineItemIds) {
        await tx.updateNode("lineItem", id, (draft) => {
          draft.relationIds.order = order.id;
        });
      }

      // 6. Link the order to the customer
      await tx.updateNode("customer", customer.id, (draft) => {
        draft.relationIds.orders.push(order.id);
      });

      return order;
    });

    console.log("Successfully created order:", newOrder);
    const finalProduct = await db.transact((tx) =>
      tx.getNode("product", products[0]!.id)
    );
    console.log(
      `Final stock for ${finalProduct?.fields.name}:`,
      finalProduct?.fields.stock
    );
  } catch (e: any) {
    console.error("Order failed:", e.message);
  }
}

main();
