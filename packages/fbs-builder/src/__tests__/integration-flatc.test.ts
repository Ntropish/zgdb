import { describe, it, expect } from "vitest";
import {
  createFbsBuilder,
  createInitialFbsFileState,
  renderFbs,
} from "../index.js";
import { runFlatc } from "./test-utils.js";

describe("Integration Test: flatc Compilation", () => {
  describe("A complex schema with includes and attributes", () => {
    it("should produce a schema that flatc can compile without errors", async () => {
      const builder = createFbsBuilder();

      builder.namespace("NexusMart.Orders");
      builder.include("timestamp.fbs");
      builder.file_identifier("NEXO");
      builder.file_extension("order");

      builder
        .table("Address")
        .field("street", "string")
        .field("city", "string")
        .field("state", "string")
        .field("zip", "string");

      builder
        .table("Customer")
        .field("id", "string", { attributes: { key: true } })
        .field("name", "string")
        .field("billing_address", "Address");

      builder
        .table("Product")
        .field("sku", "string", { attributes: { required: true } })
        .field("name", "string")
        .field("quantity", "ushort", { defaultValue: 1 });

      builder
        .table("Order")
        .field("order_id", "string")
        .field("created_at", "Google.Protobuf.Timestamp")
        .field("customer", "Customer")
        .field("products", "[Product]")
        .field("shipping_address", "Address");

      builder.root_type("Order");

      const initialState = createInitialFbsFileState();
      await builder.build(initialState);
      const schema = renderFbs(initialState);

      const timestampFbs =
        "namespace Google.Protobuf;\n\ntable Timestamp { seconds: long; nanos: int; }";
      const includeFiles = new Map([["timestamp.fbs", timestampFbs]]);

      await runFlatc(schema, "NexusMart.fbs", includeFiles);
    }, 10000); // Give it a generous timeout
  });
});
