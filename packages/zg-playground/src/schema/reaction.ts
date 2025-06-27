import { z } from "zod";
import { EntityDef, AuthContext } from "@tsmk/zg";
import { MyAppActor } from "./index.js";
import { ZgClient } from "../../../../temp-output/schema.zg.js";

// Infer the schema type for type safety in the resolver
type Reaction = z.infer<(typeof ReactionDef)["schema"]>;

export const ReactionDef: EntityDef<MyAppActor, ZgClient> = {
  name: "Reaction",
  description:
    "A reaction from a user to a specific piece of content, like a post or a comment.",
  policies: {
    isAuthor: ({
      actor,
      record,
      input,
    }: AuthContext<MyAppActor, Reaction, ZgClient>) => {
      if (record) return actor.did === record.author;
      if (input) return actor.did === input.author;
      return false;
    },
  },
  schema: z.object({
    id: z.string(),
    type: z.enum(["like", "heart", "laugh", "sad", "angry"]),
    author: z.string(),
    targetId: z.string(),
    targetType: z.enum(["post", "comment"]),
  }),
  relationships: {
    User: {
      author: {
        cardinality: "one",
        description: "The user who made the reaction.",
        required: true,
      },
    },
    polymorphic: {
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
  },
  auth: {
    // A user must be the author to create the reaction.
    create: "isAuthor",
    // All reactions are public.
    read: "isPublic",
    // Reactions are immutable; they cannot be changed.
    update: "never",
    // Only the author can delete (i.e., undo) their reaction.
    delete: "isAuthor",
  },
};
