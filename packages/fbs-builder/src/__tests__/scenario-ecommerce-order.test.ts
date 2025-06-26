import { describe, it, expect } from "vitest";
import {
  createFbsBuilder,
  createInitialFbsFileState,
  renderFbs,
} from "../index.js";
import { runFlatc } from "./test-utils.js";

describe("Scenario Test: NexusMart - E-commerce Order Manifest", () => {
  it("should generate a schema for a self-contained order manifest file", async () => {
    const builder = createFbsBuilder();
    const initialState = createInitialFbsFileState();

    /**
     * SCENARIO: NexusMart, an e-commerce platform, needs to generate a
     * manifest file for each order. This file will be sent to their
     * fulfillment centers. The file needs to be self-describing, containing
     * customer info, a list of products, and shipping details.
     *
     * FEATURES TESTED:
     * - `file_identifier` to uniquely identify these files as order manifests.
     * - `file_extension` to specify a custom file extension.
     * - Multiple tables with relationships (Order -> Customer, Order -> Product).
     * - `key` attribute on a field for potential binary search lookup.
     * - A table (`Address`) used in multiple other tables.
     */

    builder.namespace("NexusMart.Orders");
    builder.file_identifier("NEXO"); // NexusMart Order
    builder.file_extension("order");

    // A reusable Address table for both billing and shipping.
    builder
      .table("Address")
      .docs("A standard postal address.")
      .field("line1", "string")
      .field("line2", "string")
      .field("city", "string")
      .field("state", "string")
      .field("zip", "string");

    // Table for customer information.
    builder
      .table("Customer")
      .docs("Represents a customer.")
      .field("id", "string", { attributes: { key: true } })
      .field("name", "string")
      .field("billing_address", "Address");

    // Table for an individual product in the order.
    builder
      .table("Product")
      .docs("Represents a product in the catalog.")
      .field("sku", "string", { attributes: { required: true } })
      .field("name", "string")
      .field("quantity", "ushort", { defaultValue: 1 });

    // The root table for the entire order manifest.
    builder
      .table("Order")
      .docs("The root table for an order manifest.")
      .field("order_id", "string")
      .field("customer", "Customer")
      .field("products", "Product", { isVector: true })
      .field("shipping_address", "Address");

    builder.root_type("Order");

    // Build and render the schema
    const finalState = await builder.build(initialState);
    const result = renderFbs(finalState);

    // The output will be compared against a snapshot.
    expect(result).toMatchSnapshot();

    // It should also be a valid FlatBuffers schema.
    await runFlatc(result, "ecommerce_order.fbs");
  });
});
