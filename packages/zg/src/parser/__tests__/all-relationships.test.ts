import { describe, it, expect } from "vitest";
import { z } from "zod";
import { parseSchemas } from "../index.js";
import { NormalizedSchema } from "../types.js";

const findSchema = (schemas: NormalizedSchema[], name: string) => {
  return schemas.find((s) => s.name === name);
};

const ALL_RELATIONSHIPS_SCHEMAS = {
  Project: {
    name: "Project",
    schema: z.object({ id: z.string() }),
    relationships: {
      User: {
        owner: {
          cardinality: "one" as const,
          required: true,
          description: "The user who owns the project.",
        },
      },
      Task: {
        tasks: {
          cardinality: "many" as const,
          mappedBy: "project",
          description: "The tasks associated with the project.",
        },
      },
      polymorphic: {
        attachment: {
          type: "polymorphic" as const,
          cardinality: "one" as const,
          required: true,
          description: "A featured attachment for the project.",
          discriminator: "attachmentType",
          foreignKey: "attachmentId",
          references: ["Image", "File"],
        },
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
      Project: {
        project: {
          cardinality: "one",
          required: true,
        },
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
    const relationships = findSchema(schemas, "Project")?.relationships;
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
          node: "polymorphic",
          type: "polymorphic",
          cardinality: "one",
          required: true,
          description: "A featured attachment for the project.",
          discriminator: "attachmentType",
          foreignKey: "attachmentId",
          references: ["Image", "File"],
        },
      ])
    );

    const manyToMany = findSchema(schemas, "Project")?.manyToMany;
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
