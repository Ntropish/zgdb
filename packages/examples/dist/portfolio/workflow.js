import { faker } from "@faker-js/faker";
import { createSyncClient, } from "./dist/graph/zgdb-client.js";
import { MapStoreAdapterSync } from "@zgdb/runtime";
// ============================================
//  Setup & Configuration
// ============================================
const db = createSyncClient(new MapStoreAdapterSync());
const SIMULATION_YEARS = 20;
const MONTHS_PER_YEAR = 12;
const INITIAL_CASH = 100000;
const ANNUAL_INVESTMENT = 12000;
const MONTHLY_INVESTMENT = ANNUAL_INVESTMENT / MONTHS_PER_YEAR;
const MARKET_EVENT_CHANCE = 0.15; // 15% chance of a major market event each year
const STOCK_NEWS_CHANCE = 0.1; // 10% chance of major news for a stock each month
// ============================================
//  Core Simulation Logic
// ============================================
/**
 * Executes a trade for a given portfolio, updating cash, holdings, and recording the transaction.
 * This function now also updates the cost basis of the holding.
 */
function executeTrade(tx, portfolioId, stockId, type, shares, log = true) {
    if (shares <= 0)
        return;
    const stock = tx.getNode("stock", stockId);
    if (!stock)
        throw new Error("Stock not found.");
    const portfolio = tx.getNode("portfolio", portfolioId);
    if (!portfolio)
        throw new Error("Portfolio not found.");
    const tradeValue = shares * stock.fields.currentPrice;
    if (type === "buy" && portfolio.fields.cashBalance < tradeValue) {
        if (log)
            console.log(`      - TRADE FAILED: Insufficient funds to buy ${shares} of ${stock.fields.ticker}.`);
        return;
    }
    const holdingId = portfolio.relationIds.holdings.find((hId) => tx.getNode("holding", hId)?.relationIds.stock === stockId);
    const existingHolding = holdingId ? tx.getNode("holding", holdingId) : null;
    if (type === "sell" &&
        (!existingHolding || existingHolding.fields.shares < shares)) {
        if (log)
            console.log(`      - TRADE FAILED: Not enough shares to sell ${shares} of ${stock.fields.ticker}.`);
        return;
    }
    const trade = tx.createNode("trade", {
        fields: {
            type,
            shares,
            pricePerShare: stock.fields.currentPrice,
            timestamp: Date.now(),
        },
        relationIds: { portfolio: portfolioId, stock: stockId },
    });
    tx.updateNode("portfolio", portfolioId, (p) => {
        p.fields.cashBalance += type === "buy" ? -tradeValue : tradeValue;
        p.relationIds.trades.push(trade.id);
    });
    if (existingHolding) {
        tx.updateNode("holding", existingHolding.id, (h) => {
            if (type === "buy") {
                // Update average cost basis
                const oldTotalCost = h.fields.costBasis * h.fields.shares;
                const newTotalCost = oldTotalCost + tradeValue;
                h.fields.shares += shares;
                h.fields.costBasis = newTotalCost / h.fields.shares;
            }
            else {
                h.fields.shares -= shares;
            }
        });
    }
    else {
        const newHolding = tx.createNode("holding", {
            fields: { shares, costBasis: stock.fields.currentPrice },
            relationIds: { portfolio: portfolioId, stock: stockId },
        });
        tx.updateNode("portfolio", portfolioId, (p) => {
            p.relationIds.holdings.push(newHolding.id);
        });
    }
    if (log)
        console.log(`      - TRADE EXECUTED: ${type.toUpperCase()} ${shares} ${stock.fields.ticker} @ $${stock.fields.currentPrice.toFixed(2)}`);
}
/**
 * Simulates one month of market activity.
 */
function simulateMonth(tx, stockIds, currentMonth) {
    const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
    ];
    const year = Math.floor(currentMonth / 12) + 1;
    const month = monthNames[currentMonth % 12];
    console.log(`\n  --- Simulating ${month} Year ${year} ---`);
    // 1. Check for random market-wide events (once per year)
    let marketImpact = 1.0;
    if (currentMonth % 12 === 0 && Math.random() < MARKET_EVENT_CHANCE) {
        const eventType = faker.helpers.arrayElement([
            "Recession",
            "Correction",
            "Bull Market",
        ]);
        const impact = eventType === "Bull Market"
            ? faker.number.float({ min: 1.1, max: 1.25 })
            : faker.number.float({ min: 0.75, max: 0.9 });
        marketImpact = impact;
        console.log(`    ** MARKET EVENT: A ${eventType} begins! Market impact: ${((impact - 1) *
            100).toFixed(2)}% **`);
    }
    // 2. Market Fluctuation and Stock-Specific News
    for (const stockId of stockIds) {
        tx.updateNode("stock", stockId, (s) => {
            // Base volatility and trend
            const dailyDrift = s.fields.growthTrend / 30;
            const dailyVolatility = s.fields.volatility / Math.sqrt(252); // Annual volatility to daily
            let priceChangePercent = faker.number.float({
                min: dailyDrift - dailyVolatility,
                max: dailyDrift + dailyVolatility,
            });
            // Stock-specific news event
            if (Math.random() < STOCK_NEWS_CHANCE) {
                const newsType = faker.helpers.arrayElement([
                    "Positive Earnings",
                    "New Partnership",
                    "Regulatory Scrutiny",
                    "Product Flop",
                ]);
                const newsImpact = ["Positive Earnings", "New Partnership"].includes(newsType)
                    ? faker.number.float({ min: 0.05, max: 0.15 })
                    : faker.number.float({ min: -0.15, max: -0.05 });
                priceChangePercent += newsImpact;
                console.log(`    * NEWS: ${s.fields.ticker} - ${newsType}! Impact: ${(newsImpact * 100).toFixed(2)}%`);
            }
            s.fields.currentPrice *= (1 + priceChangePercent) * marketImpact;
            if (s.fields.currentPrice < 1)
                s.fields.currentPrice = 1; // Prevent stock from going to zero
        });
    }
}
/**
 * Performs end-of-year rebalancing based on the portfolio's risk profile.
 */
function rebalancePortfolio(tx, portfolioId, stockIds) {
    const portfolio = tx.getNode("portfolio", portfolioId);
    if (!portfolio)
        return;
    console.log(`\n    Rebalancing portfolio: "${portfolio.fields.name}" (${portfolio.fields.riskProfile})`);
    const totalValue = getPortfolioValue(tx, portfolioId);
    const stockMap = new Map(stockIds.map((id) => [id, tx.getNode("stock", id)]));
    const sortedStocks = [...stockMap.values()].sort((a, b) => a.fields.volatility - b.fields.volatility);
    const riskProfileTargets = {
        Conservative: [0.5, 0.3, 0.15, 0.05, 0.0], // 50% in least volatile, etc.
        Moderate: [0.2, 0.3, 0.3, 0.15, 0.05],
        Aggressive: [0.1, 0.1, 0.2, 0.3, 0.3],
    };
    const targets = riskProfileTargets[portfolio.fields.riskProfile];
    for (let i = 0; i < sortedStocks.length; i++) {
        const stock = sortedStocks[i];
        const stockId = stock?.id;
        const targetAllocation = targets?.[i];
        const holdingId = portfolio.relationIds.holdings.find((hId) => tx.getNode("holding", hId)?.relationIds.stock === stockId);
        const holding = holdingId ? tx.getNode("holding", holdingId) : null;
        const currentShares = holding ? holding.fields.shares : 0;
        const currentValue = currentShares * stock.fields.currentPrice;
        const valueDifference = totalValue * (targetAllocation ?? 0) - currentValue;
        const sharesToTrade = Math.floor(valueDifference / stock.fields.currentPrice);
        if (sharesToTrade > 0) {
            executeTrade(tx, portfolioId, stockId, "buy", sharesToTrade, false);
        }
        else if (sharesToTrade < 0) {
            executeTrade(tx, portfolioId, stockId, "sell", Math.abs(sharesToTrade), false);
        }
    }
    console.log(`    Rebalancing complete.`);
}
/**
 * Sells losing positions at the end of the year for tax purposes.
 */
function taxLossHarvesting(tx, portfolioId) {
    const portfolio = tx.getNode("portfolio", portfolioId);
    if (!portfolio)
        return;
    console.log(`\n    Performing tax-loss harvesting for "${portfolio.fields.name}"...`);
    let harvestedValue = 0;
    for (const holdingId of portfolio.relationIds.holdings) {
        const holding = tx.getNode("holding", holdingId);
        const stock = tx.getNode("stock", holding.relationIds.stock);
        const unrealizedGain = (stock.fields.currentPrice - holding.fields.costBasis) *
            holding.fields.shares;
        if (unrealizedGain < 0) {
            // It's a losing position
            const sharesToSell = holding.fields.shares;
            harvestedValue += sharesToSell * stock.fields.currentPrice;
            console.log(`      - Selling ${sharesToSell.toFixed(2)} shares of ${stock.fields.ticker} to harvest loss of $${(-unrealizedGain).toFixed(2)}`);
            executeTrade(tx, portfolioId, stock.id, "sell", sharesToSell, false);
        }
    }
    if (harvestedValue > 0) {
        // Re-invest the cash into a non-losing asset to maintain market exposure
        const portfolioAfterSell = tx.getNode("portfolio", portfolioId);
        const safeStock = [...portfolioAfterSell.relationIds.holdings]
            .map((hId) => tx.getNode("holding", hId))
            .sort((a, b) => {
            const stockA = tx.getNode("stock", a.relationIds.stock);
            return (stockA.fields.volatility -
                tx.getNode("stock", b.relationIds.stock).fields.volatility);
        })[0];
        if (safeStock) {
            const safeStockNode = tx.getNode("stock", safeStock.relationIds.stock);
            const sharesToBuy = Math.floor(harvestedValue / safeStockNode.fields.currentPrice);
            console.log(`      - Reinvesting harvested cash into ${sharesToBuy} shares of ${safeStockNode.fields.ticker}.`);
            executeTrade(tx, portfolioId, safeStock.relationIds.stock, "buy", sharesToBuy, false);
        }
    }
    console.log("    Tax-loss harvesting complete.");
}
// ============================================
//  Reporting & Main Execution
// ============================================
function getPortfolioValue(tx, portfolioId) {
    const portfolio = tx.getNode("portfolio", portfolioId);
    if (!portfolio)
        return 0;
    let holdingsValue = 0;
    for (const holdingId of portfolio.relationIds.holdings) {
        const holding = tx.getNode("holding", holdingId);
        const stock = tx.getNode("stock", holding.relationIds.stock);
        if (holding && stock) {
            holdingsValue += holding.fields.shares * stock.fields.currentPrice;
        }
    }
    return portfolio.fields.cashBalance + holdingsValue;
}
function printFinalReport(tx, portfolioIds, initialTotalInvestment) {
    console.log("\n\n\n===========================================");
    console.log("   FINAL FINANCIAL REPORT");
    console.log(`   Simulation Period: ${SIMULATION_YEARS} Years`);
    console.log("===========================================");
    let grandTotalValue = 0;
    let grandTotalInvested = 0;
    for (const portfolioId of portfolioIds) {
        const portfolio = tx.getNode("portfolio", portfolioId);
        if (!portfolio)
            continue;
        const finalValue = getPortfolioValue(tx, portfolioId);
        grandTotalValue += finalValue;
        grandTotalInvested += portfolio.fields.totalInvested;
        const totalReturn = finalValue - portfolio.fields.totalInvested;
        const returnOnInvestment = (totalReturn / portfolio.fields.totalInvested) * 100;
        console.log(`\n--- Portfolio: "${portfolio.fields.name}" (${portfolio.fields.riskProfile}) ---`);
        console.log(`  - Final Value:         $${finalValue.toFixed(2)}`);
        console.log(`  - Total Invested:      $${portfolio.fields.totalInvested.toFixed(2)}`);
        console.log(`  - Net Return:          $${totalReturn.toFixed(2)} (${returnOnInvestment.toFixed(2)}%)`);
        console.log(`  - Final Cash Balance:  $${portfolio.fields.cashBalance.toFixed(2)}`);
        console.log("  - Final Holdings:");
        const holdings = portfolio.relationIds.holdings
            .map((hId) => tx.getNode("holding", hId))
            .filter((h) => h && h.fields.shares > 0.01)
            .sort((a, b) => {
            const valA = a.fields.shares *
                tx.getNode("stock", a.relationIds.stock).fields.currentPrice;
            const valB = b.fields.shares *
                tx.getNode("stock", b.relationIds.stock).fields.currentPrice;
            return valB - valA;
        });
        for (const holding of holdings) {
            const stock = tx.getNode("stock", holding.relationIds.stock);
            const value = holding.fields.shares * stock.fields.currentPrice;
            console.log(`    * ${stock.fields.ticker.padEnd(5)}: ${holding.fields.shares
                .toFixed(2)
                .padStart(7)} shares | Value: $${value
                .toFixed(2)
                .padStart(10)} | P/L: $${(value -
                holding.fields.costBasis * holding.fields.shares)
                .toFixed(2)
                .padStart(8)}`);
        }
    }
    const totalReturn = grandTotalValue - grandTotalInvested;
    const totalROI = (totalReturn / grandTotalInvested) * 100;
    console.log("\n===========================================");
    console.log(`GRAND TOTAL NET WORTH: $${grandTotalValue.toFixed(2)}`);
    console.log(`TOTAL INVESTED:        $${grandTotalInvested.toFixed(2)}`);
    console.log(`NET LIFETIME RETURN:   $${totalReturn.toFixed(2)} (${totalROI.toFixed(2)}%)`);
    console.log("===========================================");
}
function main() {
    // 1. Initial Setup
    const { portfolioIds, stockIds } = db.transactSync((tx) => {
        const stocks = [
            {
                ticker: "ZGDB",
                companyName: "ZetaGraphDB Inc.",
                price: 150.0,
                vol: 0.3,
                trend: 0.015,
            },
            {
                ticker: "FAKR",
                companyName: "Faker.js Industries",
                price: 75.5,
                vol: 0.2,
                trend: 0.01,
            },
            {
                ticker: "IMMR",
                companyName: "Immer Corp.",
                price: 42.3,
                vol: 0.4,
                trend: 0.005,
            },
            {
                ticker: "BLUI",
                companyName: "BlueSky Utilities",
                price: 88.0,
                vol: 0.1,
                trend: 0.008,
            },
            {
                ticker: "GOLD",
                companyName: "Solid Gold Mining",
                price: 200.0,
                vol: 0.15,
                trend: 0.003,
            },
        ];
        const stockIds = stocks
            .map((s) => tx.createNode("stock", {
            fields: {
                ticker: s.ticker,
                companyName: s.companyName,
                currentPrice: s.price,
                volatility: s.vol,
                growthTrend: s.trend,
            },
            relationIds: { holdings: [], trades: [] },
        }))
            .map((s) => s.id);
        const portfolioConfigs = [
            {
                name: "Aggressive Growth",
                profile: "Aggressive",
                initialCash: INITIAL_CASH * 0.5,
            },
            {
                name: "Moderate Blend",
                profile: "Moderate",
                initialCash: INITIAL_CASH * 0.3,
            },
            {
                name: "Conservative Income",
                profile: "Conservative",
                initialCash: INITIAL_CASH * 0.2,
            },
        ];
        const portfolioIds = portfolioConfigs
            .map((p) => tx.createNode("portfolio", {
            fields: {
                name: p.name,
                cashBalance: p.initialCash,
                riskProfile: p.profile,
                totalInvested: p.initialCash,
            },
            relationIds: { holdings: [], trades: [] },
        }))
            .map((p) => p.id);
        return { portfolioIds, stockIds };
    });
    console.log("✅ Initial portfolios and stocks created.");
    // Initial balancing
    db.transactSync((tx) => {
        for (const portfolioId of portfolioIds) {
            rebalancePortfolio(tx, portfolioId, stockIds);
        }
    });
    console.log("✅ Initial portfolio balancing complete.");
    // 2. Run the Multi-Year Simulation
    for (let month = 0; month < SIMULATION_YEARS * MONTHS_PER_YEAR; month++) {
        db.transactSync((tx) => {
            simulateMonth(tx, stockIds, month);
            // End of year activities
            if ((month + 1) % 12 === 0) {
                console.log(`\n    --- End of Year ${Math.floor(month / 12) + 1} Activities ---`);
                // Add annual investment
                for (const pId of portfolioIds) {
                    tx.updateNode("portfolio", pId, (p) => {
                        p.fields.cashBalance +=
                            (MONTHLY_INVESTMENT * 12) / portfolioIds.length;
                        p.fields.totalInvested +=
                            (MONTHLY_INVESTMENT * 12) / portfolioIds.length;
                    });
                }
                console.log("    - Annual investments added.");
                // Tax-loss harvesting and rebalancing
                for (const pId of portfolioIds) {
                    taxLossHarvesting(tx, pId);
                    rebalancePortfolio(tx, pId, stockIds);
                }
                console.log("    - Year-end portfolio maintenance complete.");
            }
        });
    }
    // 3. Print Final Report
    db.transactSync((tx) => printFinalReport(tx, portfolioIds, INITIAL_CASH + ANNUAL_INVESTMENT * SIMULATION_YEARS));
}
main();
