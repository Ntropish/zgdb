import { parseSchemas } from "../index.js";
import { RawSchema } from "../types.js";
import { z } from "zod";

describe("Schema Parser: Auth Block", () => {
  it("should handle a schema with no auth block", () => {
    const rawSchema: RawSchema = {
      name: "Test",
      schema: z.object({ id: z.string() }),
    };
    const normalized = parseSchemas([rawSchema]);
    expect(normalized[0].auth).toEqual({});
  });

  it("should handle an empty auth block", () => {
    const rawSchema: RawSchema = {
      name: "Test",
      schema: z.object({ id: z.string() }),
      auth: {},
    };
    const normalized = parseSchemas([rawSchema]);
    expect(normalized[0].auth).toEqual({});
  });

  it("should handle an action with an empty array of rules", () => {
    const rawSchema: RawSchema = {
      name: "Test",
      schema: z.object({ id: z.string() }),
      auth: {
        create: [],
      },
    };
    const normalized = parseSchemas([rawSchema]);
    expect(normalized[0].auth).toEqual({ create: [] });
  });

  it("should parse a complex auth block with multiple rules", () => {
    const rawSchema: RawSchema = {
      name: "Post",
      schema: z.object({ id: z.string(), authorId: z.string() }),
      auth: {
        create: [{ capability: "post:create" }],
        read: [{ policy: "public" }],
        update: [{ policy: "owner" }, { capability: "post:update" }],
        delete: [{ policy: "owner" }, { capability: "post:delete" }],
        addComment: [{ capability: "user" }],
        removeComment: [
          { policy: "owner" },
          { policy: "target.owner" },
          { capability: "comment:delete" },
        ],
      },
    };
    const normalized = parseSchemas([rawSchema]);
    expect(normalized[0].auth).toEqual({
      create: [{ capability: "post:create" }],
      read: [{ policy: "public" }],
      update: [{ policy: "owner" }, { capability: "post:update" }],
      delete: [{ policy: "owner" }, { capability: "post:delete" }],
      addComment: [{ capability: "user" }],
      removeComment: [
        { policy: "owner" },
        { policy: "target.owner" },
        { capability: "comment:delete" },
      ],
    });
  });
});
