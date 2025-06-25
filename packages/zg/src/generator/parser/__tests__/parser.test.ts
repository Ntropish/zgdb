import { parseSchemas } from "..";
import { RawSchema } from "../types";
import { z } from "zod";

describe("Schema Parser", () => {
  it("should parse a raw schema into a normalized representation", () => {
    const rawUserSchema: RawSchema = {
      name: "User",
      description: "A user of the application.",
      schema: z.object({
        id: z.string(),
        name: z.string(),
        email: z.string().email(),
        isAdmin: z.boolean().optional(),
        level: z.enum(["member", "admin"]),
        age: z.number().int(),
        tags: z.array(z.string()),
        metadata: z.object({
          lastLogin: z.date(),
        }),
      }),
      indexes: [
        { on: "email", unique: true },
        { on: "name", type: "btree" },
      ],
    };

    const normalized = parseSchemas([rawUserSchema]);

    expect(normalized).toHaveLength(1);
    const userSchema = normalized[0];

    expect(userSchema.name).toBe("User");
    expect(userSchema.description).toBe("A user of the application.");

    // Test field parsing
    expect(userSchema.fields).toHaveLength(8);
    expect(userSchema.fields).toEqual(
      expect.arrayContaining([
        { name: "id", type: "string", required: true },
        { name: "name", type: "string", required: true },
        { name: "email", type: "string", required: true },
        { name: "isAdmin", type: "bool", required: false },
        { name: "level", type: "string", required: true },
        { name: "age", type: "long", required: true },
        { name: "tags", type: "[string]", required: true },
        { name: "metadata", type: "User_Metadata", required: true },
      ])
    );

    // Test index parsing
    expect(userSchema.indexes).toHaveLength(2);
    expect(userSchema.indexes).toEqual(
      expect.arrayContaining([
        { on: "email", unique: true },
        { on: "name", type: "btree" },
      ])
    );
  });

  it("should parse a basic one-to-one relationship", () => {
    const rawPostSchema: RawSchema = {
      name: "Post",
      schema: z.object({
        id: z.string(),
        title: z.string(),
        author: z.string(),
      }),
      relationships: {
        user: {
          author: {
            cardinality: "one",
            description: "The user who wrote the post.",
            required: true,
          },
        },
      },
    };

    const normalized = parseSchemas([rawPostSchema]);

    expect(normalized).toHaveLength(1);
    const postSchema = normalized[0];

    expect(postSchema.relationships).toHaveLength(1);
    expect(postSchema.relationships).toEqual([
      {
        name: "author",
        node: "user",
        cardinality: "one",
        required: true,
        description: "The user who wrote the post.",
      },
    ]);
  });

  it("should parse a polymorphic relationship", () => {
    const rawReactionSchema: RawSchema = {
      name: "Reaction",
      schema: z.object({
        id: z.string(),
        targetId: z.string(),
        targetType: z.enum(["post", "comment"]),
      }),
      relationships: {
        polymorphic: {
          target: {
            cardinality: "one",
            required: true,
            type: "polymorphic",
            discriminator: "targetType",
            foreignKey: "targetId",
            references: ["post", "comment"],
          },
        },
      },
    };

    const normalized = parseSchemas([rawReactionSchema]);

    expect(normalized).toHaveLength(1);
    const reactionSchema = normalized[0];

    expect(reactionSchema.relationships).toHaveLength(1);
    expect(reactionSchema.relationships).toEqual([
      {
        name: "target",
        node: "polymorphic",
        cardinality: "one",
        required: true,
        type: "polymorphic",
        discriminator: "targetType",
        foreignKey: "targetId",
        references: ["post", "comment"],
      },
    ]);
  });

  it("should parse a many-to-many relationship", () => {
    const rawPostTagSchema: RawSchema = {
      name: "PostTag",
      schema: z.object({
        id: z.string(),
        postId: z.string(),
        tagId: z.string(),
      }),
      manyToMany: {
        name: "PostTags",
        description: "The relationship between posts and tags.",
        left: { node: "Post", field: "tags", foreignKey: "postId" },
        right: { node: "Tag", field: "posts", foreignKey: "tagId" },
      },
    };

    const normalized = parseSchemas([rawPostTagSchema]);

    expect(normalized).toHaveLength(1);
    const postTagSchema = normalized[0];

    expect(postTagSchema.manyToMany).toBeDefined();
    expect(postTagSchema.manyToMany).toEqual({
      name: "PostTags",
      description: "The relationship between posts and tags.",
      left: { node: "Post", field: "tags", foreignKey: "postId" },
      right: { node: "Tag", field: "posts", foreignKey: "tagId" },
    });
  });
});
