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
    schema: z.object({
      id: z.string(),
      ownerId: z.string(),
      attachmentId: z.string(),
      attachmentType: z.string(),
    }),
    relationships: {
      owner: {
        entity: "User",
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
        discriminator: "attachmentType",
        foreignKey: "attachmentId",
        references: ["File", "Image"],
        required: true,
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
    const schemas = parseSchemas({
      entities: Object.values(ALL_RELATIONSHIPS_SCHEMAS),
    });
    const projectSchema = findSchema(schemas, "Project");
    const relationships = projectSchema?.relationships;
    expect(relationships).toBeDefined();

    expect(relationships).toEqual(
      expect.arrayContaining([
        {
          name: "owner",
          entity: "User",
          cardinality: "one",
          required: true,
          description: "The user who owns the project.",
          type: "standard",
          field: "ownerId",
        },
        {
          name: "tasks",
          entity: "Task",
          cardinality: "many",
          mappedBy: "project",
          description: "The tasks associated with the project.",
          type: "standard",
          field: "tasksId",
        },
        {
          name: "attachment",
          type: "polymorphic",
          cardinality: "one",
          required: true,
          discriminator: "attachmentType",
          foreignKey: "attachmentId",
          references: ["File", "Image"],
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
      },
    ]);
  });
});
