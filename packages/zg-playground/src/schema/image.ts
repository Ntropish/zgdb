import { z } from "zod";
import { EntityDef } from "@tsmk/zg";
import { AppGlobalPolicies } from "./index.js";
import { Policy } from "@tsmk/zg/dist/parser/types.js";

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

export type IImageResolvers = {
  isOwner: Policy;
};

export const ImageDef: EntityDef<IImageResolvers, AppGlobalPolicies> = {
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
  auth: {
    // Creating, updating, or deleting an image requires ownership,
    // determined by the parent Post or User.
    create: "isOwner",
    // Images are public.
    read: "isPublic",
    update: "isOwner",
    delete: "isOwner",
  },
};
