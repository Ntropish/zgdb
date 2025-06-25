import { z } from "zod";

export default {
  name: "Image",
  description:
    "An image, which can be a user's profile picture or part of a post.",
  schema: z.object({
    id: z.string(),
    url: z.string().url(),
    altText: z.string().optional(),
    metadata: z.object({
      width: z.number(),
      height: z.number(),
      format: z.enum(["jpeg", "png", "gif"]),
      createdAt: z.date(),
    }),
    postId: z.string().optional(),
    userId: z.string().optional(),
  }),
  relationships: {
    post: {
      post: {
        cardinality: "one",
        description: "The post this image is associated with, if any.",
      },
    },
    user: {
      user: {
        cardinality: "one",
        description: "The user this image is a profile picture for, if any.",
      },
    },
  },
};
