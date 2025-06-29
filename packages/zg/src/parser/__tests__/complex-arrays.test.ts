import { describe, it, expect } from "vitest";
import { parseSchemas } from "../index.js";
import { EntityDef, NormalizedSchema } from "../types.js";
import { z } from "zod";

const findSchema = (schemas: NormalizedSchema[], name: string) => {
  return schemas.find((s) => s.name === name);
};

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
      entities: [rawMediaSchema],
    });

    // Expect the top-level schema + 1 nested schema from the array
    expect(normalized).toHaveLength(2);

    // 1. Validate MediaContent (Top-level)
    const mediaContent = findSchema(normalized, "MediaContent");
    expect(mediaContent).toBeDefined();

    // 2. Validate MediaContent_Versions (Nested from Array)
    const versionsSchema = findSchema(normalized, "MediaContent_Versions");
    expect(versionsSchema).toBeDefined();
  });
});
