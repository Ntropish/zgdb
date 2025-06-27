/**
 * This file is the single source of truth for the entire application schema.
 */
import { createSchema, EntityDef } from "@tsmk/zg";
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
import {
  UserNode,
  PostNode,
  FollowNode,
  ImageNode,
  ReactionNode,
  PostTagNode,
} from "../../../../temp-output/schema.zg.js";
import { z } from "zod";

// The project-specific Actor type.
export interface MyAppActor {
  did: string;
  roles: ("admin" | "moderator" | "user")[];
}

/**
 * A specialized version of the core `ResolverContext` that is pre-configured
 * with the application-specific `MyAppActor` and `ZgClient` types.
 *
 * @template TNode The generated ZG Node type for the entity (e.g., `UserNode`).
 * @template TInput The raw Zod schema type for the entity (e.g., `User`).
 * @template TContext Optional additional context for a specific resolver.
 */
export type AppContext<TNode, TInput, TContext = {}> = ResolverContext<
  MyAppActor,
  TNode,
  TInput,
  ZgClient,
  TContext
>;

// Define the global policies and their implementations.
export const globalPolicies = {
  isPublic: () => true,
  isAuthenticated: ({ actor }: AppContext<any, any>) => !!actor.did,
  hasAdminRights: ({ actor }: AppContext<any, any>) =>
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
const defaultResolvers: AppResolvers = {
  Comment: {
    isAuthor: ({ actor, record, input }: AppContext<CommentNode, Comment>) => {
      const authorId = record?.authorId || input?.authorId;
      if (typeof authorId !== "string") return false;
      return actor.did === authorId;
    },
    isPostAuthor: async ({ actor, record }: AppContext<PostNode, Post>) => {
      if (!record) return false;
      const post = await record.post;
      if (!post) return false;
      const authorId = post.author;
      if (typeof authorId !== "string") return false;
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
          const post = await db.Post.find(input.postId);
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
          const post = await record.post;
          return !!post && post.author === actor.did;
        }
        if (record.userId) {
          const user = await record.user;
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
      const post = await db.Post.find(postId);
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
