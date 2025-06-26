import { parseSchemas } from "../index.js";
import { RawSchema } from "../types.js";
import { z } from "zod";

describe("Schema Parser Deep Edge Cases: Empty and Malformed Schemas", () => {
  it("should handle a schema with no fields", () => {
    const rawNoFieldsSchema: RawSchema = {
      name: "NoFields",
      description: "A schema with only an ID, no other fields.",
      schema: z.object({
        id: z.string(),
      }),
      relationships: {},
    };
    // Let's remove the id to make it truly empty
    delete (rawNoFieldsSchema.schema as any).shape.id;

    const normalized = parseSchemas([rawNoFieldsSchema]);
    expect(normalized).toHaveLength(1);
    expect(normalized[0].fields).toHaveLength(0);
  });

  it("should handle a schema with no relationships", () => {
    const rawNoRelsSchema: RawSchema = {
      name: "NoRels",
      description: "A schema with fields but no relationships.",
      schema: z.object({ id: z.string(), name: z.string() }),
      relationships: {},
    };
    const normalized = parseSchemas([rawNoRelsSchema]);
    expect(normalized).toHaveLength(1);
    expect(normalized[0].relationships).toHaveLength(0);
  });

  it("should handle a schema with no indexes", () => {
    const rawNoIndexesSchema: RawSchema = {
      name: "NoIndexes",
      description: "A schema with no indexes defined.",
      schema: z.object({ id: z.string() }),
    };
    const normalized = parseSchemas([rawNoIndexesSchema]);
    expect(normalized).toHaveLength(1);
    expect(normalized[0].indexes).toEqual([]);
  });

  it("should handle a completely empty schema definition", () => {
    const rawEmptySchema: RawSchema = {
      name: "Empty",
      schema: z.object({}),
    };
    const normalized = parseSchemas([rawEmptySchema]);
    expect(normalized).toHaveLength(1);
    const emptySchema = normalized[0];
    expect(emptySchema.name).toBe("Empty");
    expect(emptySchema.fields).toHaveLength(0);
    expect(emptySchema.relationships).toHaveLength(0);
    expect(emptySchema.indexes).toEqual([]);
    expect(emptySchema.manyToMany).toEqual([]);
  });

  it("should handle an empty input array", () => {
    const normalized = parseSchemas([]);
    expect(normalized).toHaveLength(0);
  });
});
