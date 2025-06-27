import { z } from "zod";
import { EntityDef, AuthContext } from "@tsmk/zg";
import { MyAppActor, AppGlobalPolicies } from "./index.js";
import { PostDef } from "./post.js";
import { ZgClient, PostTagNode } from "../../../../temp-output/schema.zg.js";

// Extracts the schema type for type safety in the resolver
type Post = z.infer<typeof PostDef.schema>;
type PostTag = z.infer<typeof PostTagDef.schema>;

const PostTagSchema = z.object({
  id: z.string(),
  postId: z.string(),
  tagId: z.string(),
});

export interface IPostTagResolvers {
  isPostAuthor: (
    context: AuthContext<MyAppActor, PostTagNode, PostTag, ZgClient>
  ) => Promise<boolean>;
}

export const PostTagDef: EntityDef<
  MyAppActor,
  IPostTagResolvers,
  AppGlobalPolicies
> = {
  name: "PostTag",
  description: "The join entity connecting a Post and a Tag.",
  schema: PostTagSchema,
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
  auth: {
    // Creating/updating/deleting a PostTag requires being the author of the Post.
    create: "isPostAuthor",
    // The connection is public.
    read: "isPublic",
    update: "isPostAuthor",
    delete: "isPostAuthor",
  },
};
