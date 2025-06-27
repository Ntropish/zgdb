import { z } from "zod";
import { EntityDef } from "@tsmk/zg";
import { AppGlobalResolvers } from "./index.js";
import { ZgClient, CommentNode } from "../../../../temp-output/schema.zg.js";
import { Policy } from "@tsmk/zg/dist/parser/types.js";

// Step 1: Define the Zod schema and its TypeScript type.
const CommentSchema = z.object({
  id: z.string(),
  content: z.string(),
  authorId: z.string(),
  postId: z.string(),
  createdAt: z.date(),
});
type Comment = z.infer<typeof CommentSchema>;

// Step 2: Define the interface for the resolver fields on this entity.
export type ICommentResolvers = {
  isAuthor: Policy;
  isPostAuthor: Policy;
};

// Step 3: Define the entity, parameterized by its local and global resolvers.
export const CommentDef: EntityDef<ICommentResolvers, AppGlobalResolvers> = {
  name: "Comment",
  description: "A comment on a post",
  schema: CommentSchema,
  relationships: {
    author: {
      type: "User",
      field: "authorId",
      cardinality: "one",
    },
    post: {
      type: "Post",
      field: "postId",
      cardinality: "one",
    },
    reactions: {
      type: "Reaction",
      cardinality: "many",
      mappedBy: "target",
    },
  },
  indexes: [
    {
      on: ["postId", "createdAt"],
      description:
        "Index to efficiently query a post's comments, sorted by creation date.",
    },
    {
      on: "authorId",
      description: "Index to efficiently query a user's comments.",
    },
  ],
  auth: {
    create: "isAuthor",
    read: "isPublic",
    update: "isAuthor",
    delete: ["isAuthor", "isPostAuthor"],
    fields: {
      reactions: {
        read: "isPublic",
        add: "never",
        remove: "never",
      },
    },
  },
};
