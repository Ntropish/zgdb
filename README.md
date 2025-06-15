# ZGDB: The Zero-Latency Graph Database

ZGDB is a new kind of database for a new kind of application. It's a schema-first, embeddable, transactional graph database for TypeScript/JavaScript that you generate from your Zod schemas. It lives inside your application's process, providing zero-latency data access and a developer experience that feels less like a database and more like a native data structure.

- **Schema First**: Use the power and safety of Zod to define your data graph's nodes and their relationships.

- **Type Safe**: The command-line tool generates a client perfectly tailored to your schema, providing end-to-end type safety.

- **Transactional**: Atomically create, update, and connect nodes within a transaction. Your data remains consistent, always.

- **Flexible & Fast**: Choose between high-performance synchronous or versatile asynchronous clients depending on your storage adapter and use case.

- **Embeddable**: ZGDB is not a separate server. It's a library that runs within your application, eliminating network latency and simplifying your stack.

## Install

```
npm install @zgdb/cli @zgdb/runtime
```

## How it Works

### 1. Define Schema

Create a schema file (e.g., schema.ts) to define your data model using Zod. Each key in the schema object represents a node type.

```ts
// ./src/portfolio/schema.ts
import { z } from "zod";

const schema = {
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
  stock: {
    fields: z.object({
      ticker: z.string().toUpperCase(),
      currentPrice: z.number(),
    }),
    relations: {
      holdings: ["many", "holding"],
    },
  },
  holding: {
    fields: z.object({
      shares: z.number(),
    }),
    relations: {
      portfolio: ["one", "portfolio"],
      stock: ["one", "stock"],
    },
  },
  trade: {
    fields: z.object({
      type: z.enum(["buy", "sell"]),
      shares: z.number(),
      pricePerShare: z.number(),
    }),
    relations: {
      portfolio: ["one", "portfolio"],
      stock: ["one", "stock"],
    },
  },
};

export default schema;
```

### 2. Build Client

Run the `zg` command in your terminal, pointing to your schema file.

```
zg build --config ./src/portfolio/schema.ts --output ./src/portfolio/dist/graph
```

This generates a fully-typed client in `./src/generated/graph`.

### 3. Use Your Database

Import the generated client factory and a store adapter. Create a client instance and begin interacting with your data within transactions.

#### Synchronous Example

Ideal for in-memory operations and high-performance simulations where every microsecond counts.

```ts
import { createSyncClient } from "./portfolio/dist/graph";
import { MapStoreAdapterSync } from "../map-store-adapter-sync";

// `createSyncClient` is a synchronous operation
const db = createSyncClient(new MapStoreAdapterSync());

// Use the `transactSync` method for atomic writes
const { portfolioId, stockId } = db.transactSync((tx) => {
  const stock = tx.createNode("stock", {
    fields: { ticker: "ZGDB", currentPrice: 150.0 },
    relationIds: { holdings: [] },
  });

  const portfolio = tx.createNode("portfolio", {
    fields: { name: "My First Portfolio", cashBalance: 10000 },
    relationIds: { holdings: [], trades: [] },
  });

  return { portfolioId: portfolio.id, stockId: stock.id };
});

// Execute a trade
db.transactSync((tx) => {
  const portfolio = tx.getNode("portfolio", portfolioId);
  if (!portfolio) return;

  // Create a holding to link the portfolio and stock
  const holding = tx.createNode("holding", {
    fields: { shares: 10 },
    relationIds: { portfolio: portfolio.id, stock: stockId },
  });

  // Update the portfolio with the new holding
  tx.updateNode("portfolio", portfolio.id, (p) => {
    p.relationIds.holdings.push(holding.id);
    p.fields.cashBalance -= 10 * 150.0;
  });
});
```

#### Asynchronous Example

Perfect for when your data is stored externally (e.g., in a file or a remote key-value store) and requires asynchronous I/O.

```ts
import { createClient } from "./portfolio/dist/graph";
import { MapStoreAdapter } from "../map-store-adapter"; // An async adapter

const db = createClient(new MapStoreAdapter());

async function main() {
  // Use the `transact` method for atomic async writes
  const { portfolioId } = await db.transact(async (tx) => {
    const portfolio = await tx.createNode("portfolio", {
      fields: { name: "My Async Portfolio", cashBalance: 25000 },
      relationIds: { holdings: [], trades: [] },
    });
    return { portfolioId: portfolio.id };
  });

  // Read data within a transaction
  const myPortfolio = await db.transact((tx) =>
    tx.getNode("portfolio", portfolioId)
  );

  console.log(myPortfolio?.fields.name); // -> "My Async Portfolio"
}

main();
```

## Why zg?

Modern applications, especially collaborative and creative tools, require instant interaction with complex, interconnected data. Traditional databases, with their asynchronous APIs and network overhead, force developers to build complex state management layers.

`zgdb` solves this by bringing a powerful, transactional graph database into your application's runtime. This provides a synchronous, native-like developer experience that simplifies your code, eliminates entire categories of state management bugs, and unlocks a new level of performance for interactive applications.

### Status

ZGDB is a rapidly evolving project. The core API is stabilizing, and it is a fantastic tool for exploring the future of application data architecture. It is suitable for prototyping, internal tools, and applications where its performance and developer experience benefits shine.
