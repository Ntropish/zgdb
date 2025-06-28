# ZG: A Schema-Driven Graph Database

ZG is a next-generation graph database designed for modern, decentralized applications. It empowers developers to build real-time, collaborative, and offline-first applications with the safety and productivity of a strongly-typed, schema-driven workflow.

At its core, ZG provides a seamless developer experience by generating a fully-typed, synchronous client API from a simple schema definition. This abstracts away the complexities of high-performance serialization, storage, and data synchronization.

See our detailed [**MISSION.md**](./MISSION.md) for a deeper dive into the philosophy and architecture of the project.

## Core Concepts

- **Schema-First Development:** Define your data models, relationships, and business logic in plain TypeScript using the `createSchema` factory. This is the single source of truth for your database.
- **Zero-Effort Code Generation:** Run the build command, and ZG automatically generates a high-performance Flatbuffers schema and a fully-typed TypeScript client tailored to your schema.
- **Synchronous API:** The generated client provides a fully synchronous API for both reads (`db.Post.find(...)`) and writes (`db.Post.create(...)`). It feels like interacting with a simple in-memory object graph, keeping your UI and business logic clean and free of `async/await`.
- **High-Performance Backend:** Under the hood, ZG uses Flatbuffers for efficient, zero-copy serialization and Deserialization, ensuring minimal latency.

## Getting Started

Follow these steps to get a local example of ZG up and running.

### 1. Prerequisites

You will need the following software installed on your machine:

- [Node.js](https://nodejs.org/) (v18 or higher)
- [pnpm](https://pnpm.io/installation)
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

**From Source (if a package is not available):**
If your OS doesn't have a pre-built package, you can build it from source. This requires `git` and `cmake`.

```sh
# 1. Clone the official repository
git clone https://github.com/google/flatbuffers.git
cd flatbuffers

# 2. Build using CMake
cmake -G "Unix Makefiles"
make

# 3. Install the compiler system-wide
sudo make install

# 4. Verify the installation
flatc --version
```

</details>

### 2. Installation & Setup

Clone the repository and install the dependencies using pnpm.

```sh
# Clone your repository
git clone https://github.com/your-org/tk.git # <-- Replace with your repo URL
cd tk

# Install all monorepo dependencies
pnpm install
```

### 3. Define a Schema

The schema is the heart of your project. You define entities, fields, and relationships in TypeScript. You can see a complete example in `packages/zg-playground/src/schema/index.ts`.

Here is a simplified example:

```typescript
// src/schema/index.ts
import { createSchema, f } from "@tsmk/zg";

export default createSchema({
  entities: {
    User: {
      fields: {
        name: f.string(),
        email: f.string().optional(),
      },
      relations: {
        posts: f.relation("many", "Post"),
      },
    },
    Post: {
      fields: {
        title: f.string(),
        content: f.string(),
        publishedAt: f.datetime().optional(),
      },
      relations: {
        author: f.relation("one", "User"),
      },
    },
  },
});
```

### 4. Build the Database Client

Run the build command from the root of the project. This will parse your schema and generate the database client.

```sh
pnpm build
```

This command triggers a process that finds your schema, validates it, and generates all the necessary files (including Flatbuffers schemas and the TypeScript client) into the `zg/` directory within the corresponding package (e.g., `packages/zg-playground/zg/`).

### 5. Use the Generated Client

You can now import and use the generated client in your application. The client provides a fully-typed, synchronous API for all database operations.

```typescript
import { createZgClient } from "../zg"; // <-- Import from the generated directory
import { ZgDatabase } from "@tsmk/client";

// The generated createZgClient gives you a typed version of the DB
const db: ZgDatabase = createZgClient({});

// Create a user - this call is synchronous!
const user = db.User.create({
  name: "Alice",
  email: "alice@example.com",
});

// Create a related post
const post = db.Post.create({
  title: "My First Post",
  content: "Hello, world!",
  author: user, // Link the relationship directly
});

// Find a record by its ID
const foundUser = db.User.find(user.id);
console.log(foundUser.name); // 'Alice'

// Access relations synchronously
const postAuthor = post.author();
console.log(postAuthor.name); // 'Alice'

const userPosts = user.posts(); // Returns an array of Post proxies
console.log(userPosts[0].title); // 'My First Post'
```

## API Reference

### `createSchema(config)`

This is the main factory function for defining your database schema.

- `config.entities`: An object where each key is an entity name and the value is an `EntityDef` object.
- `config.globalResolvers`: An object defining functions that can be used as computed properties across all entities (e.g., a `createdAt` timestamp from the entity's ID).

### The `EntityDef` Object

- `fields`: An object defining the data fields for the entity (e.g., `name: f.string()`).
- `relations`: An object defining relationships to other entities (e.g., `author: f.relation('one', 'User')`).
- `indexes`: An array of fields or field combinations to create database indexes on for faster lookups.
- `auth`: An object defining authorization rules for who can create, read, update, or delete entities.

### Generated `db` Client

The `db` object is the main interface to your database.

- `db.Entity.create(data)`: Creates a new entity. Returns a synchronous proxy to the new record.
- `db.Entity.find(id)`: Finds an entity by its primary key. Returns a synchronous proxy or `undefined`.
- `entity.relationName()`: Accesses a related entity (or an array of entities for 'many' relations). This is also a synchronous call.

## Monorepo Overview

This project is a monorepo managed by pnpm and Turbo. The key packages are:

- `packages/zg`: The core schema parser and code generator pipeline.
- `packages/client`: The core (non-generated) runtime client that handles caching and persistence.
- `packages/fbs-builder`: A helper library for programmatically building Flatbuffer schemas.
- `packages/prolly-tree`: The underlying storage engine, a Probabilistic B-Tree.
- `packages/zg-playground`: An example package that demonstrates how to define a schema and use the generated client.
