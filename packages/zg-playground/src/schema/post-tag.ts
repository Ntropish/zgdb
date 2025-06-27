import { z } from "zod";
import type { ZGEntityDef } from "../../../zg/src/parser/types.js";
import type { AppAuthPolicy } from "./policies.js";

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
  auth: {
    // Only the author of the post can tag it.
    create: "isPostAuthor",
    // The connection is public.
    read: "isPublic",
    // The connection cannot be changed, only created or deleted.
    update: "never",
    // Only the author of the post can remove a tag.
    delete: "isPostAuthor",
  },
} as const satisfies ZGEntityDef<any, AppAuthPolicy>;
