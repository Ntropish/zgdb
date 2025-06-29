import { describe, it, expect } from "vitest";
import { parseSchemas } from "../index.js";
import { EntityDef, NormalizedSchema } from "../types.js";
import { z } from "zod";

const findSchema = (schemas: NormalizedSchema[], name: string) => {
  const schema = schemas.find((s) => s.name === name);
  if (!schema) {
    throw new Error(`Schema with name "${name}" not found in parser output.`);
  }
  return schema;
};

describe("Schema Parser Deep Edge Cases: Deeply Nested Objects", () => {
  it("should correctly parse a schema with multiple levels of nested objects and return all generated schemas", () => {
    const rawUserProfileSchema: EntityDef = {
      name: "UserProfile",
      description: "A comprehensive user profile schema.",
      schema: z.object({
        userId: z.string(),
        username: z.string(),
        preferences: z.object({
          theme: z.enum(["light", "dark"]),
          notifications: z.object({
            email: z.object({
              marketing: z.boolean().default(false),
              invoices: z.boolean().default(true),
            }),
            push: z.object({
              newMessages: z.boolean(),
              friendRequests: z.boolean(),
            }),
          }),
        }),
      }),
    };

    const normalized = parseSchemas({ entities: [rawUserProfileSchema] });

    // Expect the top-level schema + 4 nested schemas
    expect(normalized).toHaveLength(5);

    // Assertions for each schema can be added here
  });
});
