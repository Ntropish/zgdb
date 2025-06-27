import { z } from "zod";
import type { ZGEntityDef } from "../../../zg/src/parser/types.js";
import type { AppAuthPolicy } from "./policies.js";

export const FollowDef = {
  name: "Follow",
  description:
    "A directional relationship indicating one user follows another.",
  schema: z.object({
    id: z.string(),
    followerId: z.string(),
    followingId: z.string(),
    createdAt: z.date(),
  }),
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
} as const satisfies ZGEntityDef<any, AppAuthPolicy>;
