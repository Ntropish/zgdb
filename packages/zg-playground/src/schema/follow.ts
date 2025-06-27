import { z } from "zod";
import { EntityDef, AuthContext } from "@tsmk/zg";
import { MyAppActor } from "./index.js";

// Infer the schema type for type safety in the resolver
type Follow = z.infer<(typeof FollowDef)["schema"]>;

export const FollowDef: EntityDef<MyAppActor> = {
  name: "Follow",
  description:
    "A directional relationship indicating one user follows another.",
  policies: {
    isFollower: ({ actor, record, input }: AuthContext<MyAppActor, Follow>) => {
      if (record) return actor.did === record.followerId;
      if (input) return actor.did === input.followerId;
      return false;
    },
  },
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
};
