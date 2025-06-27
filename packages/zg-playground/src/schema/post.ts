import { z } from "zod";
import { EntityDef } from "@tsmk/zg";
import { AppContext, AppGlobalResolvers } from "./index.js";
import { ZgClient, PostNode } from "../../../../temp-output/schema.zg.js";
import { Policy } from "@tsmk/zg/dist/parser/types.js";

// Infer the schema type for type safety in the resolver
type Post = z.infer<typeof PostSchema>;

const PostSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  author: z.string(),
  createdAt: z.date(),
});

export type IPostResolvers = {
  isAuthor: Policy;
};

export const PostDef: EntityDef<IPostResolvers, AppGlobalResolvers> = {
  name: "Post",
  description: "A post made by a user, which can have comments.",
  schema: PostSchema,
  relationships: {
    author: {
      type: "User",
      field: "author",
      cardinality: "one",
      description: "The user who wrote the post.",
      required: true,
    },
    comments: {
      type: "Comment",
      cardinality: "many",
      description: "Comments on this post.",
      /**
       * This relationship is the reverse of the 'regards' relationship on the Comment node.
       * The 'mappedBy' property indicates that the foreign key is stored on the other node.
       */
      mappedBy: "post",
    },
    images: {
      type: "Image",
      cardinality: "many",
      description: "Images included in this post.",
      mappedBy: "post",
    },
    reactions: {
      type: "Reaction",
      cardinality: "many",
      description: "Reactions on this post.",
      mappedBy: "target",
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

    fields: {
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
};
