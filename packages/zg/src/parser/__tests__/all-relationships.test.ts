import { describe, it, expect } from "vitest";
import { z } from "zod";
import { parseSchemas } from "../index.js";
import { EntityDef, NormalizedSchema } from "../types.js";

const findSchema = (schemas: NormalizedSchema[], name: string) => {
  return schemas.find((s) => s.name === name);
};

const ALL_RELATIONSHIPS_SCHEMAS: Record<string, EntityDef> = {
  Project: {
    name: "Project",
    schema: z.object({ id: z.string(), ownerId: z.string() }),
    relationships: {
      owner: {
        entity: "User",
        field: "ownerId",
        cardinality: "one",
        required: true,
        description: "The user who owns the project.",
      },
      tasks: {
        entity: "Task",
        cardinality: "many",
        mappedBy: "project",
        description: "The tasks associated with the project.",
      },
      attachment: {
        type: "polymorphic",
        cardinality: "one",
        required: true,
        description: "A featured attachment for the project.",
        discriminator: "attachmentType",
        foreignKey: "attachmentId",
        references: ["Image", "File"],
      },
    },
    manyToMany: {
      members: {
        node: "User",
        through: "Membership",
        myKey: "projectId",
        theirKey: "userId",
      },
    },
  },
  User: { name: "User", schema: z.object({ id: z.string() }) },
  Task: {
    name: "Task",
    schema: z.object({ id: z.string(), projectId: z.string() }),
    relationships: {
      project: {
        entity: "Project",
        field: "projectId",
        cardinality: "one",
        required: true,
      },
    },
  },
  Image: { name: "Image", schema: z.object({ id: z.string() }) },
  File: { name: "File", schema: z.object({ id: z.string() }) },
  Membership: {
    name: "Membership",
    schema: z.object({ userId: z.string(), projectId: z.string() }),
  },
};

describe("Schema Parser Deep Edge Cases: All Relationship Types", () => {
  it("should correctly parse a single schema with all relationship types defined", () => {
    const schemas = parseSchemas({ entities: ALL_RELATIONSHIPS_SCHEMAS });
    const projectSchema = findSchema(schemas, "Project");
    const relationships = projectSchema?.relationships;
    expect(relationships).toBeDefined();

    expect(relationships).toEqual(
      expect.arrayContaining([
        {
          name: "owner",
          node: "User",
          cardinality: "one",
          required: true,
          description: "The user who owns the project.",
          mappedBy: undefined,
        },
        {
          name: "tasks",
          node: "Task",
          cardinality: "many",
          mappedBy: "project",
          description: "The tasks associated with the project.",
          required: undefined,
        },
        {
          name: "attachment",
          type: "polymorphic",
          field: "attachmentId",
        },
      ])
    );

    const manyToMany = projectSchema?.manyToMany;
    expect(manyToMany).toBeDefined();
    expect(manyToMany).toEqual([
      {
        name: "members",
        node: "User",
        through: "Membership",
        myKey: "projectId",
        theirKey: "userId",
        description: undefined,
      },
    ]);
  });
});
