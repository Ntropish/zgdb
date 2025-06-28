import { z } from "zod";
import { EntityDef } from "@tsmk/zg";

const TagSchema = z.object({
  id: z.string(),
  name: z.string().max(50),
});

export const TagDef: EntityDef = {
  name: "Tag",
  description: "A tag that can be applied to posts to categorize them.",
  schema: TagSchema,
  relationships: {},
} as const;
