/**
 * This file is the single source of truth for the entire application schema.
 */
import { z } from "zod";
import { UserDef } from "./user.js";
import { PostDef } from "./post.js";
import { CommentDef } from "./comment.js";
import { FollowDef } from "./follow.js";
import { ImageDef } from "./image.js";
import { PostTagDef } from "./post-tag.js";
import { ReactionDef } from "./reaction.js";
import { TagDef } from "./tag.js";

// A mock of the future factory function from the core ZG library.
const createSchema = (config: any) => config;

// The project-specific Actor type.
export interface MyAppActor {
  did: string;
  roles: ("admin" | "moderator" | "user")[];
}

export const AppSchema = createSchema({
  // Global policies and their default resolvers.
  policies: {
    isPublic: () => true,
    isAuthenticated: ({ actor }: { actor: MyAppActor }) => !!actor.did,
    hasAdminRights: ({ actor }: { actor: MyAppActor }) =>
      actor.roles.includes("admin"),
    never: () => false,
  },

  // All entity definitions for the application.
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
});
