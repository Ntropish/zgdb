import { z } from "zod";

const schema = {
  // Represents a user's investment portfolio
  portfolio: {
    fields: z.object({
      name: z.string(),
      cashBalance: z.number(),
    }),
    relations: {
      holdings: ["many", "holding"],
      trades: ["many", "trade"],
    },
  },

  // Represents a publicly traded stock
  stock: {
    fields: z.object({
      ticker: z.string().toUpperCase(),
      companyName: z.string(),
      currentPrice: z.number(),
    }),
    relations: {
      holdings: ["many", "holding"],
      trades: ["many", "trade"],
    },
  },

  // A "join" node representing shares of a stock in a portfolio
  holding: {
    fields: z.object({
      shares: z.number(),
    }),
    relations: {
      portfolio: ["one", "portfolio"],
      stock: ["one", "stock"],
    },
  },

  // A record of a buy or sell transaction
  trade: {
    fields: z.object({
      type: z.enum(["buy", "sell"]),
      shares: z.number(),
      pricePerShare: z.number(),
      timestamp: z.number(),
    }),
    relations: {
      portfolio: ["one", "portfolio"],
      stock: ["one", "stock"],
    },
  },
};

export default schema;
