/**
 * This file is the single source of truth for the entire application schema.
 */
import { createSchema, AuthContext, EntityDef } from "@tsmk/zg";
import { ZgClient, CommentNode } from "../../../../temp-output/schema.zg.js";

// Import all schema definitions
import { UserDef, IUserResolvers } from "./user.js";
import { PostDef, IPostResolvers } from "./post.js";
import { CommentDef, ICommentResolvers } from "./comment.js";
import { FollowDef, IFollowResolvers } from "./follow.js";
import { ImageDef, IImageResolvers } from "./image.js";
import { PostTagDef, IPostTagResolvers } from "./post-tag.js";
import { ReactionDef, IReactionResolvers } from "./reaction.js";
import { TagDef } from "./tag.js";

// The project-specific Actor type.
export interface MyAppActor {
  did: string;
  roles: ("admin" | "moderator" | "user")[];
}

// Define the global policies and their implementations.
export const globalPolicies = {
  isPublic: () => true,
  isAuthenticated: ({ actor }: AuthContext<MyAppActor, any, any, ZgClient>) =>
    !!actor.did,
  hasAdminRights: ({ actor }: AuthContext<MyAppActor, any, any, ZgClient>) =>
    actor.roles.includes("admin"),
  never: () => false,
};
export type AppGlobalPolicies = typeof globalPolicies;

// Combine all resolver interfaces into a single type for the factory.
type AppResolvers = {
  Comment: ICommentResolvers;
  User: IUserResolvers;
  Post: IPostResolvers;
  Follow: IFollowResolvers;
  Image: IImageResolvers;
  Reaction: IReactionResolvers;
  Tag: {};
  PostTag: IPostTagResolvers;
  // ... other resolver interfaces
};

// Define default implementations for any resolvers.
const defaultResolvers: Partial<AppResolvers> = {
  Comment: {
    isAuthor: ({ actor, record, input }) => {
      const authorId = record?.author || input?.authorId;
      return actor.did === authorId;
    },
    isPostAuthor: async ({ actor, record }) => {
      if (!record) return false;
      const post = await record.regards;
      if (!post) return false;
      const authorId = post.author;
      return actor.did === authorId;
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
          const post = await db.posts.find(input.postId);
          return !!post && actor.did === post.author;
        }
        if (input.userId) {
          // This logic assumes user's `id` is their DID.
          return actor.did === input.userId;
        }
      }
      // For update/delete, we check the existing record
      if (record) {
        if (record.postId) {
          const post = await db.posts.find(record.postId);
          return !!post && actor.did === post.author;
        }
        if (record.userId) {
          return actor.did === record.userId;
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
      const post = await db.posts.find(postId);
      if (!post) return false;
      return actor.did === post.author;
    },
  },
};

const entities = {
  User: UserDef,
  Post: PostDef,
  Comment: CommentDef,
  Follow: FollowDef,
  Image: ImageDef,
  PostTag: PostTagDef,
  Reaction: ReactionDef,
  Tag: TagDef,
};

export const AppSchema = createSchema({
  globalPolicies,
  entities,
  resolvers: defaultResolvers,
});

export default AppSchema;
