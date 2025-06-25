import { z } from "zod";

export default {
  name: "Comment",
  description: "A comment on a post",
  schema: z.object({
    id: z.string(),
    content: z.string(),
    author: z.string(),
    regards: z.string(),
    createdAt: z.date(),
  }),
  relationships: {
    user: {
      author: {
        cardinality: "one",
        description: "The user who wrote the comment",
        required: true,
      },
    },
    post: {
      regards: {
        cardinality: "one",
        description: "The post that the comment is about",
        required: true,
      },
    },
    reaction: {
      reactions: {
        cardinality: "many",
        description: "Reactions on this comment.",
        mappedBy: "target",
      },
    },
  },
  indexes: [
    {
      on: ["regards", "createdAt"],
      description:
        "Index to efficiently query a post's comments, sorted by creation date.",
    },
    {
      on: "author",
      description: "Index to efficiently query a user's comments.",
    },
  ],
};
