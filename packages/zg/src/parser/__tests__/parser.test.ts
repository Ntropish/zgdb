import { describe, it, expect } from "vitest";
import { parseSchemas } from "../index.js";
import { EntityDef, NormalizedSchema } from "../types.js";
import { z } from "zod";

const findSchema = (schemas: NormalizedSchema[], name: string) => {
  return schemas.find((s) => s.name === name);
};

const rawUserSchema: EntityDef = {
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
  indexes: [
    { on: "email", unique: true },
    { on: ["name"], type: "btree" },
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
        { name: "id", type: "string", required: true, attributes: new Map() },
        {
          name: "isAdmin",
          type: "bool",
          required: false,
          attributes: new Map(),
        },
        {
          name: "tags",
          type: "[string]",
          required: true,
          attributes: new Map(),
        },
        {
          name: "metadata",
          type: "User_Metadata",
          required: true,
          attributes: new Map(),
        },
      ])
    );
    expect(userSchema!.indexes).toHaveLength(2);
    expect(userSchema!.relationships).toHaveLength(0);

    expect(metadataSchema!.name).toBe("User_Metadata");
    expect(metadataSchema!.fields).toEqual([
      {
        name: "lastLogin",
        type: "long",
        required: true,
        attributes: new Map(),
      },
    ]);
  });

  it("should parse a basic one-to-one relationship", () => {
    const rawPostSchema: EntityDef = {
      name: "Post",
      schema: z.object({
        id: z.string(),
        title: z.string(),
        authorId: z.string(),
      }),
      relationships: {
        author: {
          entity: "User",
          cardinality: "one",
          required: true,
          description: "The user who wrote the post.",
          field: "authorId",
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
        node: "User",
        cardinality: "one",
        required: true,
        description: "The user who wrote the post.",
        mappedBy: undefined, // No mappedBy in a one-to-one with foreign key
      },
    ]);
  });

  it("should parse a polymorphic relationship", () => {
    const rawReactionSchema: EntityDef = {
      name: "Reaction",
      schema: z.object({
        id: z.string(),
        targetId: z.string(),
        targetType: z.enum(["Post", "Comment"]),
      }),
      relationships: {
        target: {
          type: "polymorphic",
          cardinality: "one",
          required: true,
          discriminator: "targetType",
          foreignKey: "targetId",
          references: ["Post", "Comment"],
        },
      },
    };

    const normalized = parseSchemas({
      entities: { Reaction: rawReactionSchema },
    });

    expect(normalized).toHaveLength(1);
    const reactionSchema = normalized[0];

    expect(reactionSchema.relationships).toHaveLength(1);
    expect(reactionSchema.relationships[0]).toEqual({
      name: "target",
      type: "polymorphic",
      field: "targetId",
    });
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
    const UserSchema: EntityDef = {
      name: "User",
      schema: z.object({ id: z.string() }),
      relationships: {
        posts: {
          entity: "Post",
          cardinality: "many",
          mappedBy: "author",
          description: "Posts by the user.",
        },
      },
    };

    const PostSchema: EntityDef = {
      name: "Post",
      schema: z.object({ id: z.string(), authorId: z.string() }),
      relationships: {
        author: { entity: "User", cardinality: "one", required: true },
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
      (r) => "name" in r && r.name === "posts"
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
    const schemas = parseSchemas({
      entities: {
        Test: {
          name: "Test",
          schema: z.object({ id: z.string() }),
        },
      },
      globalResolvers: {
        can_create: () => true,
        can_read: () => true,
      },
      auth: {
        Test: {
          create: "can_create",
          read: "can_read",
        },
      },
    });

    const authSchema = findSchema(schemas, "Test");
    expect(authSchema).toBeDefined();
    const auth = authSchema?.auth as any;
    expect(auth.create).toEqual("can_create");
    expect(auth.read).toEqual("can_read");
  });

  it("should correctly parse indexes, setting defaults and validating fields", () => {
    const testSchema = findSchema(
      parseSchemas({ entities: { User: rawUserSchema } }),
      "User"
    );
    expect(testSchema?.indexes).toHaveLength(2);
    const index1 = testSchema?.indexes?.[0];
    expect(index1?.on).toEqual(["email"]);
    expect(index1?.unique).toBe(true);
    expect(index1?.type).toBe("btree"); // default

    const index2 = testSchema?.indexes?.[1];
    expect(index2?.on).toEqual(["name"]);
    expect(index2?.unique).toBe(false); // default
    expect(index2?.type).toBe("btree");
  });

  it("should throw an error for an index on a non-existent field", () => {
    const BadSchema: EntityDef = {
      name: "Bad",
      schema: z.object({ id: z.string() }),
      indexes: [{ on: "nonExistentField" }],
    };
    expect(() => parseSchemas({ entities: { Bad: BadSchema } })).toThrow(
      "Index defined on non-existent field: 'nonExistentField'"
    );
  });
});
