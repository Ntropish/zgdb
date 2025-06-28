import { z } from "zod";

const ImageSchema = z.object({
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
});

export const ImageDef = {
  name: "Image",
  description:
    "An image, which can be a user's profile picture or part of a post.",
  schema: ImageSchema,
  relationships: {
    post: {
      type: "Post",
      field: "postId",
      cardinality: "one",
      description: "The post this image is associated with, if any.",
    },
    user: {
      type: "User",
      field: "userId",
      cardinality: "one",
      description: "The user this image is a profile picture for, if any.",
    },
  },
} as const;
