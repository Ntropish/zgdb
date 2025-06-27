import { z } from "zod";
import type { ZGEntityDef } from "../../../zg/src/parser/types.js";
import type { AppAuthPolicy } from "./policies.js";

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
    Post: {
      postId: {
        cardinality: "one",
        description: "The post this image is associated with, if any.",
      },
    },
    User: {
      userId: {
        cardinality: "one",
        description: "The user this image is a profile picture for, if any.",
      },
    },
  },
  auth: {
    // Only the owner (the user who uploaded it or the author of the post it's in) can create it.
    create: "isOwner",
    // Images are public.
    read: "isPublic",
    // Only the owner can update the alt text or other metadata.
    update: "isOwner",
    // Only the owner can delete an image.
    delete: "isOwner",
  },
} as const satisfies ZGEntityDef<any, AppAuthPolicy>;
