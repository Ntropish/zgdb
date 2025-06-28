import { z } from "zod";
import { EntityDef } from "@tsmk/zg";

const PostTagSchema = z.object({
  id: z.string(),
  postId: z.string(),
  tagId: z.string(),
});

export const PostTagDef: EntityDef = {
  name: "PostTag",
  description: "The join entity connecting a Post and a Tag.",
  schema: PostTagSchema,
  relationships: {
    post: {
      type: "Post",
      field: "postId",
      cardinality: "one",
      description: "The post being tagged.",
      required: true,
    },
    tag: {
      type: "Tag",
      field: "tagId",
      cardinality: "one",
      description: "The tag being applied.",
      required: true,
    },
  },
} as const;
