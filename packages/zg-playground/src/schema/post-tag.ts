import { z } from "zod";

export default {
  name: "PostTag",
  description: "The join entity connecting a Post and a Tag.",
  schema: z.object({
    id: z.string(),
    postId: z.string(),
    tagId: z.string(),
  }),
  relationships: {
    Post: {
      postId: {
        cardinality: "one",
        description: "The post being tagged.",
        required: true,
      },
    },
    Tag: {
      tagId: {
        cardinality: "one",
        description: "The tag being applied.",
        required: true,
      },
    },
  },
  manyToMany: {
    left: {
      node: "Post",
      field: "tags",
      foreignKey: "postId",
    },
    right: {
      node: "Tag",
      field: "posts",
      foreignKey: "tagId",
    },
  },
};
