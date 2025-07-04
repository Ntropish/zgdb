import { z } from "zod";
import { EntityDef } from "@zgdb/generate";

// Step 1: Define the Zod schema and its TypeScript type.
const CommentSchema = z.object({
  id: z.string(),
  content: z.string(),
  authorId: z.string(),
  postId: z.string(),
  createdAt: z.date(),
});

// Step 3: Define the entity, parameterized by its local and global resolvers.
export const CommentDef: EntityDef = {
  name: "Comment",
  description: "A comment on a post",
  schema: CommentSchema,
  relationships: {
    author: {
      entity: "User",
      field: "authorId",
      cardinality: "one",
    },
    post: {
      entity: "Post",
      field: "postId",
      cardinality: "one",
    },
    reactions: {
      entity: "Reaction",
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
} as const;
