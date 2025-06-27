import { describe, it, expect } from "vitest";
import { parseSchemas } from "../index.js";
import { ZGEntityDef } from "../types.js";
import { z } from "zod";

describe("Schema Parser: Auth Block", () => {
  it("should handle a schema with no auth block", () => {
    const rawSchema: ZGEntityDef<any> = {
      name: "Test",
      schema: z.object({ id: z.string() }),
    };
    const normalized = parseSchemas({ entities: { Test: rawSchema } });
    expect(normalized[0].auth).toEqual({ fields: {}, relationships: {} });
  });

  it("should handle an empty auth block", () => {
    const rawSchema: ZGEntityDef<any> = {
      name: "Test",
      schema: z.object({ id: z.string() }),
      auth: {},
    };
    const normalized = parseSchemas({ entities: { Test: rawSchema } });
    expect(normalized[0].auth).toEqual({ fields: {}, relationships: {} });
  });

  it("should handle an action with an empty array of rules", () => {
    const rawSchema: ZGEntityDef<any> = {
      name: "Test",
      schema: z.object({ id: z.string() }),
      auth: {
        create: [],
      },
    };
    const normalized = parseSchemas({ entities: { Test: rawSchema } });
    expect(normalized[0].auth!.create).toEqual([]);
    expect(normalized[0].auth!.read).toBeUndefined();
  });

  it("should parse a complex auth block with multiple rules and fields", () => {
    const rawSchema: ZGEntityDef<any, string> = {
      name: "Post",
      schema: z.object({
        id: z.string(),
        authorId: z.string(),
        privateNotes: z.string(),
      }),
      auth: {
        create: "isAuthor",
        read: ["isPublic"],
        update: ["isAuthor", "hasAdminRights"],
        delete: "hasAdminRights",
        fields: {
          privateNotes: {
            read: "isAuthor",
            update: "isAuthor",
          },
        },
      },
    };
    const normalized = parseSchemas({
      entities: { Post: rawSchema },
      policies: {
        isAuthor: () => true,
        isPublic: () => true,
        hasAdminRights: () => true,
      },
    });
    // isAuthor: -1, isPublic: -2, hasAdminRights: -3
    expect(normalized[0].auth).toEqual({
      create: [-1],
      read: [-2],
      update: [-1, -3],
      delete: [-3],
      fields: {
        privateNotes: {
          read: [-1],
          update: [-1],
        },
      },
      relationships: {},
    });
  });
});
