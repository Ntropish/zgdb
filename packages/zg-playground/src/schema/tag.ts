import { z } from "zod";

export default {
  name: "Tag",
  description: "A tag that can be applied to posts to categorize them.",
  schema: z.object({
    id: z.string(),
    name: z.string().max(50),
  }),
  relationships: {},
};
