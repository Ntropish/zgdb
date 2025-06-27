import { z } from "zod";
import { EntityDef, AuthContext } from "@tsmk/zg";
import { MyAppActor, AppGlobalPolicies } from "./index.js";
import { ZgClient, FollowNode } from "../../../../temp-output/schema.zg.js";

const FollowSchema = z.object({
  id: z.string(),
  followerId: z.string(),
  followingId: z.string(),
  createdAt: z.date(),
});
type Follow = z.infer<typeof FollowSchema>;

export interface IFollowResolvers {
  isFollower: (
    context: AuthContext<MyAppActor, FollowNode, Follow, ZgClient>
  ) => boolean;
}

export const FollowDef: EntityDef<
  MyAppActor,
  IFollowResolvers,
  AppGlobalPolicies
> = {
  name: "Follow",
  description:
    "A directional relationship indicating one user follows another.",
  schema: FollowSchema,
  relationships: {
    User: {
      followerId: {
        cardinality: "one",
        description: "The user who is initiating the follow.",
        required: true,
      },
      followingId: {
        cardinality: "one",
        description: "The user who is being followed.",
        required: true,
      },
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
