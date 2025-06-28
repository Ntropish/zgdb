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
    expect(authSchema?.auth).toBeUndefined();
  });

  it("should handle an empty auth block", () => {
    const schemas = parseSchemas({
      entities: {
        Test: { name: "Test", schema: z.object({ f: z.string() }) },
      },
      auth: {
        Test: {},
      },
    });
    const authSchema = findSchema(schemas, "Test");
    expect(authSchema?.auth).toBeDefined();
    expect(authSchema?.auth).toEqual({});
  });

  it("should handle an action with an empty array of rules", () => {
    const schemas = parseSchemas({
      entities: {
        Test: {
          name: "Test",
          schema: z.object({ f: z.string() }),
        },
      },
      auth: {
        Test: {
          create: [],
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
          resolvers: {
            isAuthor: () => true,
          },
        },
      },
      auth: {
        Post: {
          create: "isAuthor",
          read: "isAuthor",
          update: ["isAuthor", "isAdmin"],
        },
      },
      globalResolvers: {
        isAdmin: () => true,
      },
    });

    const postSchema = findSchema(schemas, "Post");
    expect(postSchema).toBeDefined();
    const auth = postSchema?.auth as any;
    expect(auth.create).toEqual("isAuthor");
    expect(auth.update).toEqual(["isAuthor", "isAdmin"]);
  });
});
