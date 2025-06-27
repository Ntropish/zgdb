import { z } from "zod";
import { EntityDef, AuthContext } from "@tsmk/zg";
import { MyAppActor } from "./index.js";

export const UserDef: EntityDef<MyAppActor> = {
  name: "User",
  description: "A user of the application, who can author posts and comments.",
  policies: {
    isSelf: ({
      actor,
      record,
    }: AuthContext<MyAppActor, { ownerDid: string }>) =>
      !!(actor && record && actor.did === record.ownerDid),
    isCreatingSelf: ({
      actor,
      input,
    }: AuthContext<MyAppActor, { ownerDid: string }>) =>
      !!(actor && input && actor.did === input.ownerDid),
  },
  schema: z.object({
    id: z.string(),
    ownerDid: z.string(),
    name: z.string(),
    email: z.string().email(),
  }),
  relationships: {
    Post: {
      posts: {
        cardinality: "many",
        description: "Posts written by the user.",
        mappedBy: "author",
      },
    },
    Comment: {
      comments: {
        cardinality: "many",
        description: "Comments written by the user.",
        mappedBy: "author",
      },
    },
    Follow: {
      followers: {
        cardinality: "many",
        description: "Users who are following this user.",
        mappedBy: "followingId",
      },
      following: {
        cardinality: "many",
        description: "Users this user is following.",
        mappedBy: "followerId",
      },
    },
    Image: {
      profilePicture: {
        cardinality: "one",
        description: "The user's profile picture.",
        mappedBy: "userId",
      },
    },
    Reaction: {
      reactions: {
        cardinality: "many",
        description: "Reactions made by the user.",
        mappedBy: "author",
      },
    },
  },
  indexes: [
    {
      on: "email",
      unique: true,
      description:
        "Ensure user emails are unique for authentication and fast lookup.",
    },
    {
      on: "name",
      description: "Index user names for sorting and searching.",
    },
  ],
  auth: {
    create: "isCreatingSelf",
    read: "isPublic",
    update: ["isSelf", "hasAdminRights"],
    delete: "isSelf",

    fields: {
      email: {
        read: "isSelf",
      },
    },

    relationships: {
      posts: {
        add: "isSelf",
        remove: "isSelf",
      },
      followers: {
        read: "isPublic",
        add: "never",
        remove: "never",
      },
    },
  },
};
