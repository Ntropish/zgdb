# zg

Define your data graph with Zod. Use it like a native JavaScript object. That's it.

zg is a new kind of database for a new kind of application. It's an in-memory, synchronous graph database client that you generate from your Zod schemas. It feels less like a database and more like a native data structure.

- Schema First: Use the power and safety of Zod to define your nodes and edges.

- Zero Latency: Read, write, and traverse the graph synchronously. No async/await, no promises, no ORMs.

- Fully Typed: The build process generates a client that is perfectly tailored to your schema.

## How it Works

Stop waiting for your data. Start using it.

### 1. Define Schema

Create a graph.config.ts file to define your data model.

```ts
// graph.config.ts
import { z } from "zod";

const userNode = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

const postNode = z.object({
  id: z.string().uuid(),
  title: z.string(),
});

const graphConfig = {
  schema: {
    nodes: {
      user: userNode,
      post: postNode,
    },
    edges: [
      {
        source: "user",
        target: "post",
        cardinality: "one-to-many",
        name: {
          forward: "posts", // user.posts -> Post[]
          backward: "author", // post.author -> User
        },
      },
    ],
  },
};

export default graphConfig;
```

### 2. Build Client

Run the zg command in your terminal.

```
npx zg build
```

This generates a fully-typed client in `./src/generated/graph`.

### 3. Use Synchronously

Import the generated client and interact with your data immediately.

```ts
import { createClient } from "./generated/graph";
import type { User, Post } from "./generated/graph";
import { v4 as uuid } from "uuid";

// `createClient` is a synchronous operation
const zg = createClient();

// --- Write Data ---
const alice: User = zg.user.add({
  id: uuid(),
  name: "Alice",
});

const post: Post = zg.post.add({
  id: uuid(),
  title: "Hello, World!",
  author: alice, // Link nodes by passing the object directly
});

// --- Read & Traverse Data ---
// No `await`. The data is just there.

const retrievedPost = zg.post.get(post.id);

if (retrievedPost) {
  // Traverse the graph with simple property access
  console.log(retrievedPost.author.name); //-> "Alice"
}

// The relationship is automatically available on the other side
console.log(alice.posts[0].title); //-> "Hello, World!"
```

## Why zg?

Modern applications, especially collaborative and creative tools, require instant interaction with complex, interconnected data. Traditional databases, with their asynchronous APIs, force developers to build complex state management layers.

`zg` solves this by bringing the database into your application's runtime, providing a synchronous, native-like experience that simplifies your code and unlocks a new level of performance for interactive UIs.

### Status

zg is currently an experimental proof-of-concept. It's a great way to explore the future of application data architecture.
