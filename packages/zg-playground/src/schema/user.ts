import { z } from "zod";

export default {
  name: "User",
  description: "A user of the application, who can author posts and comments.",
  schema: z.object({
    id: z.string(),
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
};
