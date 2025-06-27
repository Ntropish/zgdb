import { z } from "zod";
import { EntityDef, AuthContext } from "@tsmk/zg";
import { MyAppActor } from "./index.js";
import { PostDef } from "./post.js";

// Extracts the schema type for type safety in the resolver
type Post = z.infer<typeof PostDef.schema>;

export const PostTagDef: EntityDef<MyAppActor> = {
  name: "PostTag",
  description: "The join entity connecting a Post and a Tag.",
  policies: {
    isPostAuthor: ({
      actor,
      context,
    }: AuthContext<MyAppActor, any, { post?: Post }>) => {
      // The runtime is responsible for fetching the Post and providing it here.
      if (!context?.post) return false;
      return actor.did === context.post.author;
    },
  },
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
  auth: {
    // Creating/updating/deleting a PostTag requires being the author of the Post.
    create: "isPostAuthor",
    // The connection is public.
    read: "isPublic",
    update: "isPostAuthor",
    delete: "isPostAuthor",
  },
};
