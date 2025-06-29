import { describe, it, expect } from "vitest";
import { parseSchemas } from "../index.js";
import { EntityDef, NormalizedSchema } from "../types.js";
import { z } from "zod";

describe("Schema Parser Deep Edge Cases: Empty and Malformed Schemas", () => {
  const findSchema = (schemas: NormalizedSchema[], name: string) =>
    schemas.find((s) => s.name === name);

  it("should handle a schema with no fields", () => {
    const noFieldsSchema: EntityDef = {
      name: "NoFields",
      schema: z.object({}),
    };
    const normalized = parseSchemas({ entities: [noFieldsSchema] });
    expect(findSchema(normalized, "NoFields")?.fields).toEqual([]);
  });

  it("should handle a schema with no relationships", () => {
    const noRelsSchema: EntityDef = {
      name: "NoRels",
      schema: z.object({ id: z.string() }),
      relationships: {},
    };
    const normalized = parseSchemas({ entities: [noRelsSchema] });
    expect(findSchema(normalized, "NoRels")?.relationships).toEqual([]);
  });

  it("should handle a schema with no indexes", () => {
    const noIndexesSchema: EntityDef = {
      name: "NoIndexes",
      schema: z.object({ id: z.string() }),
      indexes: [],
    };
    const normalized = parseSchemas({ entities: [noIndexesSchema] });
    expect(findSchema(normalized, "NoIndexes")?.indexes).toEqual([]);
  });

  it("should handle a completely empty schema definition", () => {
    const emptySchema: EntityDef = {
      name: "Empty",
      schema: z.object({}),
      relationships: {},
      indexes: [],
    };
    const normalized = parseSchemas({ entities: [emptySchema] });
    const empty = findSchema(normalized, "Empty");
    expect(empty).toBeDefined();
    expect(empty?.fields).toEqual([]);
    expect(empty?.relationships).toEqual([]);
    expect(empty?.indexes).toEqual([]);
  });

  it("should handle an empty input array", () => {
    const normalized = parseSchemas({ entities: [] });
    expect(normalized).toEqual([]);
  });
});
