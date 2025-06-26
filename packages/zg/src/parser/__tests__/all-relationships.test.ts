import { parseSchemas } from "../index.js";
import { RawSchema } from "../types.js";
import { z } from "zod";

describe("Schema Parser Deep Edge Cases: All Relationship Types", () => {
  it("should correctly parse a single schema with all relationship types defined", () => {
    // This test uses a 'Project' entity as a central hub for various relationships.
    const rawProjectSchema: RawSchema = {
      name: "Project",
      description: "A project that connects users, tasks, and attachments.",
      schema: z.object({
        id: z.string(),
        name: z.string(),
        ownerId: z.string(),
        // For the polymorphic 'attachment' relationship
        attachmentId: z.string(),
        attachmentType: z.enum(["image", "file"]),
      }),
      relationships: {
        // One-to-one relationship
        user: {
          owner: {
            cardinality: "one",
            required: true,
            description: "The user who owns the project.",
          },
        },
        // One-to-many relationship
        task: {
          tasks: {
            cardinality: "many",
            description: "The tasks associated with the project.",
            mappedBy: "project",
          },
        },
        // Polymorphic relationship
        polymorphic: {
          attachment: {
            cardinality: "one",
            required: true,
            type: "polymorphic",
            discriminator: "attachmentType",
            foreignKey: "attachmentId",
            references: ["image", "file"], // Assuming a 'File' schema exists
            description: "A featured attachment for the project.",
          },
        },
      },
      // Many-to-many relationship is defined on the join entity,
      // but we can test its reverse mapping here conceptually.
    };

    const normalized = parseSchemas([rawProjectSchema]);

    expect(normalized).toHaveLength(1);
    const projectSchema = normalized[0];

    expect(projectSchema.name).toBe("Project");

    // Validate that all relationships were parsed correctly
    const relationships = projectSchema.relationships;
    expect(relationships).toHaveLength(3);

    // Test 1: One-to-one
    expect(relationships).toEqual(
      expect.arrayContaining([
        {
          name: "owner",
          node: "user",
          cardinality: "one",
          required: true,
          description: "The user who owns the project.",
          mappedBy: undefined, // mappedBy is optional
        },
      ])
    );

    // Test 2: One-to-many
    expect(relationships).toEqual(
      expect.arrayContaining([
        {
          name: "tasks",
          node: "task",
          cardinality: "many",
          required: undefined, // required is optional
          description: "The tasks associated with the project.",
          mappedBy: "project",
        },
      ])
    );

    // Test 3: Polymorphic
    expect(relationships).toEqual(
      expect.arrayContaining([
        {
          name: "attachment",
          node: "polymorphic",
          cardinality: "one",
          required: true,
          type: "polymorphic",
          discriminator: "attachmentType",
          foreignKey: "attachmentId",
          references: ["image", "file"],
          description: "A featured attachment for the project.",
        },
      ])
    );
  });
});
