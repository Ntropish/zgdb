import { z } from "zod";

export default {
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
    user: {
      author: {
        cardinality: "one",
        description: "The user who wrote the post.",
        required: true,
      },
    },
    comment: {
      comments: {
        cardinality: "many",
        description: "Comments on this post.",
        /**
         * This relationship is the reverse of the 'regards' relationship on the Comment node.
         * The 'mappedBy' property indicates that the foreign key is stored on the other node.
         */
        mappedBy: "regards",
      },
    },
    image: {
      images: {
        cardinality: "many",
        description: "Images included in this post.",
        mappedBy: "postId",
      },
    },
    reaction: {
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
};
