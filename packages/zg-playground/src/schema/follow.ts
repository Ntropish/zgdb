import { z } from "zod";
import { EntityDef } from "@tsmk/zg";
import { AppGlobalResolvers } from "./index.js";
import { Policy } from "@tsmk/zg/dist/parser/types.js";

const FollowSchema = z.object({
  id: z.string(),
  followerId: z.string(),
  followingId: z.string(),
  createdAt: z.date(),
});
type Follow = z.infer<typeof FollowSchema>;

export type IFollowResolvers = {
  isFollower: Policy;
};

export const FollowDef: EntityDef<IFollowResolvers, AppGlobalResolvers> = {
  name: "Follow",
  description:
    "A directional relationship indicating one user follows another.",
  schema: FollowSchema,
  relationships: {
    follower: {
      type: "User",
      field: "followerId",
      cardinality: "one",
      description: "The user who is initiating the follow.",
      required: true,
    },
    following: {
      type: "User",
      field: "followingId",
      cardinality: "one",
      description: "The user who is being followed.",
      required: true,
    },
  },
  auth: {
    // A user can only create a follow relationship for themselves.
    create: "isFollower",
    // Follow relationships are public knowledge.
    read: "isPublic",
    // A follow relationship cannot be changed, only created or deleted.
    update: "never",
    // A user can only delete a follow relationship they initiated.
    delete: "isFollower",
  },
};
