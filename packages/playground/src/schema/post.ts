import { z } from "zod";
import { EntityDef } from "@zgdb/generate";

export const PostSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  authorId: z.string(),
  createdAt: z.bigint(),
});

export const PostDef: EntityDef = {
  name: "Post",
  description: "A post made by a user, which can have comments.",
  schema: PostSchema,
  relationships: {
    author: {
      entity: "User",
      field: "authorId",
      cardinality: "one",
      description: "The user who wrote the post.",
      required: true,
    },
    comments: {
      entity: "Comment",
      cardinality: "many",
      description: "Comments on this post.",
      /**
       * This relationship is the reverse of the 'regards' relationship on the Comment node.
       * The 'mappedBy' property indicates that the foreign key is stored on the other node.
       */
      mappedBy: "post",
    },
    images: {
      entity: "Image",
      cardinality: "many",
      description: "Images included in this post.",
      mappedBy: "post",
    },
    reactions: {
      entity: "Reaction",
      cardinality: "many",
      description: "Reactions on this post.",
      mappedBy: "target",
    },
  },
  indexes: [
    {
      on: ["authorId", "createdAt"],
      description:
        "Index to efficiently query a user's posts, sorted by creation date.",
    },
    {
      on: "content",
      type: "fulltext",
      description: "Enable full-text search on post content.",
    },
  ],
} as const;
