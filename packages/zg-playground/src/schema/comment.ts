import { z } from "zod";

export default {
  name: "Comment",
  description: "A comment on a post",
  schema: z.object({
    id: z.string(),
    content: z.string(),
    author: z.string(),
    regards: z.string(),
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
  },
};
