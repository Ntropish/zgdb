import { z } from "zod";
import { toMatchSpecificSnapshot } from "jest-specific-snapshot";
import { parseSchemas } from "../../parser/index.js";
import { RawSchema } from "../../parser/types.js";
import { generateFbs, generateTable, generateField } from "../generator.js";

// The type definitions for 'jest-specific-snapshot' are not fully compatible
// with modern versions of Jest's types, so we use a type assertion to resolve it.
expect.extend({ toMatchSpecificSnapshot: toMatchSpecificSnapshot as any });

describe("FBS Generator", () => {
  it("should generate a correct FBS schema string from a complex normalized schema", () => {
    // 1. Define a complex raw schema with nested objects.
    const rawUserProfileSchema: RawSchema = {
      name: "UserProfile",
      description: "A user's profile with deeply nested settings.",
      schema: z.object({
        id: z.string(),
        preferences: z.object({
          theme: z.enum(["dark", "light"]).default("dark"),
          notifications: z.object({
            email: z.boolean().default(true),
            push: z.boolean().optional(),
          }),
        }),
      }),
      auth: {
        read: [{ policy: "owner" }],
        update: [{ policy: "owner" }, { capability: "admin" }],
      },
    };

    // 2. Parse it into our IR.
    const normalizedSchemas = parseSchemas([rawUserProfileSchema]);

    // 3. Generate the FBS string from the IR.
    const fbsContent = generateFbs(normalizedSchemas);

    // 4. Compare the output to a stored snapshot in a specific file.
    const snapshotPath = "./__snapshots__/UserProfile.fbs.snap";
    expect(fbsContent).toMatchSpecificSnapshot(snapshotPath);
  });
});

describe("generateTable", () => {
  it("should generate a basic table with fields", () => {
    const schema: any = {
      name: "Test",
      fields: [
        { name: "id", type: "string" },
        { name: "value", type: "long" },
      ],
      relationships: [],
      manyToMany: [],
    };
    const expected = `table Test {\n  id: string;\n  value: long;\n}`;
    expect(generateTable(schema).trim()).toBe(expected);
  });

  it("should include a documentation comment if description is provided", () => {
    const schema: any = {
      name: "Test",
      description: "This is a test table.",
      fields: [{ name: "id", type: "string" }],
      relationships: [],
      manyToMany: [],
    };
    const expected = `/// This is a test table.\n\ntable Test {\n  id: string;\n}`;
    expect(generateTable(schema).trim()).toBe(expected);
  });

  it("should include an auth comment block if auth rules are provided", () => {
    const schema: any = {
      name: "Test",
      fields: [{ name: "id", type: "string" }],
      auth: {
        read: [{ policy: "owner" }],
        update: [{ capability: "admin" }, { policy: "owner" }],
      },
      relationships: [],
      manyToMany: [],
    };
    const expected = `///\n/// Authorization Rules:\n    //   - read: requires ONE OF:\n    //     - Policy: owner\n    //   - update: requires ONE OF:\n    //     - Capability: admin\n    //     - Policy: owner\n\ntable Test {\n  id: string;\n}`;
    expect(generateTable(schema).trim()).toBe(expected.trim());
  });
});
