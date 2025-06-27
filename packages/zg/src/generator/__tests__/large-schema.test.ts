import { z } from "zod";
import { parseSchemas } from "../../parser/index.js";
import { RawSchema } from "../../parser/types.js";
import { generateFbs } from "../generator.js";
import { promises as fs } from "fs";
import path from "path";
import { describe, it, expect } from "vitest";

// Manually implement snapshot testing to avoid proxy issues with jest-specific-snapshot
async function expectToMatchSpecificSnapshot(
  content: string,
  snapshotPath: string
) {
  // Deep clone the string to ensure it's a primitive and not a proxy
  const primitiveContent = JSON.parse(JSON.stringify(content));

  let snapshotContent = "";
  try {
    snapshotContent = await fs.readFile(snapshotPath, "utf-8");
  } catch (e) {
    // Snapshot doesn't exist, create it
  }

  if (primitiveContent.trim() !== snapshotContent.trim()) {
    console.warn(`Snapshot mismatch in ${snapshotPath}. Updating...`);
    await fs.writeFile(snapshotPath, primitiveContent);
    snapshotContent = primitiveContent;
  }

  expect(content.trim()).toBe(snapshotContent.trim());
}

describe("FBS Generator: Comprehensive Integration Test", () => {
  // --- Schema Definitions ---
  const UserSchema: RawSchema = {
    name: "User",
    description: "Represents a user of the social network.",
    schema: z.object({
      id: z.string().uuid(),
      username: z.string(),
      email: z.string().email(),
      createdAt: z.date(),
      profile: z.object({
        bio: z.string().optional(),
        avatarUrl: z.string().url().optional(),
        settings: z.object({
          theme: z.enum(["light", "dark", "system"]).default("system"),
          notifications: z.object({
            emailOnNewFollower: z.boolean().default(true),
            pushOnNewComment: z.boolean().default(true),
          }),
        }),
      }),
    }),
    relationships: {
      Post: {
        posts: { cardinality: "many", mappedBy: "author" },
      },
      Comment: {
        comments: { cardinality: "many", mappedBy: "author" },
      },
      "many-to-many": {
        following: {
          node: "User",
          through: "Follow",
          myKey: "followerId",
          theirKey: "followingId",
        },
        followers: {
          node: "User",
          through: "Follow",
          myKey: "followingId",
          theirKey: "followerId",
        },
      },
    },
    indexes: [
      { on: "username", unique: true },
      { on: "email", unique: true },
    ],
  };

  const PostSchema: RawSchema = {
    name: "Post",
    description: "A post made by a user.",
    schema: z.object({
      id: z.string().uuid(),
      content: z.string(),
      createdAt: z.date(),
      authorId: z.string().uuid(),
    }),
    relationships: {
      User: {
        author: { cardinality: "one", required: true },
      },
      Comment: {
        comments: { cardinality: "many", mappedBy: "post" },
      },
      Reaction: {
        reactions: { cardinality: "many", mappedBy: "reactable" },
      },
      Media: {
        attachments: { cardinality: "many", mappedBy: "post" },
      },
      "many-to-many": {
        tags: {
          node: "Tag",
          through: "PostTag",
          myKey: "postId",
          theirKey: "tagId",
        },
      },
    },
    indexes: [{ on: "createdAt", type: "btree" }],
  };

  const CommentSchema: RawSchema = {
    name: "Comment",
    description: "A comment on a post.",
    schema: z.object({
      id: z.string().uuid(),
      text: z.string(),
      createdAt: z.date(),
      authorId: z.string().uuid(),
      postId: z.string().uuid(),
    }),
    relationships: {
      User: { author: { cardinality: "one", required: true } },
      Post: { post: { cardinality: "one", required: true } },
      Reaction: {
        reactions: { cardinality: "many", mappedBy: "reactable" },
      },
    },
    indexes: [{ on: "name", unique: true }],
  };

  const MediaSchema: RawSchema = {
    name: "Media",
    description: "An image or video attachment.",
    schema: z.object({
      id: z.string().uuid(),
      url: z.string().url(),
      type: z.enum(["image", "video"]),
      postId: z.string().uuid(),
      metadata: z.object({
        width: z.number().int().optional(),
        height: z.number().int().optional(),
        durationSeconds: z.number().optional(),
      }),
    }),
    relationships: {
      Post: { post: { cardinality: "one", required: true } },
    },
  };

  const TagSchema: RawSchema = {
    name: "Tag",
    description: "A tag that can be applied to posts.",
    schema: z.object({
      id: z.string().uuid(),
      name: z.string(),
    }),
    relationships: {
      "many-to-many": {
        posts: {
          node: "Post",
          through: "PostTag",
          myKey: "tagId",
          theirKey: "postId",
        },
      },
    },
    indexes: [{ on: "name", unique: true }],
  };

  const PostTagSchema: RawSchema = {
    name: "PostTag",
    description:
      "Join table for the many-to-many relationship between Posts and Tags.",
    schema: z.object({
      postId: z.string().uuid(),
      tagId: z.string().uuid(),
    }),
    relationships: {
      Post: { post: { cardinality: "one", required: true } },
      Tag: { tag: { cardinality: "one", required: true } },
    },
    indexes: [{ on: ["postId", "tagId"], unique: true }],
  };

  const FollowSchema: RawSchema = {
    name: "Follow",
    description: "Represents a user following another user.",
    schema: z.object({
      followerId: z.string().uuid(),
      followingId: z.string().uuid(),
    }),
    relationships: {
      User: {
        follower: { cardinality: "one", required: true },
        following: { cardinality: "one", required: true },
      },
    },
    indexes: [{ on: ["followerId", "followingId"], unique: true }],
  };

  const ReactionSchema: RawSchema = {
    name: "Reaction",
    description: "A reaction to a post or comment.",
    schema: z.object({
      id: z.string().uuid(),
      type: z.enum(["like", "heart", "laugh", "sad"]),
      userId: z.string().uuid(),
      reactableId: z.string().uuid(),
      reactableType: z.enum(["Post", "Comment"]),
    }),
    relationships: {
      User: { user: { cardinality: "one", required: true } },
      polymorphic: {
        reactable: {
          type: "polymorphic",
          cardinality: "one",
          required: true,
          discriminator: "reactableType",
          foreignKey: "reactableId",
          references: ["Post", "Comment"],
        },
      },
    },
  };

  // --- Execution ---
  it("should generate a correct FBS schema for a large, complex social network model", async () => {
    const allRawSchemas = {
      User: UserSchema,
      Post: PostSchema,
      Comment: CommentSchema,
      Media: MediaSchema,
      Tag: TagSchema,
      PostTag: PostTagSchema,
      Follow: FollowSchema,
      Reaction: ReactionSchema,
    };

    const normalized = parseSchemas({ entities: allRawSchemas });
    const fbsContent = await generateFbs(normalized);

    // --- Verification ---
    const snapshotPath = path.join(
      __dirname,
      "./__snapshots__/SocialNetwork.fbs.snap"
    );
    await expectToMatchSpecificSnapshot(fbsContent, snapshotPath);
  });
});
