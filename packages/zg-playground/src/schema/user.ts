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
    post: {
      posts: {
        cardinality: "many",
        description: "Posts written by the user.",
        mappedBy: "author",
      },
    },
    comment: {
      comments: {
        cardinality: "many",
        description: "Comments written by the user.",
        mappedBy: "author",
      },
    },
    follow: {
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
    image: {
      profilePicture: {
        cardinality: "one",
        description: "The user's profile picture.",
        mappedBy: "userId",
      },
    },
    reaction: {
      reactions: {
        cardinality: "many",
        description: "Reactions made by the user.",
        mappedBy: "author",
      },
    },
  },
};
