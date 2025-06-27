import { describe, it, expect } from "vitest";
import { z } from "zod";
import { parseSchemas } from "../index.js";
import type { ZGEntityDef, AuthBlock } from "../types.js";

// Helper to create a minimal valid schema for testing
const createMockSchema = (
  auth?: AuthBlock<string>
): ZGEntityDef<any, string> => ({
  name: "TestSchema",
  schema: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().optional(),
  }),
  relationships: {
    User: {
      author: {
        cardinality: "one",
        description: "The author of this item.",
      },
    },
  },
  auth,
});

describe("Auth Block Parsing Edge Cases", () => {
  it("Case 1: Should normalize mixed and empty auth rule formats", () => {
    const rawSchema = createMockSchema({
      create: "isOwner",
      read: ["isPublic"],
      update: ["isOwner", "hasAdminRights"],
      // Testing invalid empty array - should be filtered out
      delete: [] as any,
      fields: {
        email: {
          // Testing invalid undefined - should be filtered out
          read: undefined,
          update: "isSelf",
        },
      },
    });

    const [parsed] = parseSchemas([rawSchema]);

    expect(parsed.auth.create).toEqual(["isOwner"]);
    expect(parsed.auth.read).toEqual(["isPublic"]);
    expect(parsed.auth.update).toEqual(["isOwner", "hasAdminRights"]);
    expect(parsed.auth.delete).toBeUndefined(); // Empty rules should be omitted
    expect(parsed.auth.fields?.email.read).toBeUndefined();
    expect(parsed.auth.fields?.email.update).toEqual(["isSelf"]);
  });

  it("Case 2: Should throw an error for auth rules on non-existent fields or relationships", () => {
    const schemaWithBadField = createMockSchema({
      fields: {
        nonExistentField: { read: "isPublic" },
      },
    });
    expect(() => parseSchemas([schemaWithBadField])).toThrow(
      "Auth rule defined for non-existent field: 'nonExistentField'"
    );

    const schemaWithBadRel = createMockSchema({
      relationships: {
        nonExistentRel: { read: "isPublic" },
      },
    });
    expect(() => parseSchemas([schemaWithBadRel])).toThrow(
      "Auth rule defined for non-existent relationship: 'nonExistentRel'"
    );
  });

  it("Case 3: Should handle empty, null, or undefined auth blocks gracefully", () => {
    const schemaWithEmptyAuth = createMockSchema({});
    const schemaWithNullAuth = createMockSchema(null as any); // Test runtime robustness
    const schemaWithUndefinedAuth = createMockSchema(undefined);

    const [parsedEmpty] = parseSchemas([schemaWithEmptyAuth]);
    const [parsedNull] = parseSchemas([schemaWithNullAuth]);
    const [parsedUndefined] = parseSchemas([schemaWithUndefinedAuth]);

    const expectedAuth = { fields: {}, relationships: {} };
    expect(parsedEmpty.auth).toEqual(expectedAuth);
    expect(parsedNull.auth).toEqual(expectedAuth);
    expect(parsedUndefined.auth).toEqual(expectedAuth);
  });

  it("Case 4: Should correctly parse logically contradictory rules without crashing", () => {
    // The parser's job is to normalize, not to perform logical validation.
    // That would be the job of a separate "linter" tool for schemas.
    const rawSchema = createMockSchema({
      read: "never",
      update: "isOwner",
      fields: {
        email: {
          read: ["isPublic", "never"],
        },
      },
    });

    const [parsed] = parseSchemas([rawSchema]);
    expect(parsed.auth.read).toEqual(["never"]);
    expect(parsed.auth.update).toEqual(["isOwner"]);
    expect(parsed.auth.fields?.email.read).toEqual(["isPublic", "never"]);
  });

  it("Case 5: Should correctly parse auth rules for complex relationship types", () => {
    const complexSchema: ZGEntityDef<any, string> = {
      name: "Post",
      schema: z.object({ id: z.string() }),
      relationships: {},
      manyToMany: {
        Post: {
          tags: {
            node: "Tag",
            through: "PostTag",
            myKey: "postId",
            theirKey: "tagId",
          },
        },
      },
      auth: {
        relationships: {
          tags: { add: "isAuthor" }, // This name is implicitly created
        },
      },
    };

    const [parsed] = parseSchemas([complexSchema]);
    expect(parsed.auth.relationships?.tags.add).toEqual(["isAuthor"]);
    // Also test that it throws on a bad many-to-many relationship name
    const badSchema = {
      ...complexSchema,
      auth: {
        relationships: {
          badName: { add: "isAuthor" },
        },
      },
    };
    expect(() => parseSchemas([badSchema])).toThrow(
      "Auth rule defined for non-existent relationship: 'badName'"
    );
  });
});
