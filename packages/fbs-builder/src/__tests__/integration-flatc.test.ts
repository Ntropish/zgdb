import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import {
  createFbsBuilder,
  createInitialFbsFileState,
  renderFbs,
} from "../index.js";

const execAsync = promisify(exec);

// Helper function to check if flatc is in the system's PATH
async function isFlatcAvailable(): Promise<boolean> {
  try {
    await execAsync("flatc --version");
    return true;
  } catch (e) {
    console.warn(
      "flatc compiler not found in PATH. Skipping flatc integration tests."
    );
    return false;
  }
}

const flatcIsAvailable = await isFlatcAvailable();

describe.skipIf(!flatcIsAvailable)(
  "Integration Test: flatc Compilation",
  () => {
    const tempDir = path.resolve(__dirname, "temp_flatc_integration");
    const timestampSchema = `// A simple timestamp schema for inclusion.
table Timestamp {
  seconds: long;
}
`;

    beforeAll(async () => {
      await fs.mkdir(tempDir, { recursive: true });
      await fs.writeFile(path.join(tempDir, "timestamp.fbs"), timestampSchema);
    });

    afterAll(async () => {
      await fs.rm(tempDir, { recursive: true, force: true });
    });

    it("should produce a schema that flatc can compile without errors", async () => {
      /**
       * SCENARIO: We use the NexusMart e-commerce manifest, which includes
       * multiple tables, includes, and file attributes. We then feed the
       * generated schema to the official `flatc` compiler. A successful
       * compilation (exit code 0, no stderr) is the ultimate proof that our
       * builder produces a valid schema.
       */
      // Step 1: Define the schema using the builder
      const builder = createFbsBuilder();

      // Example from https://flatbuffers.dev/flatbuffers_guide_writing_schema.html
      // but with file attributes to test ordering
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

      // Step 2: Create a temporary directory for flatc execution
      const schemaPath = path.join(tempDir, "NexusMart.fbs");
      await fs.writeFile(
        path.join(tempDir, "timestamp.fbs"),
        "namespace Google.Protobuf;\n\ntable Timestamp { seconds: long; nanos: int; }"
      );
      await fs.writeFile(schemaPath, schema);

      // Step 3: Run flatc
      const flatcCmd = `flatc --ts --include-prefix . -o "${tempDir}" "${schemaPath}"`;

      try {
        const { stderr } = await execAsync(flatcCmd, { cwd: tempDir });
        // A valid schema should produce no errors.
        expect(stderr).toBe("");
      } catch (e: any) {
        // If the command itself fails, we print the details and fail the test.
        console.error("flatc compilation failed:", e.stdout, e.stderr);
        throw e;
      } finally {
        // Step 4: Clean up the temporary directory
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    }, 10000); // Give it a generous timeout
  }
);
