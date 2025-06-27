import { z } from "zod";
import type { ZGEntityDef } from "../../../zg/src/parser/types.js";
import type { AppAuthPolicy } from "./policies.js";

export const CommentDef = {
  name: "Comment",
  description: "A comment on a post",
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
    // Only the author can delete their own comment.
    delete: "isAuthor",
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
} as const satisfies ZGEntityDef<any, AppAuthPolicy>;
