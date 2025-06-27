import { describe, it, expect } from "vitest";
import { parseSchemas } from "../index.js";
import { RawSchema, ZGEntityDef } from "../types.js";
import { z } from "zod";

const rawUserSchema: ZGEntityDef<any> = {
  name: "User",
  description: "A user of the application.",
  schema: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    isAdmin: z.boolean().optional(),
    level: z.enum(["user", "moderator", "admin"]),
    age: z.number().int(),
    tags: z.array(z.string()),
    metadata: z.object({
      lastLogin: z.date(),
    }),
  }),
  relationships: {},
  indexes: [
    { on: "email", unique: true },
    { on: "name", type: "btree" },
  ],
};

describe("Schema Parser", () => {
  it("should parse a raw schema into a normalized representation", () => {
    const normalized = parseSchemas({ entities: { User: rawUserSchema } });

    expect(normalized).toHaveLength(2); // User + User_Metadata

    const userSchema = normalized.find((s) => s.name === "User");
    const metadataSchema = normalized.find((s) => s.name === "User_Metadata");

    expect(userSchema).toBeDefined();
    expect(metadataSchema).toBeDefined();

    expect(userSchema!.name).toBe("User");
    expect(userSchema!.fields).toHaveLength(8);
    expect(userSchema!.fields).toEqual(
      expect.arrayContaining([
        { name: "id", type: "string", required: true },
        { name: "isAdmin", type: "bool", required: false },
        { name: "tags", type: "[string]", required: true },
        { name: "metadata", type: "User_Metadata", required: true },
      ])
    );
    expect(userSchema!.indexes).toHaveLength(2);
    expect(userSchema!.relationships).toHaveLength(0);

    expect(metadataSchema!.name).toBe("User_Metadata");
    expect(metadataSchema!.fields).toEqual([
      { name: "lastLogin", type: "long", required: true },
    ]);
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

    const normalized = parseSchemas({ entities: { Post: rawPostSchema } });

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

    const normalized = parseSchemas({
      entities: { Reaction: rawReactionSchema },
    });

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
    const PostSchema: RawSchema = {
      name: "Post",
      schema: z.object({ id: z.string() }),
      relationships: {
        "many-to-many": {
          tags: {
            node: "Tag",
            through: "PostTag",
            myKey: "postId",
            theirKey: "tagId",
            description: "Tags on the post.",
          },
        },
      },
    };

    const TagSchema: RawSchema = {
      name: "Tag",
      schema: z.object({ id: z.string(), name: z.string() }),
    };

    const PostTagSchema: RawSchema = {
      name: "PostTag",
      schema: z.object({ postId: z.string(), tagId: z.string() }),
    };

    const normalized = parseSchemas({
      entities: {
        Post: PostSchema,
        Tag: TagSchema,
        PostTag: PostTagSchema,
      },
    });
    const postSchema = normalized.find((s) => s.name === "Post")!;

    expect(postSchema.manyToMany).toHaveLength(1);
    expect(postSchema.manyToMany[0]).toEqual({
      name: "tags",
      node: "Tag",
      through: "PostTag",
      myKey: "postId",
      theirKey: "tagId",
      description: "Tags on the post.",
    });
  });

  it("should parse a one-to-many relationship", () => {
    const UserSchema: RawSchema = {
      name: "User",
      schema: z.object({ id: z.string() }),
      relationships: {
        Post: {
          posts: {
            cardinality: "many",
            mappedBy: "author",
            description: "Posts by the user.",
          },
        },
      },
    };

    const PostSchema: RawSchema = {
      name: "Post",
      schema: z.object({ id: z.string(), authorId: z.string() }),
      relationships: {
        User: {
          author: { cardinality: "one", required: true },
        },
      },
    };

    const normalized = parseSchemas({
      entities: {
        User: UserSchema,
        Post: PostSchema,
      },
    });
    const userSchema = normalized.find((s) => s.name === "User")!;
    const userPostsRelation = userSchema.relationships.find(
      (r) => r.name === "posts"
    )!;

    expect(userPostsRelation).toBeDefined();
    expect(userPostsRelation).toEqual({
      name: "posts",
      node: "Post",
      cardinality: "many",
      description: "Posts by the user.",
      mappedBy: "author",
      targetField: "author",
    });
  });

  it("should parse an auth block", () => {
    const rawAuthSchema: ZGEntityDef<any, string> = {
      name: "AuthTest",
      schema: z.object({ id: z.string() }),
      auth: {
        create: "can_create",
        read: ["isOwner", "can_read"],
      },
    };

    const normalized = parseSchemas({
      entities: { AuthTest: rawAuthSchema },
      policies: {
        can_create: () => true,
        isOwner: () => true,
        can_read: () => true,
      },
    });
    const authSchema = normalized.find((s) => s.name === "AuthTest")!;

    expect(authSchema.auth).toBeDefined();
    expect(authSchema.auth!.create).toEqual(["can_create"]);
    expect(authSchema.auth!.read).toEqual(["isOwner", "can_read"]);
    expect(authSchema.auth!.fields).toEqual({});
    expect(authSchema.auth!.relationships).toEqual({});
  });
});
