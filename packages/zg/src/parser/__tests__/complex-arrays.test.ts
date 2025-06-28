import { describe, it, expect } from "vitest";
import { parseSchemas } from "../index.js";
import { EntityDef, NormalizedSchema } from "../types.js";
import { z } from "zod";

describe("Schema Parser Deep Edge Cases: Complex Array and Union Types", () => {
  it("should correctly parse a schema with arrays of objects and return all generated schemas", () => {
    const rawMediaSchema: EntityDef = {
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
    };

    const normalized = parseSchemas({
      entities: { MediaContent: rawMediaSchema },
    });

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
        expect.objectContaining({ name: "id", type: "string", required: true }),
        expect.objectContaining({
          name: "title",
          type: "string",
          required: true,
        }),
        expect.objectContaining({
          name: "versions",
          type: "[MediaContent_Versions]",
          required: true,
        }),
        expect.objectContaining({
          name: "status",
          type: "string",
          required: true,
        }),
        expect.objectContaining({
          name: "legacyId",
          type: "string",
          required: true,
        }),
      ])
    );

    // 2. Validate MediaContent_Versions (Nested from Array)
    const versionsSchema = findSchema("MediaContent_Versions");
    expect(versionsSchema.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "resolution",
          type: "string",
          required: true,
        }),
        expect.objectContaining({
          name: "url",
          type: "string",
          required: true,
        }),
        expect.objectContaining({
          name: "sizeMb",
          type: "long",
          required: true,
        }),
      ])
    );
  });
});
