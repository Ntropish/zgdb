import { z } from "zod";
import { EntityDef } from "@tsmk/zg";
import { MyAppActor } from "./index.js";
import { ZgClient } from "../../../../temp-output/schema.zg.js";

export const TagDef: EntityDef<MyAppActor, ZgClient> = {
  name: "Tag",
  description: "A tag that can be applied to posts to categorize them.",
  schema: z.object({
    id: z.string(),
    name: z.string().max(50),
  }),
  relationships: {},
  auth: {
    // Any authenticated user can create a new tag.
    create: "isAuthenticated",
    // All tags are public.
    read: "isPublic",
    // Only admins can update a tag's name.
    update: "hasAdminRights",
    // Only admins can delete a tag to prevent abuse.
    delete: "hasAdminRights",
  },
};
