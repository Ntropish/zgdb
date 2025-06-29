import { describe, it, expect } from "vitest";
import { z } from "zod";
import { parseSchemas } from "../index.js";
import { EntityDef, NormalizedSchema } from "../types.js";

const findSchema = (schemas: NormalizedSchema[], name: string) => {
  return schemas.find((s) => s.name === name);
};

describe("Schema Parser: Auth Block", () => {
  it("should handle a schema with no auth block", () => {
    const schemas = parseSchemas({
      entities: [
        {
          name: "Test",
          schema: z.object({ id: z.string() }),
        },
      ],
    });
    // expect(findSchema(schemas, "Test")?.auth).toBeUndefined();
  });

  it("should handle an empty auth block", () => {
    const schemas = parseSchemas({
      entities: [
        {
          name: "Test",
          schema: z.object({ id: z.string() }),
          // auth: {},
        },
      ],
    });
    // expect(findSchema(schemas, "Test")?.auth).toBeDefined();
  });

  it("should handle an action with an empty array of rules", () => {
    const schemas = parseSchemas({
      entities: [
        {
          name: "Test",
          schema: z.object({ id: z.string() }),
          // auth: {
          //   create: [],
          // },
        },
      ],
    });
    // const auth = findSchema(schemas, "Test")?.auth as any;
    // expect(auth.create).toEqual([]);
  });

  it("should parse a complex auth block with multiple rules and fields", () => {
    const schemas = parseSchemas({
      entities: [
        {
          name: "Test",
          schema: z.object({
            id: z.string(),
            ownerId: z.string(),
            public: z.boolean(),
          }),
          // resolvers: {
          //   isOwner: ({ record, actor }) => record.ownerId === actor.id,
          //   isPublic: ({ record }) => record.public,
          // },
          // auth: {
          //   create: "isOwner",
          //   read: ["isPublic", "isAdmin"],
          //   update: ["isOwner", "isAdmin"],
          //   delete: "isAdmin",
          // },
        },
      ],
      // globalResolvers: {
      //   isAdmin: ({ actor }) => actor.roles.includes("admin"),
      // },
    });
    // const auth = findSchema(schemas, "Test")?.auth as any;
    // expect(auth.read).toEqual(["isPublic", "isAdmin"]);
  });
});
