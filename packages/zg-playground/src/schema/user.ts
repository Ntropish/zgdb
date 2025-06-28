import { z } from "zod";
import { EntityDef } from "@tsmk/zg";

const UserSchema = z.object({
  id: z.string(),
  publicKey: z.string(),
  displayName: z.string().optional(),
  avatarUrl: z.string().optional(),
});

export const UserDef: EntityDef = {
  name: "User",
  schema: UserSchema,
  resolvers: {
    isOwner: ({ actor, input }) => {
      return actor.did === input?.ownerDid;
    },
    isSelf: ({ actor, record }) => {
      if (!record) return false;
      return actor.did === record.id;
    },
  },
  relationships: {
    posts: {
      type: "one-to-many",
      foreignKey: "authorId",
    },
    comments: {
      type: "one-to-many",
      foreignKey: "authorId",
    },
    reactions: {
      type: "one-to-many",
      foreignKey: "authorId",
    },
    followers: {
      type: "many-to-many",
      through: "Follow",
      theirKey: "followingId",
      myKey: "followerId",
    },
    following: {
      type: "many-to-many",
      through: "Follow",
      theirKey: "followerId",
      myKey: "followingId",
    },
  },
} as const;
