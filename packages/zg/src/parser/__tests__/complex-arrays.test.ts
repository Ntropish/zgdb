import { parseSchemas } from "../index.js";
import { RawSchema } from "../types.js";
import { z } from "zod";

describe("Schema Parser Deep Edge Cases: Complex Array and Union Types", () => {
  it("should correctly parse a schema with arrays of objects and return all generated schemas", () => {
    const rawMediaSchema: RawSchema = {
      name: "MediaContent",
      description: "A schema for various types of media content.",
      schema: z.object({
        id: z.string(),
        title: z.string(),
        // An array of nested objects
        versions: z.array(
          z.object({
            resolution: z.string(), // e.g., "1080p", "4k"
            url: z.string().url(),
            sizeMb: z.number(),
          })
        ),
        // A field that can be one of several literal types
        status: z.union([
          z.literal("draft"),
          z.literal("published"),
          z.literal("archived"),
        ]),
        // A field that can be a string or a number
        legacyId: z.union([z.string(), z.number()]),
      }),
      relationships: {},
    };

    const normalized = parseSchemas([rawMediaSchema]);

    // Expect the top-level schema + 1 nested schema from the array
    expect(normalized).toHaveLength(2);

    const findSchema = (name: string) => {
      const schema = normalized.find((s) => s.name === name);
      if (!schema) {
        throw new Error(
          `Schema with name "${name}" not found in parser output.`
        );
      }
      return schema;
    };

    // 1. Validate MediaContent (Top-level)
    const mediaContent = findSchema("MediaContent");
    expect(mediaContent.fields).toEqual(
      expect.arrayContaining([
        { name: "id", type: "string", required: true },
        { name: "title", type: "string", required: true },
        {
          name: "versions",
          type: "[MediaContent_Versions]",
          required: true,
        },
        { name: "status", type: "string", required: true },
        { name: "legacyId", type: "string", required: true },
      ])
    );

    // 2. Validate MediaContent_Versions (Nested from Array)
    const versionsSchema = findSchema("MediaContent_Versions");
    expect(versionsSchema.fields).toEqual([
      { name: "resolution", type: "string", required: true },
      { name: "url", type: "string", required: true },
      { name: "sizeMb", type: "long", required: true },
    ]);
  });
});
