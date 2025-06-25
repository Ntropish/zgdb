import { z } from "zod";

export default {
  name: "User",
  description: "A user of the application, who can author posts and comments.",
  schema: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
  }),
  relationships: {
    post: {
      posts: {
        cardinality: "many",
        description: "Posts written by the user.",
        mappedBy: "author",
      },
    },
    comment: {
      comments: {
        cardinality: "many",
        description: "Comments written by the user.",
        mappedBy: "author",
      },
    },
  },
};
