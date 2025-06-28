import { describe, it, expect } from "vitest";
import { z } from "zod";
import { parseSchemas } from "../index.js";
import { EntityDef, NormalizedSchema } from "../types.js";

const findSchema = (schemas: NormalizedSchema[], name: string) => {
  return schemas.find((s) => s.name === name);
};

describe("Auth Block Parsing Edge Cases", () => {
  it("Case 1: Should normalize mixed and empty auth rule formats", () => {
    const schemas = parseSchemas({
      entities: {
        Test: {
          name: "Test",
          schema: z.object({ f1: z.string(), f2: z.string() }),
          resolvers: {
            isOwner: () => true,
          },
        },
      },
      auth: {
        Test: {
          create: "isOwner",
          read: [],
          update: ["isOwner", "isAdmin"],
          delete: "isAdmin",
        },
      },
      globalResolvers: {
        isAdmin: () => true,
      },
    });

    const schema = findSchema(schemas, "Test");
    const auth = schema?.auth as any;
    expect(auth.create).toEqual("isOwner");
    expect(auth.read).toEqual([]);
    expect(auth.update).toEqual(["isOwner", "isAdmin"]);
    expect(auth.delete).toEqual("isAdmin");
  });

  it("Case 2: Should handle empty, null, or undefined auth blocks gracefully", () => {
    const schemas1 = parseSchemas({
      entities: {
        Test: { name: "Test", schema: z.object({ f: z.string() }) },
      },
      auth: { Test: {} },
    });
    expect(findSchema(schemas1, "Test")?.auth).toBeDefined();

    const schemas2 = parseSchemas({
      entities: {
        Test: {
          name: "Test",
          schema: z.object({ f: z.string() }),
        },
      },
      auth: undefined,
    });
    expect(findSchema(schemas2, "Test")?.auth).toBeUndefined();
  });

  it("Case 3: Should correctly parse logically contradictory rules without crashing", () => {
    const schemas = parseSchemas({
      entities: {
        Test: {
          name: "Test",
          schema: z.object({ f1: z.string() }),
          resolvers: {
            allow: () => true,
            never: () => false,
          },
        },
      },
      auth: {
        Test: {
          create: ["allow", "never"],
        },
      },
    });

    const schema = findSchema(schemas, "Test");
    const auth = schema?.auth as any;
    expect(auth.create).toEqual(["allow", "never"]);
  });
});
