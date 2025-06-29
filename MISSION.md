# Mission: A Zero-Copy, Synchronous-First Database Toolkit

Our mission is to provide an unparalleled developer experience for building high-performance, local-first applications. We achieve this with a database toolkit that is **zero-copy, synchronous-first, and FlatBuffer-native**.

The core philosophy is simple: **reads should be instantaneous, and writes should be non-blocking**.

We treat the database as a set of in-memory data structures that can be accessed synchronously, without the overhead of `async/await`. This is made possible by leveraging Google's FlatBuffers for zero-copy reads and a cache-first Prolly Tree for storage.

## Core Principles

1.  **Synchronous by Default**: All database reads, including relationship traversals (`post.author`), are fully synchronous. The only exception is for operations that must verify persistence to the underlying storage, which will be exposed via a special `getAsync`-style API.

2.  **Fire-and-Forget Writes**: All database writes (`create`, `update`) return synchronously to the caller by updating an in-memory cache. The actual persistence to the underlying Prolly Tree happens asynchronously in the background, providing a fast and responsive developer experience without blocking the main thread.

3.  **Schema-First Development**: Define your entities, fields, and relationships in simple, declarative TypeScript files. The ZG toolkit handles the rest.

4.  **End-to-End Type Safety**: The code generator consumes your schema and produces a fully type-safe client. This includes not only your entity fields but also your relationships and custom-defined resolvers. If it compiles, it works.

## How It Works

The toolkit is a collection of focused packages that work in concert:

- **`@zgdb/generate`**: The heart of the toolkit. It parses your entity definitions and generates everything you need:

  - The low-level FlatBuffers schema (`.fbs`).
  - The TypeScript bindings for that schema.
  - A high-level, type-safe `createDB` factory function.

- **`@zgdb/client`**: The runtime library that the generated code depends on. It provides the `ZgDatabase` class which manages the underlying storage and resolver logic.

- **`@zgdb/prolly-tree`**: A Prolly Tree implementation adapted for our synchronous-first approach. It features an in-memory block cache that makes synchronous reads possible.

- **`@zgdb/vite-plugin`**: For a seamless development experience, this plugin watches your schema files and automatically triggers the generator on any change, providing instantaneous updates and hot-reloading in your application.

The end result is an application development experience that feels more like manipulating in-memory objects than querying a database, but with all the power and persistence you expect.
