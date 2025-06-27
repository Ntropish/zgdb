import { z } from "zod";
import type { ZGEntityDef } from "../../../zg/src/parser/types.js";
import type { AppAuthPolicy } from "./policies.js";

export const PostDef = {
  name: "Post",
  description: "A post made by a user, which can have comments.",
  schema: z.object({
    id: z.string(),
    title: z.string(),
    content: z.string(),
    author: z.string(),
    createdAt: z.date(),
  }),
  relationships: {
    User: {
      author: {
        cardinality: "one",
        description: "The user who wrote the post.",
        required: true,
      },
    },
    Comment: {
      comments: {
        cardinality: "many",
        description: "Comments on this post.",
        /**
         * This relationship is the reverse of the 'regards' relationship on the Comment node.
         * The 'mappedBy' property indicates that the foreign key is stored on the other node.
         */
        mappedBy: "author",
      },
    },
    Image: {
      images: {
        cardinality: "many",
        description: "Images included in this post.",
        mappedBy: "postId",
      },
    },
    Reaction: {
      reactions: {
        cardinality: "many",
        description: "Reactions on this post.",
        mappedBy: "target",
      },
    },
  },
  indexes: [
    {
      on: ["author", "createdAt"],
      description:
        "Index to efficiently query a user's posts, sorted by creation date.",
    },
    {
      on: "content",
      type: "fulltext",
      description: "Enable full-text search on post content.",
    },
  ],
  auth: {
    // Anyone can create a post, as long as they are the author.
    create: "isAuthor",
    // All posts are public.
    read: "isPublic",
    // Only the author can update their own post.
    update: "isAuthor",
    // Only the author can delete their own post.
    delete: "isAuthor",

    relationships: {
      comments: {
        // Anyone can read comments on a post.
        read: "isPublic",
        // Adding/removing comments is handled by the Comment's auth rules.
        add: "never",
        remove: "never",
      },
      images: {
        // Only the author can add or remove images from their post.
        add: "isAuthor",
        remove: "isAuthor",
      },
    },
  },
} as const satisfies ZGEntityDef<any, AppAuthPolicy>;
