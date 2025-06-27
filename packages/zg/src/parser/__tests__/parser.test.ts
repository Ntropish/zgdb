import { describe, it, expect } from "vitest";
import { parseSchemas } from "../index.js";
import { RawSchema, ZGEntityDef, NormalizedSchema } from "../types.js";
import { z } from "zod";

const findSchema = (schemas: NormalizedSchema[], name: string) => {
  return schemas.find((s) => s.name === name);
};

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
    const schemas = parseSchemas({
      entities: {
        Post: {
          name: "Post",
          schema: z.object({ id: z.string() }),
          manyToMany: {
            tags: {
              node: "Tag",
              through: "PostTag",
              myKey: "postId",
              theirKey: "tagId",
            },
          },
        },
        Tag: { name: "Tag", schema: z.object({ id: z.string() }) },
        PostTag: {
          name: "PostTag",
          schema: z.object({ postId: z.string(), tagId: z.string() }),
        },
      },
    });

    const postSchema = findSchema(schemas, "Post");
    expect(postSchema?.manyToMany).toHaveLength(1);
    expect(postSchema?.manyToMany[0]).toEqual({
      name: "tags",
      node: "Tag",
      through: "PostTag",
      myKey: "postId",
      theirKey: "tagId",
      description: undefined,
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
      required: undefined,
    });
  });

  it("should parse an auth block", () => {
    const authBlock = {
      create: "can_create",
      read: "can_read",
    };
    const schemas = parseSchemas({
      entities: {
        Test: {
          name: "Test",
          schema: z.object({ id: z.string() }),
          auth: authBlock,
          resolvers: {
            can_create: () => true,
            can_read: () => true,
          },
        },
      },
    });
    const authSchema = findSchema(schemas, "Test");
    expect(authSchema).toBeDefined();
    const auth = authSchema?.auth as any;
    expect(auth.create).toEqual([0]);
    expect(auth.read).toEqual([1]);
  });

  it("should correctly parse indexes, setting defaults and validating fields", () => {
    const schemas = parseSchemas({
      entities: {
        Test: {
          name: "Test",
          schema: z.object({
            id: z.string(),
            email: z.string(),
            name: z.string(),
          }),
          indexes: [
            { on: "id", unique: true },
            { on: ["name", "email"], type: "hash" },
          ],
        },
      },
    });

    const testSchema = findSchema(schemas, "Test");
    expect(testSchema?.indexes).toBeDefined();
    expect(testSchema?.indexes).toHaveLength(2);

    // Check first index
    const index1 = testSchema?.indexes?.[0];
    expect(index1?.on).toEqual(["id"]);
    expect(index1?.unique).toBe(true);
    expect(index1?.type).toBe("btree"); // Default type

    // Check second index
    const index2 = testSchema?.indexes?.[1];
    expect(index2?.on).toEqual(["name", "email"]);
    expect(index2?.unique).toBeUndefined();
    expect(index2?.type).toBe("hash");
  });

  it("should throw an error for an index on a non-existent field", () => {
    expect(() => {
      parseSchemas({
        entities: {
          Test: {
            name: "Test",
            schema: z.object({ id: z.string() }),
            indexes: [{ on: "nonExistentField" }],
          },
        },
      });
    }).toThrow(
      "Index defined on non-existent field: 'nonExistentField'. Valid fields are: id"
    );
  });
});
