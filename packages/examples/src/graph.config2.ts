import { z } from "zod";

const schema = {
  user: {
    fields: z.object({
      name: z.string(),
      age: z.number().int(),
    }),
    relations: {
      posts: ["many", "post"],
    },
  },
  post: {
    fields: z.object({
      title: z.string(),
      published: z.boolean(),
      viewCount: z.number().int(),
    }),
    relations: {
      tags: ["many", "tag"],
      author: ["one", "user"],
    },
  },
  tag: {
    fields: z.object({
      name: z.string(),
    }),
    relations: {
      posts: ["many", "post"],
    },
  },
};

export default schema;
