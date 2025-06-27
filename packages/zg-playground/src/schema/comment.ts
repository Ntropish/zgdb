import { z } from "zod";
import { EntityDef, AuthContext } from "@tsmk/zg";
import { MyAppActor } from "./index.js";
import { PostDef } from "./post.js";

// Infer the schema types for type safety in the resolver
type Post = z.infer<typeof PostDef.schema>;
type Comment = z.infer<(typeof CommentDef)["schema"]>;

export const CommentDef: EntityDef<MyAppActor> = {
  name: "Comment",
  description: "A comment on a post",
  policies: {
    isAuthor: ({ actor, record, input }: AuthContext<MyAppActor, Comment>) => {
      if (record) return actor.did === record.author;
      if (input) return actor.did === input.author;
      return false;
    },
    isPostAuthor: ({
      actor,
      context,
    }: AuthContext<MyAppActor, Comment, { post?: Post }>) => {
      // The runtime is responsible for fetching the Post and providing it here.
      if (!context?.post) return false;
      return actor.did === context.post.author;
    },
  },
  schema: z.object({
    id: z.string(),
    content: z.string(),
    author: z.string(),
    regards: z.string(),
    createdAt: z.date(),
  }),
  relationships: {
    User: {
      author: {
        cardinality: "one",
        description: "The user who wrote the comment",
        required: true,
      },
    },
    Post: {
      regards: {
        cardinality: "one",
        description: "The post that the comment is about",
        required: true,
      },
    },
    Reaction: {
      reactions: {
        cardinality: "many",
        description: "Reactions on this comment.",
        mappedBy: "target",
      },
    },
  },
  indexes: [
    {
      on: ["regards", "createdAt"],
      description:
        "Index to efficiently query a post's comments, sorted by creation date.",
    },
    {
      on: "author",
      description: "Index to efficiently query a user's comments.",
    },
  ],
  auth: {
    // A user must be the author to create the comment.
    create: "isAuthor",
    // All comments are public.
    read: "isPublic",
    // Only the author can update their own comment.
    update: "isAuthor",
    // The comment author or the post author can delete a comment.
    delete: ["isAuthor", "isPostAuthor"],
    relationships: {
      reactions: {
        // Anyone can see reactions to a comment.
        read: "isPublic",
        // Adding/removing reactions is handled by the Reaction's auth rules.
        add: "never",
        remove: "never",
      },
    },
  },
};
