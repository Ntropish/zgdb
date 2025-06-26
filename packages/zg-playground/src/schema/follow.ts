import { z } from "zod";

export default {
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
    User: {
      followerId: {
        cardinality: "one",
        description: "The user who is initiating the follow.",
        required: true,
      },
      followingId: {
        cardinality: "one",
        description: "The user who is being followed.",
        required: true,
      },
    },
  },
};
