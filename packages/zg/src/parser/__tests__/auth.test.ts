import { describe, it, expect } from "vitest";
import { z } from "zod";
import { parseSchemas } from "../index.js";
import { NormalizedSchema } from "../types.js";

const findSchema = (schemas: NormalizedSchema[], name: string) => {
  return schemas.find((s) => s.name === name);
};

describe("Schema Parser: Auth Block", () => {
  it("should handle a schema with no auth block", () => {
    const schemas = parseSchemas({
      entities: {
        Test: { name: "Test", schema: z.object({ f: z.string() }) },
      },
    });
    const authSchema = findSchema(schemas, "Test");
    expect(authSchema?.auth).toBeDefined();
    expect(authSchema?.auth.fields).toEqual({});
  });

  it("should handle an empty auth block", () => {
    const schemas = parseSchemas({
      entities: {
        Test: { name: "Test", schema: z.object({ f: z.string() }), auth: {} },
      },
    });
    const authSchema = findSchema(schemas, "Test");
    expect(authSchema?.auth).toBeDefined();
  });

  it("should handle an action with an empty array of rules", () => {
    const schemas = parseSchemas({
      entities: {
        Test: {
          name: "Test",
          schema: z.object({ f: z.string() }),
          auth: { create: [] },
        },
      },
    });
    const authSchema = findSchema(schemas, "Test");
    expect((authSchema?.auth as any)?.create).toEqual([]);
  });

  it("should parse a complex auth block with multiple rules and fields", () => {
    const schemas = parseSchemas({
      entities: {
        Post: {
          name: "Post",
          schema: z.object({
            title: z.string(),
            content: z.string(),
            ownerId: z.string(),
          }),
          auth: {
            create: "isAuthor",
            read: "isAuthor",
            update: ["isAuthor", "isAdmin"],
            fields: {
              ownerId: {
                create: "isAdmin",
              },
            },
          },
          resolvers: {
            isAuthor: () => true,
          },
        },
      },
      resolvers: {
        isAdmin: () => true,
      },
    });

    const postSchema = findSchema(schemas, "Post");
    expect(postSchema).toBeDefined();
    const auth = postSchema?.auth as any;
    expect(auth.create).toEqual([0]); // local 'isAuthor'
    expect(auth.update).toEqual([0, -1]); // local 'isAuthor', global 'isAdmin'
    expect(auth.fields.ownerId.create).toEqual([-1]); // global 'isAdmin'
  });
});
