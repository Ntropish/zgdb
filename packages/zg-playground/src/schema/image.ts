import { z } from "zod";
import { EntityDef, AuthContext } from "@tsmk/zg";
import { MyAppActor } from "./index.js";
import { PostDef } from "./post.js";
import { UserDef } from "./user.js";

// Infer the schema types for type safety in the resolver
type Post = z.infer<typeof PostDef.schema>;
type User = z.infer<typeof UserDef.schema>;
type Image = z.infer<(typeof ImageDef)["schema"]>;

export const ImageDef: EntityDef<MyAppActor> = {
  name: "Image",
  description:
    "An image, which can be a user's profile picture or part of a post.",
  policies: {
    isOwner: ({
      actor,
      context,
    }: AuthContext<MyAppActor, Image, { post?: Post; user?: User }>) => {
      if (context?.post) {
        return actor.did === context.post.author;
      }
      if (context?.user) {
        return actor.did === context.user.id;
      }
      // If there's no context, we can't determine ownership.
      return false;
    },
  },
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
    // Creating, updating, or deleting an image requires ownership,
    // determined by the parent Post or User.
    create: "isOwner",
    // Images are public.
    read: "isPublic",
    update: "isOwner",
    delete: "isOwner",
  },
};
