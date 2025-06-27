import { z } from "zod";
import { EntityDef, AuthContext } from "@tsmk/zg";
import { MyAppActor, AppGlobalPolicies } from "./index.js";
import { ZgClient, UserNode } from "../../../../temp-output/schema.zg.js";

const UserSchema = z.object({
  id: z.string(),
  ownerDid: z.string(),
  name: z.string(),
  email: z.string().email(),
});
type User = z.infer<typeof UserSchema>;

export interface IUserResolvers {
  isSelf: (
    context: AuthContext<MyAppActor, UserNode, User, ZgClient>
  ) => boolean;
  isOwner: (
    context: AuthContext<MyAppActor, UserNode, User, ZgClient>
  ) => boolean;
}

export const UserDef: EntityDef<IUserResolvers, AppGlobalPolicies> = {
  name: "User",
  description: "A user of the application, who can author posts and comments.",
  schema: UserSchema,
  relationships: {
    posts: {
      type: "Post",
      cardinality: "many",
      description: "Posts written by the user.",
      mappedBy: "author",
    },
    comments: {
      type: "Comment",
      cardinality: "many",
      description: "Comments written by the user.",
      mappedBy: "author",
    },
    followers: {
      type: "Follow",
      cardinality: "many",
      description: "Users who are following this user.",
      mappedBy: "following",
    },
    following: {
      type: "Follow",
      cardinality: "many",
      description: "Users this user is following.",
      mappedBy: "follower",
    },
    profilePicture: {
      type: "Image",
      cardinality: "one",
      description: "The user's profile picture.",
      mappedBy: "user",
    },
    reactions: {
      type: "Reaction",
      cardinality: "many",
      description: "Reactions made by the user.",
      mappedBy: "author",
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
    create: "isOwner",
    read: "isPublic",
    update: ["isSelf", "hasAdminRights"],
    delete: "isSelf",
    fields: {
      email: {
        read: "isSelf",
      },
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
    relationships: {
      posts: {
        add: "isSelf",
      },
    },
  },
};
