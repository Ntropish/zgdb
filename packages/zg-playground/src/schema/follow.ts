import { z } from "zod";
import { RawSchema } from "@tsmk/zg";

const schema: RawSchema = {
  name: "Follow",
  description:
    "A directional relationship indicating one user follows another.",
  schema: z.object({
    id: z.string(),
    followerId: z.string(),
    followingId: z.string(),
    createdAt: z.date(),
  }),
  relationships: {
    user: {
      follower: {
        cardinality: "one",
        description: "The user who is initiating the follow.",
        required: true,
      },
      following: {
        cardinality: "one",
        description: "The user who is being followed.",
        required: true,
      },
    },
  },
};

export default schema;
