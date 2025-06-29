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
  relationships: {
    profile: {
      entity: "Profile",
      cardinality: "one",
      mappedBy: "user",
    },
  },
  indexes: [
    { on: "email", unique: true },
    { on: ["name"], type: "btree" },
  ],
};

describe("Schema Parser", () => {
  it("should parse a raw schema into a normalized representation", () => {
    const normalized = parseSchemas({ entities: [rawUserSchema] });

    expect(normalized).toBeInstanceOf(Array);
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
    expect(userSchema!.relationships).toHaveLength(1);

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
    const profileSchema: EntityDef = {
      name: "Profile",
      schema: z.object({
        id: z.string(),
        bio: z.string(),
        userId: z.string(),
      }),
      relationships: {
        user: {
          entity: "User",
          cardinality: "one",
        },
      },
    };

    const normalized = parseSchemas({
      entities: [rawUserSchema, profileSchema],
    });
    const user = findSchema(normalized, "User");
    const profile = findSchema(normalized, "Profile");

    const userRel = user?.relationships.find(
      (r): r is import("../types.js").Relationship =>
        r.type !== "polymorphic" && r.name === "profile"
    );
    expect(userRel).toBeDefined();
    expect(userRel?.cardinality).toBe("one");

    const profileRel = profile?.relationships.find(
      (r): r is import("../types.js").Relationship =>
        r.type !== "polymorphic" && r.name === "user"
    );
    expect(profileRel).toBeDefined();
    expect(profileRel?.cardinality).toBe("one");
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

    const normalized = parseSchemas({ entities: [rawReactionSchema] });

    expect(normalized).toHaveLength(1);
    const reactionSchema = normalized[0];

    expect(reactionSchema.relationships).toHaveLength(1);
    expect(reactionSchema.relationships[0]).toEqual({
      name: "target",
      type: "polymorphic",
      cardinality: "one",
      required: true,
      discriminator: "targetType",
      foreignKey: "targetId",
      references: ["Post", "Comment"],
    });
  });

  it("should parse a many-to-many relationship", () => {
    const postDef: EntityDef = {
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
    };
    const tagDef: EntityDef = {
      name: "Tag",
      schema: z.object({ id: z.string() }),
    };
    const postTagDef: EntityDef = {
      name: "PostTag",
      schema: z.object({ postId: z.string(), tagId: z.string() }),
    };

    const schemas = parseSchemas({
      entities: [postDef, tagDef, postTagDef],
    });

    const postSchema = findSchema(schemas, "Post");
    expect(postSchema?.manyToMany).toHaveLength(1);
    expect(postSchema?.manyToMany[0].name).toBe("tags");
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

    const normalized = parseSchemas({ entities: [UserSchema, PostSchema] });
    const userSchema = normalized.find((s) => s.name === "User")!;
    const userPostsRelation = userSchema.relationships.find(
      (r) => r.name === "posts"
    );

    expect(userPostsRelation).toBeDefined();
    expect(userPostsRelation).toEqual({
      name: "posts",
      entity: "Post",
      cardinality: "many",
      mappedBy: "author",
      type: "standard",
      description: "Posts by the user.",
      field: "postsId",
    });

    const postSchema = normalized.find((s) => s.name === "Post")!;
    const postAuthorRelation = postSchema.relationships.find(
      (r) => r.name === "author"
    )!;
    expect(postAuthorRelation).toBeDefined();
    expect(postAuthorRelation).toEqual({
      name: "author",
      entity: "User",
      cardinality: "one",
      required: true,
      type: "standard",
      field: "authorId",
    });
  });

  it("should parse an auth block", () => {
    const rawSchema: EntityDef = {
      name: "Test",
      schema: z.object({ id: z.string() }),
      // auth block is no longer part of the core schema
    };
    const normalized = parseSchemas({ entities: [rawSchema] });
    // This test is now effectively a no-op but confirms the parser doesn't crash.
    expect(normalized).toHaveLength(1);
  });

  it("should correctly parse indexes, setting defaults and validating fields", () => {
    const testSchema = findSchema(
      parseSchemas({ entities: [rawUserSchema] }),
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
    expect(() => parseSchemas({ entities: [BadSchema] })).toThrow(
      "Index defined on non-existent field: 'nonExistentField'"
    );
  });
});
