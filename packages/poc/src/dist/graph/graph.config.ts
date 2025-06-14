import { z } from "zod";

// --- Node Definitions ---
const userNode = z.object({
  id: z.string().uuid(),
  name: z.string(),
  age: z.number().int(),
});

const postNode = z.object({
  id: z.string().uuid(),
  title: z.string(),
  published: z.boolean(),
  viewCount: z.number().int(),
});

const tagNode = z.object({
  id: z.string(),
  name: z.string(),
});

// --- Graph Configuration ---
const graphConfig = {
  schema: {
    nodes: {
      user: userNode,
      post: postNode,
      tag: tagNode,
    },
    edges: [
      {
        source: "user",
        target: "post",
        cardinality: "one-to-many",
        name: {
          forward: "posts",
          backward: "author",
        },
      },
      {
        source: "post",
        target: "tag",
        cardinality: "one-to-many",
        name: {
          forward: "tags",
          backward: "posts",
        },
      },
    ],
  },
};

export default graphConfig;
