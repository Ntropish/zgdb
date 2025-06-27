import { z } from "zod";
import { EntityDef } from "@tsmk/zg";
import { MyAppActor, AppGlobalPolicies } from "./index.js";

const TagSchema = z.object({
  id: z.string(),
  name: z.string().max(50),
});
// type Tag = z.infer<typeof TagSchema>; // Not needed as no resolvers

export const TagDef: EntityDef<MyAppActor, {}, AppGlobalPolicies> = {
  name: "Tag",
  description: "A tag that can be applied to posts to categorize them.",
  schema: TagSchema,
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
