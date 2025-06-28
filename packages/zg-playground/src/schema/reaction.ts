import { z } from "zod";
import { EntityDef } from "@zgdb/generate";

const ReactionSchema = z.object({
  id: z.string(),
  type: z.enum(["like", "heart", "laugh", "sad", "angry"]),
  authorId: z.string(),
  targetId: z.string(),
  targetType: z.enum(["post", "comment"]),
});

export const ReactionDef: EntityDef = {
  name: "Reaction",
  description:
    "A reaction from a user to a specific piece of content, like a post or a comment.",
  schema: ReactionSchema,
  relationships: {
    author: {
      entity: "User",
      field: "authorId",
      cardinality: "one",
      description: "The user who made the reaction.",
      required: true,
    },
    target: {
      cardinality: "one",
      description: "The content that was reacted to.",
      required: true,
      type: "polymorphic",
      discriminator: "targetType",
      foreignKey: "targetId",
      references: ["Post", "Comment"],
    },
  },
} as const;
