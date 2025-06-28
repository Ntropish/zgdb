/**
 * This file is the single source of truth for the entire application schema.
 */
import { createSchemaFactory } from "@zgdb/generate";
// import { ZgClient } from "../../zg/schema.zg.js";

// Import all schema definitions
import { UserDef } from "./user.js";
import { PostDef } from "./post.js";
import { CommentDef } from "./comment.js";
import { FollowDef } from "./follow.js";
import { ImageDef } from "./image.js";
import { PostTagDef } from "./post-tag.js";
import { ReactionDef } from "./reaction.js";
import { TagDef } from "./tag.js";

// The project-specific Actor type.
export interface MyAppActor {
  did: string;
  roles: ("admin" | "moderator" | "user")[];
}

// Define the global policies and their implementations.
export const globalResolvers = {
  isPublic: () => true,
  isAuthenticated: ({ actor }: { actor: MyAppActor }) => !!actor.did,
  hasAdminRights: ({ actor }: { actor: MyAppActor }) =>
    actor.roles.includes("admin"),
  never: () => false,
};

const createMyAppSchema = createSchemaFactory<ZgClient, MyAppActor>();

export const AppSchema = createMyAppSchema({
  globalResolvers,
  entities: {
    User: UserDef,
    Post: PostDef,
    Comment: CommentDef,
    Follow: FollowDef,
    Image: ImageDef,
    PostTag: PostTagDef,
    Reaction: ReactionDef,
    Tag: TagDef,
  },
  resolvers: {
    Comment: {
      isAuthor: ({ actor, record, input }) => {
        const authorId = record?.authorId || input?.authorId;
        if (typeof authorId !== "string") return false;
        return actor.did === authorId;
      },
      isPostAuthor: async ({ actor, record, db }) => {
        if (!record) return false;
        const post = await db.posts.get(record.postId);
        if (!post) return false;
        return actor.did === post.author;
      },
    },
    User: {
      isOwner: ({ actor, input }) => {
        return actor.did === input?.ownerDid;
      },
      isSelf: ({ actor, record }) => {
        if (!record) return false;
        return actor.did === record.id;
      },
    },
    Post: {
      isAuthor: ({ actor, record, input }) => {
        if (record) return actor.did === record.author;
        if (input) return actor.did === input.author;
        return false;
      },
    },
    Follow: {
      isFollower: ({ actor, record, input }) => {
        if (record) return actor.did === record.followerId;
        if (input) return actor.did === input.followerId;
        return false;
      },
    },
    Image: {
      isOwner: async ({ actor, record, input, db }) => {
        // For a create operation, we must check the input
        if (input) {
          if (input.postId) {
            const post = await db.posts.get(input.postId);
            return !!post && post.author === actor.did;
          }
          if (input.userId) {
            // This logic assumes user's `id` is their DID.
            return actor.did === input.userId;
          }
        }
        // For update/delete, we check the existing record
        if (record) {
          if (record.postId) {
            const post = await db.posts.get(record.postId);
            return !!post && post.author === actor.did;
          }
          if (record.userId) {
            const user = await db.users.get(record.userId);
            return !!user && user.id === actor.did;
          }
        }
        return false;
      },
    },
    Reaction: {
      isAuthor: ({ actor, record, input }) => {
        if (record) return actor.did === record.author;
        if (input) return actor.did === input.author;
        return false;
      },
    },
    Tag: {},
    PostTag: {
      isPostAuthor: async ({ actor, record, input, db }) => {
        const postId = record?.postId || input?.postId;
        if (!postId) return false;
        const post = await db.posts.get(postId);
        if (!post) return false;
        return actor.did === post.author;
      },
    },
  },
  auth: {
    User: {
      create: "isOwner",
      read: "isPublic",
      update: "isSelf",
      delete: "hasAdminRights",
    },
    Post: {
      create: "isAuthenticated",
      read: "isPublic",
      update: "isAuthor",
      delete: "isAuthor",
    },
    Comment: {
      create: "isAuthenticated",
      read: "isPublic",
      update: "isAuthor",
      delete: ["isAuthor", "isPostAuthor"],
    },
    Follow: {
      create: "isFollower",
      read: "isPublic",
      update: "never",
      delete: "isFollower",
    },
    Image: {
      create: "isOwner",
      read: "isPublic",
      update: "isOwner",
      delete: "isOwner",
    },
    Reaction: {
      create: "isAuthor",
      read: "isPublic",
      update: "never",
      delete: "isAuthor",
    },
    Tag: {
      create: "hasAdminRights",
      read: "isPublic",
      update: "hasAdminRights",
      delete: "hasAdminRights",
    },
    PostTag: {
      create: "isPostAuthor",
      read: "isPublic",
      update: "isPostAuthor",
      delete: "isPostAuthor",
    },
  },
});

export default AppSchema;
