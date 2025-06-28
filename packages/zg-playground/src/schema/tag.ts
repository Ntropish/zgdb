import { z } from "zod";

const TagSchema = z.object({
  id: z.string(),
  name: z.string().max(50),
});

export const TagDef = {
  name: "Tag",
  description: "A tag that can be applied to posts to categorize them.",
  schema: TagSchema,
  relationships: {},
} as const;
