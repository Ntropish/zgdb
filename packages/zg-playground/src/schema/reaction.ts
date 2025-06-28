import { z } from "zod";

const ReactionSchema = z.object({
  id: z.string(),
  type: z.enum(["like", "heart", "laugh", "sad", "angry"]),
  author: z.string(),
  targetId: z.string(),
  targetType: z.enum(["post", "comment"]),
});

export const ReactionDef = {
  name: "Reaction",
  description:
    "A reaction from a user to a specific piece of content, like a post or a comment.",
  schema: ReactionSchema,
  relationships: {
    author: {
      type: "User",
      field: "author",
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
