import { z } from "zod";
import { EntityDef } from "@tsmk/zg";

export const UserDef: EntityDef = {
  name: "User",
  schema: z.object({
    id: z.string().describe("The user's unique identifier (e.g., a DID)."),
    publicKey: z.string().describe("The user's public key for signing."),
    displayName: z.string().describe("The user's chosen display name."),
    avatarUrl: z
      .string()
      .url()
      .optional()
      .describe("URL for the user's avatar image."),
  }),

  relationships: {
    posts: {
      type: "standard",
      entity: "Post",
      cardinality: "many",
      mappedBy: "author",
    },
    comments: {
      type: "standard",
      entity: "Comment",
      cardinality: "many",
      mappedBy: "author",
    },
    reactions: {
      type: "standard",
      entity: "Reaction",
      cardinality: "many",
      mappedBy: "author",
    },
    following: {
      type: "standard",
      entity: "Follow",
      cardinality: "many",
      mappedBy: "follower",
    },
    followers: {
      type: "standard",
      entity: "Follow",
      cardinality: "many",
      mappedBy: "following",
    },
  },
} as const;
