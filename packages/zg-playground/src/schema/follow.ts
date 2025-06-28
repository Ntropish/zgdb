import { z } from "zod";
import { EntityDef } from "@zgdb/generate";

const FollowSchema = z.object({
  id: z.string(),
  followerId: z.string(),
  followingId: z.string(),
  createdAt: z.date(),
});

export const FollowDef: EntityDef = {
  name: "Follow",
  description:
    "A directional relationship indicating one user follows another.",
  schema: FollowSchema,
  relationships: {
    follower: {
      entity: "User",
      field: "followerId",
      cardinality: "one",
      description: "The user who is initiating the follow.",
      required: true,
    },
    following: {
      entity: "User",
      field: "followingId",
      cardinality: "one",
      description: "The user who is being followed.",
      required: true,
    },
  },
} as const;
