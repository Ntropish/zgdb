import { z } from "zod";
const schema = {
    // Represents a user's investment portfolio
    portfolio: {
        fields: z.object({
            name: z.string(),
            cashBalance: z.number(),
            riskProfile: z.enum(["Conservative", "Moderate", "Aggressive"]),
            // The total amount of cash ever added to this portfolio
            totalInvested: z.number(),
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
            // Represents the stock's inherent volatility as a standard deviation
            volatility: z.number(),
            // Represents the stock's natural growth trend (or decay) per month
            growthTrend: z.number(),
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
            // The average price paid for the shares in this holding
            costBasis: z.number(),
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
