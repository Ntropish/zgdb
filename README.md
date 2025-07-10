# ZG: A Schema-Driven Synchronous Database Toolkit

ZG is a next-generation database toolkit designed for modern, decentralized applications. It empowers developers to build real-time, collaborative, and offline-first applications with the safety and productivity of a strongly-typed, schema-driven workflow.

At its core, ZG provides a seamless developer experience by generating a fully-typed, synchronous client API from a simple schema definition. This abstracts away the complexities of high-performance serialization, storage, and data synchronization.

See our detailed [**MISSION.md**](./MISSION.md) for a deeper dive into the philosophy and architecture of the project.

## Core Concepts

- **Schema-First Development:** Define your data models, relationships, and business logic in plain TypeScript using `zod` and a simple `EntityDef` object. This is the single source of truth for your database.
- **Zero-Effort Code Generation:** Configure the Vite plugin so that ZG automatically generates a high-performance Flatbuffers schema and a fully-typed TypeScript client tailored to your schema.
- **Transactional & Synchronous API:** The API is designed to be safe and predictable. All database operations must be performed inside a transaction. Within that transaction, the API is fully synchronous and feels like interacting with simple in-memory objects:

  ```typescript
  await db.transaction(async (tx) => {
    const post = tx.posts.get("post-123");
    if (!post) return;

    // Reading a property is a zero-copy read
    console.log(post.title);

    // Assigning a property is a synchronous write
    post.title = "New Title";

    // Traversing a relationship is a synchronous property access
    const author = post.author;
  });
  ```

- **High-Performance Backend:** Under the hood, ZG uses Flatbuffers for efficient, zero-copy serialization and deserialization, ensuring minimal latency.

## Architecture

ZG is a monorepo containing a suite of packages that work together to provide a seamless schema-to-query experience. The data flows from your high-level definition down to the low-level storage engine.

```mermaid
graph TD;
    subgraph Developer Experience
        A["Schema Definition<br/>(User-written *.ts files using Zod)"] --> B["@zgdb/generate<br/>(Schema Parser &<br/>Code Generator)"];
    end

    subgraph "Generation & Build Time"
        B --> C["@zgdb/fbs-builder<br/>(Generates .fbs schema string)"];
        C --> D["flatc<br/>(FlatBuffers Compiler)"];
        D --> E["Generated FB Bindings<br/>(Low-level TS code)"];
        B --> F["Generated Client<br/>(High-level, typed TS code:<br/>createDB, collections, node proxies)"];
    end

    subgraph "Application Runtime"
        G["Your Application Code"] --> F;
        F --> H["@zgdb/client<br/>(ZgDatabase, Proxy Handler)"];
        H --> I["@zgdb/prolly-tree<br/>(Synchronous Storage Engine)"];
        F --> E;
    end

    style A fill:#f9f,stroke:#333,stroke-width:2px;
    style G fill:#f9f,stroke:#333,stroke-width:2px;
```

### Component Breakdown

- **Schema Definition:** You, the developer, define your entities in plain TypeScript files. You use the `zod` library to define the fields, which provides excellent validation and type inference.
- **`@zgdb/generate`:** This is the core engine of the toolkit. It finds and parses your schema files, validates the entity definitions, and orchestrates the entire code generation process.
- **`@zgdb/fbs-builder`:** A low-level helper library used by the generator to programmatically construct a FlatBuffers schema (`.fbs` file definition) from your TypeScript entity definitions.
- **`flatc`:** The official FlatBuffers compiler. The generator invokes this tool under the hood to compile the `.fbs` schema into low-level TypeScript code for serialization and deserialization.
- **Generated Client:** This is the primary output of the build process. It's a set of TypeScript files tailored to your schema, providing the high-level, type-safe API you'll use in your application (e.g., `createDB`, `db.posts`, etc.).
- **`@zgdb/client`:** The runtime engine. The generated client depends on this package. It contains the `ZgDatabase` class that manages the storage engine and powers the "live" proxy objects.
- **`@zgdb/prolly-tree`:** The underlying storage engine. It's a Probabilistic B-Tree (or Prolly Tree) with a fully synchronous API, chosen for its efficient, content-addressed structure.

## Getting Started

Follow these steps to get a local example of ZG up and running.

### 1. Prerequisites

You will need the following software installed on your machine:

- [Node.js](https://nodejs.org/) (v18 or higher)
- [pnpm](https://pnpm.io/installation)
- [Vite](https://vitejs.dev/) for the recommended build process.
- The **FlatBuffers Compiler (`flatc`)**. This is a critical dependency for generating the database serialization code.

<details>
<summary><b>➡️ How to install `flatc`</b></summary>
<br/>
The recommended way to install `flatc` is with a package manager for your OS.

**macOS (using Homebrew):**

```sh
brew install flatbuffers
```

**Debian/Ubuntu:**

```sh
sudo apt-get install flatbuffers-compiler
```

**Windows (using Winget):**

```sh
winget install Google.Flatbuffers
```

</details>

### 2. Installation & Setup

```sh
pnpm install @zgdb/client @zgdb/vite-plugin zod flatbuffers
```

### 3. Schema Definition In-Depth

The schema is the heart of your project. You define entities as an array of `EntityDef` objects. You can see a complete example in `packages/playground/src/schema/`.

An `EntityDef` object has the following structure:

- `name: string`: The singular, capitalized name of the entity (e.g., `"Post"`). This will be used to generate collection names (e.g., `db.posts`).
- `schema: ZodObject`: A `zod` object defining the data fields for the entity. **The `id` field is mandatory for all entities.**
- `relationships: object`: An optional object defining relationships to other entities.
- `indexes: array`: An optional array of index definitions for optimizing queries.

#### **Fields (`schema`)**

You use `zod` to define your fields. The generator supports the following `zod` types:

| Zod Schema         | FlatBuffers Type | Notes                               |
| ------------------ | ---------------- | ----------------------------------- |
| `z.string()`       | `string`         |                                     |
| `z.number().int()` | `int32`          | For 32-bit signed integers.         |
| `z.bigint()`       | `int64`          | For 64-bit signed integers.         |
| `z.number()`       | `float64`        | For double-precision floating nums. |
| `z.boolean()`      | `bool`           |                                     |
| `.optional()`      | -                | Makes the field optional.           |
| `.describe("...")` | -                | Adds a comment to the schema.       |

**Example:**

```typescript
import { z } from "zod";

const PostSchema = z.object({
  id: z.string().describe("The unique ID of the post."),
  title: z.string(),
  content: z.string().optional(),
  viewCount: z.number().int(),
  publishedAt: z.bigint(),
  isPublished: z.boolean(),
});
```

#### **Relationships**

Relationships define how your entities connect to each other.

- **`"one"` Relationships (Foreign Key):** This is the most common relationship type. It signifies that this entity holds a foreign key to another entity.

  - `entity`: The name of the entity being referenced.
  - `cardinality`: `"one"`.
  - `field`: The name of the field in this entity's `schema` that holds the foreign key (e.g., `authorId`).

- **`"many"` Relationships (Reverse Lookup):** This defines the other side of a `"one"` relationship. It signifies that another entity holds a foreign key pointing back to this one.
  - `entity`: The name of the entity on the other side of the relationship.
  - `cardinality`: `"many"`.
  - `mappedBy`: The name of the relationship on the _other_ entity.

**Example: A User has many Posts, a Post has one Author**

```typescript
// In UserDef
relationships: {
  posts: {
    entity: "Post",
    cardinality: "many",
    mappedBy: "author", // <-- Points to the 'author' relationship in PostDef
  },
},

// In PostDef
relationships: {
  author: {
    entity: "User",
    cardinality: "one",
    field: "authorId", // <-- The foreign key field in PostDef's schema
  },
},
```

### 4. Configure the Vite Plugin

The recommended way to build the database client is by using the official Vite plugin. This will automatically rebuild your client whenever your schema files change.

Add the plugin to your `vite.config.ts`:

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import { resolve } from "path";
import { zgdb } from "@zgdb/vite-plugin";

export default defineConfig({
  plugins: [
    zgdb({
      schema: resolve(__dirname, "src/schema/index.ts"), // Path to your schema entry file
      output: resolve(__dirname, "src/schema/__generated__"), // Path to the output directory
    }),
  ],
  // ... other vite config
});
```

With this in place, running `vite dev` will watch your schema for changes, and `vite build` will generate the client as part of your production build.

### 5. Generated Client API Reference

The build process generates a `schema.ts` file which exports all the necessary classes and types for your database. The main entry point for interacting with the database is the `ZgClient` class from `@zgdb/client`.

You typically create a helper function to instantiate the client:

```typescript
// in src/db.ts
import { ZgClient, ZgDbConfiguration } from "@zgdb/client";
import { DB } from "./schema/__generated__/schema.js";

export function createDB(config?: ZgDbConfiguration) {
  return new ZgClient(DB.Transaction, { config });
}

// in your application
const db = createDB();
```

The `db` object is the main interface to your database. All data operations are performed within a transaction.

#### **Transactions**

- `db.transaction(callback)`: Executes a transactional callback, providing access to entity collections. All changes are committed when the callback completes.
  ```typescript
  await db.transaction(async (tx) => {
    // ... do work with tx.posts, tx.users
  });
  ```

#### **Collection API (`tx.posts`)**

- `add(data)`: Creates a new entity. The `data` object must match the `Create<Entity>Input` type from the generated schema, including the `id`. Returns a "live" proxy to the new record.
  ```typescript
  const newUser = tx.users.add({
    id: "user-123",
    displayName: "Alice",
    // ... other fields
  });
  ```
- `get(id)`: Finds an entity by its primary key. Returns a "live" proxy or `null`.
  ```typescript
  const foundPost = tx.posts.get("post-abc");
  ```
- `[Symbol.iterator]()`: Collections are iterable, allowing you to scan all records.
  ```typescript
  for (const user of tx.users) {
    console.log(user.displayName);
  }
  ```

#### **Node Proxy API (within a transaction)**

When you `get` or `add` a record inside a transaction, you receive a "live" node proxy. All interactions with this proxy must happen within the same transaction.

This means you can read fields, update them, and access relationships synchronously, as shown in the example below:

```typescript
await db.transaction(async (tx) => {
  const post = tx.posts.get("post-abc");
  if (!post) return;

  // Reading fields
  console.log(post.title);

  // Updating fields
  post.title = "A New Title";

  // Accessing relationships
  const author = post.author; // Returns a User proxy or null
  if (author) {
    const posts = author.posts; // Returns an array of Post proxies
  }
});
```

### Advanced Concepts: Resolvers and Policies

Resolvers and policies are functions that enable computed properties and access control on your nodes. They are passed in a configuration object when creating the database client.

**Example: Adding an `excerpt` to Posts and a global `isOwner` check.**

```typescript
import { createDB } from "./db";

const db = createDB({
  resolvers: {
    // Global resolvers are available on all nodes
    global: {
      isOwner: (ctx: { actor: { id: string }; node: any }) => {
        // 'actor' is provided via db.with()
        return ctx.actor?.id === ctx.node.authorId;
      },
    },
    // Entity resolvers are specific to an entity type
    entities: {
      Post: {
        excerpt: (ctx: { node: { content: string } }) => {
          return ctx.node.content?.substring(0, 50) ?? "";
        },
      },
    },
  },
});

// All data access must be within a transaction.
// The second argument to `transaction` is the auth context.
await db.transaction(
  async (tx) => {
    const post = tx.posts.get("post-1");

    // Now you can access these as if they were real fields:
    if (post) {
      console.log(post.excerpt); // "A preview of the post..."
      console.log(post.isOwner); // true or false
    }
  },
  { actor: { id: "user-A" } }
);
```

## Monorepo Overview

This project is a monorepo managed by pnpm and Turbo. The key packages are:

- `packages/generate`: The home of the `@zgdb/generate` package, the core schema parser and code generator pipeline.
- `packages/client`: The core (non-generated) runtime client (`@zgdb/client`) that provides the `ZgDatabase` and manages the live object proxies.
- `packages/fbs-builder`: A helper library for programmatically building Flatbuffer schemas.
- `packages/prolly-tree`: The underlying storage engine, a Probabilistic B-Tree with a synchronous API.
- `packages/playground`: An example package that demonstrates how to define a schema and use the generated client.
