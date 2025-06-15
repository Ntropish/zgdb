import { faker } from "@faker-js/faker";
import {
  createSyncClient,
  TransactionClientSync,
  NodeDataTypeMap,
} from "./dist/graph/zgdb-client.js";
import { MapStoreAdapterSync } from "../map-store-adapter-sync.js";

const db = createSyncClient(new MapStoreAdapterSync());
type TxClient = TransactionClientSync<NodeDataTypeMap>;

// Function to execute a trade within a synchronous transaction
function executeTrade(
  tx: TxClient,
  portfolioId: string,
  stockId: string,
  type: "buy" | "sell",
  shares: number
) {
  const stock = tx.getNode("stock", stockId);
  if (!stock) throw new Error("Stock not found.");

  const portfolio = tx.getNode("portfolio", portfolioId);
  if (!portfolio) throw new Error("Portfolio not found.");

  const tradeValue = shares * stock.fields.currentPrice;

  if (type === "buy" && portfolio.fields.cashBalance < tradeValue) {
    console.log(
      `  - Trade Canceled: Insufficient funds to buy ${shares} of ${stock.fields.ticker}`
    );
    return; // Not enough cash, cancel trade
  }

  // Find existing holding or prepare to create one
  const holdingId: string | undefined = portfolio.relationIds.holdings.find(
    (hId) => tx.getNode("holding", hId)?.relationIds.stock === stockId
  );
  const existingHolding = holdingId ? tx.getNode("holding", holdingId) : null;

  if (
    type === "sell" &&
    (!existingHolding || existingHolding.fields.shares < shares)
  ) {
    console.log(
      `  - Trade Canceled: Not enough shares to sell ${shares} of ${stock.fields.ticker}`
    );
    return; // Not enough shares, cancel trade
  }

  // Record the trade
  const trade = tx.createNode("trade", {
    fields: {
      type,
      shares,
      pricePerShare: stock.fields.currentPrice,
      timestamp: Date.now(),
    },
    relationIds: { portfolio: portfolioId, stock: stockId },
  });

  // Update portfolio and holding
  tx.updateNode("portfolio", portfolioId, (p) => {
    p.fields.cashBalance += type === "buy" ? -tradeValue : tradeValue;
    p.relationIds.trades.push(trade.id);
  });

  if (existingHolding) {
    tx.updateNode("holding", existingHolding.id, (h) => {
      h.fields.shares += type === "buy" ? shares : -shares;
    });
  } else {
    const newHolding = tx.createNode("holding", {
      fields: { shares },
      relationIds: { portfolio: portfolioId, stock: stockId },
    });
    tx.updateNode("portfolio", portfolioId, (p) => {
      p.relationIds.holdings.push(newHolding.id);
    });
  }

  console.log(
    `  - Trade Executed: ${type.toUpperCase()} ${shares} ${
      stock.fields.ticker
    } @ $${stock.fields.currentPrice.toFixed(2)}`
  );
}

// Function to print a summary of the portfolio's state
function printPortfolioSummary(tx: TxClient, portfolioId: string) {
  const portfolio = tx.getNode("portfolio", portfolioId);
  if (!portfolio) return;

  let totalValue = portfolio.fields.cashBalance;
  console.log(`\n--- Portfolio Summary for "${portfolio.fields.name}" ---`);
  console.log(`Cash Balance: $${portfolio.fields.cashBalance.toFixed(2)}`);
  console.log("Holdings:");

  for (const holdingId of portfolio.relationIds.holdings) {
    const holding = tx.getNode("holding", holdingId);
    const stock = tx.getNode("stock", holding!.relationIds.stock);
    if (holding && stock && holding.fields.shares > 0) {
      const holdingValue = holding.fields.shares * stock.fields.currentPrice;
      totalValue += holdingValue;
      console.log(
        `  - ${stock.fields.ticker}: ${
          holding.fields.shares
        } shares @ $${stock.fields.currentPrice.toFixed(
          2
        )} = $${holdingValue.toFixed(2)}`
      );
    }
  }
  console.log(`-------------------------------------------`);
  console.log(`Total Portfolio Value: $${totalValue.toFixed(2)}`);
  console.log(`-------------------------------------------\n`);
}

function main() {
  // Setup: Create stocks and a portfolio
  const { portfolioId, stockIds } = db.transactSync((tx) => {
    const stocks = [
      { ticker: "ZGDB", companyName: "ZetaGraphDB Inc.", price: 150.0 },
      { ticker: "FAKR", companyName: "Faker.js Industries", price: 75.5 },
      { ticker: "IMMR", companyName: "Immer Corp.", price: 42.3 },
    ];
    const stockIds = stocks
      .map((s) =>
        tx.createNode("stock", {
          fields: {
            ticker: s.ticker,
            companyName: s.companyName,
            currentPrice: s.price,
          },
          relationIds: { holdings: [], trades: [] },
        })
      )
      .map((s) => s.id);

    const portfolio = tx.createNode("portfolio", {
      fields: { name: "My Tech Portfolio", cashBalance: 10000 },
      relationIds: { holdings: [], trades: [] },
    });

    return { portfolioId: portfolio.id, stockIds };
  });

  console.log("✅ Initial portfolio and stocks created.");
  db.transactSync((tx) => printPortfolioSummary(tx, portfolioId));

  // Simulate 5 days of market activity and trading
  for (let day = 1; day <= 5; day++) {
    console.log(`--- Day ${day} Trading ---`);
    db.transactSync((tx) => {
      // Market fluctuates
      for (const stockId of stockIds) {
        tx.updateNode("stock", stockId, (s) => {
          const changePercent = faker.number.float({ min: -0.05, max: 0.05 }); // -5% to +5%
          s.fields.currentPrice *= 1 + changePercent;
        });
      }

      // Make some trading decisions
      const randomStockId = faker.helpers.arrayElement(stockIds);
      const tradeType = faker.helpers.arrayElement<"buy" | "sell">([
        "buy",
        "sell",
      ]);
      const shares = faker.number.int({ min: 1, max: 10 });

      executeTrade(tx, portfolioId, randomStockId, tradeType, shares);
    });
    db.transactSync((tx) => printPortfolioSummary(tx, portfolioId));
  }
}

main();
