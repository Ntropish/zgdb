import { describe, it, expect } from "vitest";
import { z } from "zod";
import { parseSchemas } from "../index.js";
import { ZGEntityDef, NormalizedSchema } from "../types.js";

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
          auth: {
            create: "isOwner",
            read: [],
            update: ["isOwner", "isAdmin"],
            delete: "isAdmin",
          },
          resolvers: {
            isOwner: () => true,
          },
        },
      },
      globalResolvers: {
        isAdmin: () => true,
      },
    });

    const schema = findSchema(schemas, "Test");
    const auth = schema?.auth as any;
    expect(auth.create).toEqual([0]);
    expect(auth.read).toEqual([]);
    expect(auth.update).toEqual([0, -1]);
    expect(auth.delete).toEqual([-1]);
  });

  it("Case 2: Should throw an error for auth rules on non-existent fields or relationships", () => {
    const baseSchema: ZGEntityDef<any> = {
      name: "Test",
      schema: z.object({ id: z.string() }),
    };

    expect(() => {
      parseSchemas({
        entities: {
          Test: { ...baseSchema, auth: { fields: { bad: { read: "p" } } } },
        },
        globalResolvers: { p: () => true },
      });
    }).toThrow("[Test] Auth rule defined for non-existent field: 'bad'");

    expect(() => {
      parseSchemas({
        entities: {
          Test: {
            ...baseSchema,
            auth: { relationships: { bad: { read: "p" } } },
          },
        },
        globalResolvers: { p: () => true },
      });
    }).toThrow("[Test] Auth rule defined for non-existent relationship: 'bad'");
  });

  it("Case 3: Should handle empty, null, or undefined auth blocks gracefully", () => {
    const schemas1 = parseSchemas({
      entities: {
        Test: { name: "Test", schema: z.object({ f: z.string() }), auth: {} },
      },
    });
    expect(findSchema(schemas1, "Test")?.auth).toBeDefined();

    const schemas2 = parseSchemas({
      entities: {
        Test: {
          name: "Test",
          schema: z.object({ f: z.string() }),
          auth: undefined,
        },
      },
    });
    expect(findSchema(schemas2, "Test")?.auth).toBeDefined();
  });

  it("Case 4: Should correctly parse logically contradictory rules without crashing", () => {
    const schemas = parseSchemas({
      entities: {
        Test: {
          name: "Test",
          schema: z.object({ f1: z.string() }),
          auth: {
            create: ["allow", "never"],
          },
          resolvers: {
            allow: () => true,
            never: () => false,
          },
        },
      },
    });

    const schema = findSchema(schemas, "Test");
    const auth = schema?.auth as any;
    expect(auth.create).toEqual([0, 1]);
  });

  it("Case 5: Should correctly parse auth rules for complex relationship types", () => {
    const schemas = parseSchemas({
      entities: {
        Post: {
          name: "Post",
          schema: z.object({ title: z.string() }),
          manyToMany: {
            tags: {
              node: "Tag",
              through: "PostTag",
              myKey: "postId",
              theirKey: "tagId",
            },
          },
          auth: {
            relationships: {
              tags: {
                add: "isPostOwner",
                remove: ["isPostOwner", "isAdmin"],
              },
            },
          },
          resolvers: {
            isPostOwner: () => true,
          },
        },
        Tag: {
          name: "Tag",
          schema: z.object({ name: z.string() }),
        },
        PostTag: {
          name: "PostTag",
          schema: z.object({ postId: z.string(), tagId: z.string() }),
        },
      },
      globalResolvers: {
        isAdmin: () => true,
      },
    });
    const schema = findSchema(schemas, "Post");
    const auth = schema?.auth as any;
    expect(auth.relationships.tags.add).toEqual([0]);
    expect(auth.relationships.tags.remove).toEqual([0, -1]);
  });
});
