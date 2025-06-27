import { z } from "zod";
import { EntityDef } from "@tsmk/zg";
import { AppContext, AppGlobalResolvers } from "./index.js";
import { PostDef } from "./post.js";
import { ZgClient, PostTagNode } from "../../../../temp-output/schema.zg.js";
import { Policy } from "@tsmk/zg/dist/parser/types.js";

// Extracts the schema type for type safety in the resolver
type Post = z.infer<typeof PostDef.schema>;
type PostTag = z.infer<typeof PostTagDef.schema>;

const PostTagSchema = z.object({
  id: z.string(),
  postId: z.string(),
  tagId: z.string(),
});

export type IPostTagResolvers = {
  isPostAuthor: Policy;
};

export const PostTagDef: EntityDef<IPostTagResolvers, AppGlobalResolvers> = {
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
  auth: {
    // Creating/updating/deleting a PostTag requires being the author of the Post.
    create: "isPostAuthor",
    // The connection is public.
    read: "isPublic",
    update: "isPostAuthor",
    delete: "isPostAuthor",
  },
};
